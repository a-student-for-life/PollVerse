// ─── Poll History Utility (localStorage only, zero backend) ────────────────
// Stores two separate lists:
//   recentPolls  – auto-logged on every poll visit, max 8, FIFO
//   savedPolls   – manually bookmarked by user, max 20

const RECENT_KEY = 'pv_recentPolls';
const SAVED_KEY  = 'pv_savedPolls';
const MAX_RECENT = 8;
const MAX_SAVED  = 20;

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — silently skip
  }
}

// ── Recent Polls ─────────────────────────────────────────────────────────────

/**
 * Call this when a user navigates to a poll page.
 * @param {{ id, title, mode, totalVotes }} poll
 */
export function trackRecentPoll(poll) {
  const list = readJSON(RECENT_KEY).filter(p => p.id !== poll.id);
  list.unshift({
    id:           poll.id,
    title:        poll.title || 'Untitled Poll',
    mode:         poll.mode || 'social',
    totalVotes:   poll.totalVotes || 0,
    lastViewedAt: Date.now(),
  });
  writeJSON(RECENT_KEY, list.slice(0, MAX_RECENT));
}

export function getRecentPolls() {
  return readJSON(RECENT_KEY);
}

export function clearRecentPolls() {
  writeJSON(RECENT_KEY, []);
}

// ── Saved / Bookmarked Polls ─────────────────────────────────────────────────

export function getSavedPolls() {
  return readJSON(SAVED_KEY);
}

export function isPollSaved(pollId) {
  return readJSON(SAVED_KEY).some(p => p.id === pollId);
}

/**
 * Toggle bookmark for a poll.
 * Returns true if the poll is now saved, false if it was removed.
 * @param {{ id, title, mode, totalVotes }} poll
 */
export function toggleSavedPoll(poll) {
  const list = readJSON(SAVED_KEY);
  const exists = list.some(p => p.id === poll.id);
  if (exists) {
    writeJSON(SAVED_KEY, list.filter(p => p.id !== poll.id));
    return false;
  } else {
    const newList = [
      { id: poll.id, title: poll.title || 'Untitled Poll', mode: poll.mode || 'social', totalVotes: poll.totalVotes || 0, savedAt: Date.now() },
      ...list,
    ].slice(0, MAX_SAVED);
    writeJSON(SAVED_KEY, newList);
    return true;
  }
}

export function removeSavedPoll(pollId) {
  writeJSON(SAVED_KEY, readJSON(SAVED_KEY).filter(p => p.id !== pollId));
}
