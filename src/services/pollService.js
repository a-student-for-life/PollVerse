import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  runTransaction,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  writeBatch,
  getDocs,
  where
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const POLLS_COL_NAME = 'polls';
const VOTES_COL_NAME = 'votes';

/**
 * Truly self-destruct a poll from Firebase.
 * Deletes the poll doc and all associated vote docs to clear space.
 */
export async function deletePoll(pollId) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  
  // 1. Find all associated votes
  const votesQuery = query(collection(db, VOTES_COL_NAME), where('pollId', '==', pollId));
  const votesSnap = await getDocs(votesQuery);
  
  // 2. Collect all refs to delete
  const allRefs = [pollRef, ...votesSnap.docs.map(d => d.ref)];
  
  // 3. Delete in batches of 500 (Firestore limit)
  for (let i = 0; i < allRefs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = allRefs.slice(i, i + 500);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

/** 
 * Create a new poll. 
 * Returns the created poll ID.
 */
export async function createPoll(title, optionsList, mode = 'social', correctOptionIndex = null, participationMode = 'open', selfDestructMinutes = null, revealMinutes = null) {
  const userId = await getOrSignInUser();

  const options = optionsList.map((text, idx) => ({
    id: `opt_${Date.now()}_${idx}`,
    text,
    voteCount: 0,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#64748b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#f97316', '#06b6d4'][idx % 10]
  }));

  // Resolve correct option's id from the submitted index (null if not set)
  const correctOptionId = (correctOptionIndex !== null && options[correctOptionIndex])
    ? options[correctOptionIndex].id
    : null;

  const pollData = {
    title,
    creatorId: userId,
    mode: mode === 'professional' ? 'professional' : 'social',
    participationMode: participationMode === 'structured' ? 'structured' : 'open',
    correctOptionId,
    createdAt: serverTimestamp(),
    selfDestruct: !!selfDestructMinutes,
    expiresAt: selfDestructMinutes ? Date.now() + selfDestructMinutes * 60 * 1000 : null,
    isCorrectAnswerRevealed: revealMinutes === null, // Only revealed immediately if no delay set
    revealAt: (revealMinutes && revealMinutes !== 'manual') ? Date.now() + revealMinutes * 60 * 1000 : null,
    totalVotes: 0,
    trendingScore: 0,
    options,
    recentReasons: [],
    aiSummary: null,
    lastAIGeneratedAt: null
  };

  const docRef = await addDoc(collection(db, POLLS_COL_NAME), pollData);
  return docRef.id;
}

/**
 * Ensures user is authenticated anonymously and returns UID.
 */
export async function getOrSignInUser() {
  if (auth.currentUser) return auth.currentUser.uid;
  const userCred = await signInAnonymously(auth);
  return userCred.user.uid;
}

/**
 * Submit a vote within a transaction
 */
export async function voteOnPoll(pollId, optionId, reasonText = '') {
  const userId = await getOrSignInUser();
  const voteDocId = `${pollId}_${userId}`;
  
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  const voteRef = doc(db, VOTES_COL_NAME, voteDocId);

  await runTransaction(db, async (transaction) => {
    // 1. Check if user already voted
    const voteDoc = await transaction.get(voteRef);
    if (voteDoc.exists()) {
      throw new Error('You have already voted on this poll.');
    }

    // 2. Read Poll
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) {
      throw new Error('Poll does not exist.');
    }
    const pollData = pollDoc.data();

    // 3. Update Options
    const newOptions = pollData.options.map(o => 
      o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o
    );

    // 4. Trending Score Decay (Hacker News style)
    const createdAtMs = pollData.createdAt ? pollData.createdAt.toMillis() : Date.now();
    const hoursSinceCreation = Math.max(0.1, (Date.now() - createdAtMs) / (1000 * 60 * 60));
    const newTotalVotes = pollData.totalVotes + 1;
    const trendingScore = newTotalVotes / Math.pow(hoursSinceCreation + 2, 1.5);

    // 5. Update Recent Reasons List (FIFO buffer, strictly max 5)
    let newReasons = [...(pollData.recentReasons || [])];
    if (reasonText && reasonText.trim().length > 0) {
      const sanitizedReason = reasonText.trim().substring(0, 200);
      const isDuplicate = newReasons.some(r => r.text.toLowerCase() === sanitizedReason.toLowerCase());
      
      if (!isDuplicate) {
        newReasons.unshift({
          text: sanitizedReason,
          optionId,
          timestamp: Date.now()
        });
        if (newReasons.length > 5) {
          newReasons.pop();
        }
      }
    }

    // 6. Write Vote Doc
    transaction.set(voteRef, {
      pollId,
      userId,
      optionId,
      reason: reasonText || null,
      timestamp: serverTimestamp()
    });

    // 7. Update Poll Doc
    transaction.update(pollRef, {
      options: newOptions,
      totalVotes: newTotalVotes,
      trendingScore,
      recentReasons: newReasons
    });
  });
}

export async function saveAiSummary(pollId, summary, votesAtGeneration = 0) {
   const pollRef = doc(db, POLLS_COL_NAME, pollId);
   await runTransaction(db, async (transaction) => {
     const docSnap = await transaction.get(pollRef);
     if (docSnap.exists()) {
        transaction.update(pollRef, {
          aiSummary: summary,
          lastAIGeneratedAt: serverTimestamp(),
          aiGeneratedAtVotes: votesAtGeneration,
        });
     }
   });
}

export function subscribeToTrendingPolls(limitCount, callback) {
  const q = query(collection(db, POLLS_COL_NAME), orderBy('trendingScore', 'desc'), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const polls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(polls);
  });
}

export function subscribeToPoll(pollId, callback) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  return onSnapshot(pollRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
}

export async function getUserVote(pollId) {
  const userId = await getOrSignInUser();
  const voteDocId = `${pollId}_${userId}`;
  const voteRef = doc(db, VOTES_COL_NAME, voteDocId);
  const voteDoc = await getDoc(voteRef);
  return voteDoc.exists() ? voteDoc.data() : null;
}

export async function hasUserVoted(pollId) {
  const vote = await getUserVote(pollId);
  return !!vote;
}

export async function revealCorrectAnswer(pollId) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  await updateDoc(pollRef, { isCorrectAnswerRevealed: true });
}

/**
 * Increment a reaction counter on a specific reason inside recentReasons.
 * Uses a transaction to safely read-modify-write the array.
 * @param {string} pollId
 * @param {number} reasonIndex  - index of reason in recentReasons array
 * @param {string} reactionKey  - 'type1' | 'type2' | 'type3'
 */
export async function addReaction(pollId, reasonIndex, reactionKey) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  await runTransaction(db, async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) return;

    const reasons = [...(pollDoc.data().recentReasons || [])];
    if (reasonIndex < 0 || reasonIndex >= reasons.length) return;

    const reason = { ...reasons[reasonIndex] };
    const reactions = { ...(reason.reactions || {}) };
    reactions[reactionKey] = (reactions[reactionKey] || 0) + 1;
    reason.reactions = reactions;
    reasons[reasonIndex] = reason;

    transaction.update(pollRef, { recentReasons: reasons });
  });
}

export async function removeReaction(pollId, reasonIndex, reactionKey) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  await runTransaction(db, async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) return;

    const reasons = [...(pollDoc.data().recentReasons || [])];
    if (reasonIndex < 0 || reasonIndex >= reasons.length) return;

    const reason = { ...reasons[reasonIndex] };
    const reactions = { ...(reason.reactions || {}) };
    if (reactions[reactionKey] > 0) {
      reactions[reactionKey] -= 1;
    }
    reason.reactions = reactions;
    reasons[reasonIndex] = reason;

    transaction.update(pollRef, { recentReasons: reasons });
  });
}

/**
 * Add a short idea to the poll's ideaCloud array.
 * Enforces: max 8 items, no duplicates, text ≤ 40 chars.
 * Evicts oldest item when at capacity.
 */
export async function addIdeaToCloud(pollId, rawText) {
  const text = rawText.trim().substring(0, 40);
  if (!text) return;

  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  await runTransaction(db, async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) return;

    const ideas = [...(pollDoc.data().ideaCloud || [])];

    // Duplicate guard (case-insensitive)
    if (ideas.some(i => i.text.toLowerCase() === text.toLowerCase())) return;

    // Evict oldest when at capacity
    const MAX = 8;
    while (ideas.length >= MAX) {
      const oldestIdx = ideas.reduce(
        (minIdx, idea, idx, arr) => idea.createdAt < arr[minIdx].createdAt ? idx : minIdx, 0
      );
      ideas.splice(oldestIdx, 1);
    }

    ideas.push({
      id:        `idea_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      weight:    1,
      createdAt: Date.now(),
    });

    transaction.update(pollRef, { ideaCloud: ideas });
  });
}

/**
 * Increment the weight of a specific idea by 1.
 */
export async function agreeWithIdea(pollId, ideaId) {
  const pollRef = doc(db, POLLS_COL_NAME, pollId);
  await runTransaction(db, async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) return;

    const ideas = [...(pollDoc.data().ideaCloud || [])];
    const idx   = ideas.findIndex(i => i.id === ideaId);
    if (idx === -1) return;

    ideas[idx] = { ...ideas[idx], weight: ideas[idx].weight + 1 };
    transaction.update(pollRef, { ideaCloud: ideas });
  });
}


