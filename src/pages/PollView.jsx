import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Sparkles, MessageSquareQuote, CheckCircle2, Loader2, Copy, ShieldCheck, Bookmark, BookmarkCheck, Users, Trophy, Timer, ArrowRight, Send, LogIn, Lock } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToPoll, voteOnPoll, hasUserVoted, getUserVote, getOrSignInUser, saveAiSummary, addReaction, removeReaction, revealCorrectAnswer, deletePoll, signInWithGoogle, isUserVerified } from '../services/pollService';
import { trackRecentPoll, isPollSaved, toggleSavedPoll } from '../utils/pollHistory';
import IdeaCloud from '../components/IdeaCloud';

// ─── Mode Configuration ───────────────────────────────────────────────────────
const MODE_CONFIG = {
  social: {
    label: 'Social Mode', icon: '🔥',
    badge: 'bg-orange-50 text-orange-600 border-orange-200',
    accentGradient: 'from-primary-500 via-indigo-500 to-emerald-500',
    aiGradient: 'from-indigo-500 via-purple-500 to-indigo-600',
    aiBg: 'bg-indigo-100', aiIcon: 'text-indigo-600',
    aiTitle: 'The TL;DR on why people are fighting:', aiTextColor: 'text-indigo-900',
    aiBorder: 'border-indigo-100/50', aiBgLight: 'bg-indigo-50/50',
    feedTitle: 'Hot Takes', reasonsEmpty: 'No one has dropped a hot take yet.',
    voteCta: 'Lock It In 🔒',
    majorityMsg: "You're with the mob. 🐑 (Just kidding, good call)",
    minorityMsg: "Oof, hot take. You're in the minority.",
    tieMsg: "It's a bloodbath. 50/50 split.",
    ideaPrompt: "Think they're all wrong? Drop a better idea.",
    reactions: [
      { key: 'type1', emoji: '😂' },
      { key: 'type2', emoji: '💯' },
      { key: 'type3', emoji: '🤯' },
    ],
  },
  professional: {
    label: 'Professional Mode', icon: '📊',
    badge: 'bg-sky-50 text-sky-600 border-sky-200',
    accentGradient: 'from-slate-400 via-sky-500 to-slate-500',
    aiGradient: 'from-slate-500 via-sky-600 to-slate-500',
    aiBg: 'bg-sky-100', aiIcon: 'text-sky-600',
    aiTitle: 'Key themes from participant rationale:', aiTextColor: 'text-sky-900',
    aiBorder: 'border-sky-100/50', aiBgLight: 'bg-sky-50/50',
    feedTitle: 'Key Responses', reasonsEmpty: 'No responses have been submitted yet.',
    voteCta: 'Submit Response',
    majorityMsg: "Aligned with the consensus.",
    minorityMsg: "Divergent perspective detected.",
    tieMsg: "Evenly divided. A polarizing topic.",
    ideaPrompt: "Propose an alternative perspective.",
    ideaCloudLabel: 'Alternative Perspectives',
    communityBadge: '📋 Notable Suggestion',
    reactions: [
      { key: 'type1', emoji: '👍', label: 'Agree' },
      { key: 'type2', emoji: '💡', label: 'Useful' },
      { key: 'type3', emoji: '⚖️', label: 'Neutral' },
    ],
  },
};

// ─── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const ms = ts.toMillis ? ts.toMillis() : ts;
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 10)  return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTimeLeft(ms) {
  if (ms <= 0) return 'Self-destructed';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// ─── You vs Crowd Card ────────────────────────────────────────────────────────
function YouVsCrowd({ poll, selectedOption, cfg, revealStage }) {
  if (!selectedOption || poll.totalVotes < 1 || revealStage < 3) return null;

  const winner = poll.options.reduce((a, b) => (b.voteCount > a.voteCount ? b : a));
  const userOption = poll.options.find(o => o.id === selectedOption);
  if (!userOption) return null;

  const userPct = Math.round((userOption.voteCount / poll.totalVotes) * 100);
  const isMajority = userOption.id === winner.id;
  const isTie = poll.options.filter(o => o.voteCount === winner.voteCount).length > 1;

  let headline, subCopy, cardCls;
  if (isTie) {
    headline = cfg.tieMsg;
    subCopy = "Both sides are evenly matched — your vote matters more than usual.";
    cardCls = "bg-slate-900 border-slate-700 text-white shadow-2xl scale-[1.02]";
  } else if (isMajority) {
    headline = cfg.majorityMsg;
    subCopy = `${userPct}% of voters agree with you. Your intuition is aligned with the crowd.`;
    cardCls = "bg-indigo-600 border-indigo-400 text-white shadow-2xl scale-[1.02]";
  } else {
    headline = cfg.minorityMsg;
    subCopy = `Only ${userPct}% chose this. Explore the takes below to see the other side.`;
    cardCls = "bg-rose-600 border-rose-400 text-white shadow-2xl scale-[1.02]";
  }

  return (
    <div className={clsx("rounded-[24px] border-2 p-7 transition-all duration-700 reveal-dramatic", cardCls)}>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Verdict: You vs The Crowd</div>
      <p className="text-2xl font-black mb-2 leading-tight">{headline}</p>
      <p className="text-sm font-medium opacity-90 leading-relaxed max-w-[90%]">{subCopy}</p>
      
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">You chose</span>
          <span className="font-black text-sm">{userOption.text}</span>
        </div>
        {!isMajority && !isTie && (
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
            <Users className="w-3.5 h-3.5 opacity-70" />
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Crowd chose</span>
            <span className="font-black text-sm">{winner.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Celebration Particles ──────────────────────────────────────────────────
function RevealConfetti() {
  return (
    <div className="confetti-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#f59e0b', '#fbbf24', '#fcd34d', '#3b82f6', '#10b981', '#ffffff'][i % 6],
            animationDelay: `${Math.random() * 1.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Correct Answer Card ──────────────────────────────────────────────────────
function CorrectnessCard({ poll, selectedOption, isCreator, isRevealed, now, onRevealNow }) {
  if (!poll.correctOptionId) return null;

  const correctOption = poll.options.find(o => o.id === poll.correctOptionId);
  if (!correctOption) return null;

  const pctCorrect = poll.totalVotes > 0
    ? Math.round((correctOption.voteCount / poll.totalVotes) * 100)
    : 0;

  // Pre-reveal: Creator sees the answer with a Manual Reveal button
  if (isCreator && !isRevealed) {
    return (
      <div className="rounded-[24px] border-2 border-dashed border-emerald-500/30 bg-slate-900/40 backdrop-blur-xl p-6 flex flex-col gap-5 animate-in fade-in duration-500 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20">
            <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Answer Reveal Pending</p>
            <p className="text-sm font-bold text-slate-200">Correct: <span className="text-emerald-400 font-black uppercase tracking-tight">{correctOption.text}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={onRevealNow}
            className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-3 group"
          >
            Drumroll... Reveal Now 🥁
          </button>
          {poll.revealAt && (
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Auto-reveal</span>
               <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 tabular-nums">
                 <Timer className="w-3.5 h-3.5" />
                 {formatTimeLeft(poll.revealAt - now)}
               </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  // Pre-reveal: Participants see a mystery card
  if (!isRevealed && !isCreator) {
    return (
      <div className="rounded-[24px] border-2 border-slate-800 bg-slate-950/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center gap-5 reveal-mystery shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl shadow-inner border border-white/5 animate-pulse">
          🤫
        </div>
        <div>
          <p className="text-xl font-black text-slate-100 tracking-tight">Mystery Answer</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">
            {poll.revealAt 
              ? `Reveals in ${formatTimeLeft(poll.revealAt - now)}` 
              : "Waiting for creator reveal"}
          </p>
        </div>
      </div>
    );
  }

  // Post-reveal: Dramatic display
  const isCorrect = selectedOption === poll.correctOptionId;

  if (isCorrect) {
    return (
      <div className="relative overflow-hidden rounded-[24px] border-2 border-emerald-500/30 bg-emerald-950/20 backdrop-blur-xl p-7 flex items-center gap-6 reveal-dramatic shadow-2xl">
        <RevealConfetti />
        <div className="bg-emerald-500 rounded-full p-3 shrink-0 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
          <CheckCircle2 className="w-7 h-7 text-slate-950" />
        </div>
        <div>
          <p className="text-2xl font-black text-emerald-400 mb-1 leading-none uppercase tracking-tighter drop-shadow-lg">Perfecto! 🏆</p>
          <p className="text-sm text-slate-300 font-bold leading-relaxed">
            You nailed it. {pctCorrect}% of the crowd was as sharp as you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-[24px] border-2 p-7 reveal-dramatic backdrop-blur-xl shadow-2xl",
      selectedOption ? "bg-rose-950/20 border-rose-500/20" : "bg-slate-950/40 border-slate-800"
    )}>
      {isRevealed && <RevealConfetti />}
      <div className="flex items-center gap-5">
        <div className={clsx(
          "rounded-full w-14 h-14 flex items-center justify-center shrink-0 shadow-lg border-2 text-2xl bg-slate-900",
          selectedOption ? "border-rose-900/50" : "border-slate-800"
        )}>
           {selectedOption ? "❌" : "💡"}
        </div>
        <div>
          <p className="text-lg font-black text-slate-100 tracking-tight mb-1">
            {selectedOption ? "Not quite this time" : "The Correct Answer"}
          </p>
          <p className="text-sm text-slate-400 font-medium">
            The secret is out: <span className="font-black text-white underline decoration-emerald-500/50 decoration-2 underline-offset-4 uppercase tracking-tight">{correctOption.text}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Bar Label: percentage + "← You" marker ──────────────────────────
// Recharts LabelList spreads each data entry's fields directly onto props.
// So `props.id` gives the option's id — NOT `props.payload.id`.
function BarLabel(props) {
  const { x, y, width, height, value, selectedOption, id, totalVotes } = props;
  if (!value || !totalVotes) return null;
  const pct = Math.round((value / totalVotes) * 100);
  const isYou = id && id === selectedOption;
  return (
    <g>
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill={isYou ? '#4f46e5' : '#64748b'}
        fontSize={12}
        fontWeight={800}
        dominantBaseline="middle"
      >
        {pct}%{isYou ? ' ← You' : ''}
      </text>
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PollView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [currentUid, setCurrentUid] = useState(null);
  const [hasVoted, setHasVoted]   = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [reason, setReason]       = useState('');
  const [isVoting, setIsVoting]   = useState(false);
  const [error, setError]         = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError]     = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVerdict, setCopiedVerdict] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [myReactions, setMyReactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`rxd_${id}`) || '{}'); } catch { return {}; }
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  // hasSubmittedIdea: reads the same localStorage key IdeaCloud writes
  const [hasSubmittedIdea, setHasSubmittedIdea] = useState(() => {
    try { return !!localStorage.getItem(`ideaSubmit_${id}`); } catch { return false; }
  });
  // hasBrowsed: set when user clicks "Browse results" without voting
  const [hasBrowsed, setHasBrowsed] = useState(() => {
    try { return !!localStorage.getItem(`browsed_${id}`); } catch { return false; }
  });
  const [revealStage, setRevealStage] = useState(0); // 0: voting, 1: locking, 2: confirmed, 3: verdict, 4: full
  const [now, setNow] = useState(Date.now());

  // Handle auto-reveal for existing voters
  useEffect(() => {
    if (hasVoted || isCreator) setRevealStage(4);
  }, [hasVoted, isCreator]);

  // Staged reveal sequence after voting
  useEffect(() => {
    if (revealStage === 1 && !isVoting && hasVoted) {
      setTimeout(() => setRevealStage(2), 400);
    }
    if (revealStage === 2) {
      setTimeout(() => setRevealStage(3), 800);
    }
    if (revealStage === 3) {
      setTimeout(() => setRevealStage(4), 1400);
    }
  }, [revealStage, isVoting, hasVoted]);

  // Timer for self-destruct countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Proactive self-destruct cleanup
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (poll?.selfDestruct && poll?.expiresAt && poll.expiresAt < now && !isDeleting) {
      setIsDeleting(true);
      deletePoll(id).catch(err => {
        console.error(err);
        setIsDeleting(false);
      });
    }
  }, [poll, now, id, isDeleting]);

  useEffect(() => {
    setLoading(true);
    getOrSignInUser().then(uid => {
      setCurrentUid(uid);
      return getUserVote(id);
    }).then(vote => {
      if (vote) {
        setHasVoted(true);
        setSelectedOption(vote.optionId);
      }
    }).catch(console.error);

    const unsubscribe = subscribeToPoll(id, (data) => {
      setPoll(data);
      setLoading(false);
      setLastUpdated(Date.now());
      if (data) {
        trackRecentPoll(data);
        setIsBookmarked(isPollSaved(data.id));
      }
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (poll && currentUid) setIsCreator(poll.creatorId === currentUid);
  }, [poll, currentUid]);

  const handleGoBack = () => {
    navigate('/', { replace: true });
  };

  const handleCopyVerdict = () => {
    if (!poll || !selectedOption) return;
    
    const userOption = poll.options.find(o => o.id === selectedOption);
    const winner = poll.options.reduce((a, b) => (b.voteCount > a.voteCount ? b : a));
    const userPct = Math.round((userOption.voteCount / poll.totalVotes) * 100);
    const isMajority = userOption.id === winner.id;
    const isCorrect = poll.correctOptionId ? selectedOption === poll.correctOptionId : null;
    
    let text = `⚖️ Verdict is IN for: "${poll.title}"\n\n`;
    
    if (isCorrect !== null) {
      text += isCorrect ? `✅ I NAILED IT! ` : `❌ I MISSED IT! `;
      text += `The truth is: ${poll.options.find(o => o.id === poll.correctOptionId).text}\n\n`;
    }

    text += `🧠 My take: "${userOption.text}"\n`;
    text += `📊 Crowd alignment: ${userPct}% (${isMajority ? 'I\'m with the CONSENSUS 🙌' : 'I\'m a VISIONARY 👀'})\n\n`;
    text += `What's your verdict? Debate here 👇\n${window.location.href}`;
    
    navigator.clipboard.writeText(text);
    setCopiedVerdict(true);
    setTimeout(() => setCopiedVerdict(false), 2000);
  };

  const handleCopyInsight = () => {
    if (!poll?.aiSummary) return;
    navigator.clipboard.writeText(`🤖 AI Insight on "${poll.title}":\n\n"${poll.aiSummary}"\n\nGet the full verdict at: ${window.location.href}`);
    setCopiedVerdict(true); // Re-use the feedback state
    setTimeout(() => setCopiedVerdict(false), 2000);
  };

  const mode = poll?.mode === 'professional' ? 'professional' : 'social';
  const cfg  = MODE_CONFIG[mode];
  const isPro = mode === 'professional';
  const isExpired = poll?.selfDestruct && poll?.expiresAt && poll.expiresAt < now;
  const isRevealed = poll?.isCorrectAnswerRevealed || (poll?.revealAt && poll?.revealAt <= now);

  const handleRevealNow = async () => {
    if (!poll?.id) return;
    try { await revealCorrectAnswer(poll.id); } catch (err) { console.error(err); }
  };

  // Derive feed header based on user's crowd state
  const feedHeader = useCallback(() => {
    if (!selectedOption || !poll) return cfg.feedTitle;
    const winner = poll.options.reduce((a, b) => (b.voteCount > a.voteCount ? b : a));
    if (selectedOption === winner.id) return isPro ? 'Supporting Responses' : 'Why People Agree';
    return isPro ? 'Differing Perspectives' : 'Why People Disagree';
  }, [selectedOption, poll, cfg, isPro]);

  const handleVote = async (e) => {
    e.preventDefault();
    if (isExpired) return;
    if (!selectedOption) return;
    setIsVoting(true);
    setRevealStage(1);
    setError('');
    try {
      await voteOnPoll(id, selectedOption, reason);
      setHasVoted(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit vote. Are you trying to vote twice?');
    } finally {
      setIsVoting(false);
    }
  };

  // AI generation requires a meaningful sample to avoid misleading 1-vote summaries
  const MIN_VOTES_FOR_AI = 3;

  const handleGenerateAISummary = async () => {
    if (!poll.recentReasons || poll.recentReasons.length === 0) return;
    setIsGeneratingAI(true);
    setAiError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: poll.title, options: poll.options, recentReasons: poll.recentReasons, mode, ideaCloud: poll.ideaCloud || [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      if (data.summary) await saveAiSummary(id, data.summary, poll.totalVotes);
    } catch (err) {
      setAiError(err.message === 'Failed to fetch'
        ? "AI endpoint not available locally. Deploy to Vercel to activate."
        : err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBookmark = () => {
    if (!poll) return;
    setIsBookmarked(toggleSavedPoll(poll));
  };

  const handleReaction = async (reasonTimestamp, reactionKey, event) => {
    // Floating bubble logic
    if (event) {
      const bubble = document.createElement('div');
      bubble.className = 'reaction-bubble text-2xl z-[9999] fixed';
      bubble.innerText = cfg.reactions.find(r => r.key === reactionKey)?.emoji || '✨';
      bubble.style.left = `${event.clientX}px`;
      bubble.style.top = `${event.clientY}px`;
      document.body.appendChild(bubble);
      setTimeout(() => bubble.remove(), 800);
    }

    // Key by timestamp (stable) — not by array index which shifts as FIFO buffer rotates
    const stateKey = `${reasonTimestamp}_${reactionKey}`;
    const hasReacted = !!myReactions[stateKey];

    const updated = { ...myReactions };
    if (hasReacted) {
      delete updated[stateKey];
    } else {
      updated[stateKey] = true;
    }

    setMyReactions(updated);
    try { localStorage.setItem(`rxd_${id}`, JSON.stringify(updated)); } catch {}

    try {
      if (hasReacted) {
        await removeReaction(id, reasonTimestamp, reactionKey);
      } else {
        await addReaction(id, reasonTimestamp, reactionKey);
      }
    } catch (err) {
      console.error('Reaction update failed:', err);
    }
  };

  const handleBrowse = () => {
    try { localStorage.setItem(`browsed_${id}`, '1'); } catch {}
    setHasBrowsed(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <p className="text-slate-500 font-medium">Synchronizing Data...</p>
      </div>
    );
  }
  if (!poll) return (
    <div className="max-w-2xl mx-auto py-20 px-4 animate-in fade-in duration-700">
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[32px] p-12 text-center border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 blur-[80px] rounded-full" />
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-lg">
          <span className="text-5xl">🌫️</span>
        </div>
        <h2 className="text-3xl font-black text-slate-100 tracking-tight mb-4">This poll has vanished</h2>
        <p className="text-slate-400 font-medium mb-12 max-w-sm mx-auto leading-relaxed">
          The debate has ended. This poll has either self-destructed or was removed by its creator.
        </p>
        <button
          onClick={handleGoBack}
          className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95 group"
        >
          <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Feed
        </button>
      </div>
    </div>
  );

  const isStructured = poll.participationMode === 'structured';
  const showResults = isCreator || hasVoted || (!isStructured && (hasSubmittedIdea || hasBrowsed));
  const showVoting  = !hasVoted && (!hasBrowsed || isStructured);

  // ── System Design: IdeaCloud disabled for Professional + Structured ──
  const showIdeaCloud = !(isPro && isStructured);

  // ── Community Choice: detect if any idea surpasses the leading option ──
  const ideas = poll.ideaCloud || [];
  const topOptionVotes = poll.options.length > 0
    ? Math.max(...poll.options.map(o => o.voteCount))
    : 0;
  const topIdea = ideas.length > 0
    ? ideas.reduce((a, b) => b.weight > a.weight ? b : a)
    : null;
  const isCommunityLeading = topIdea && topOptionVotes > 0 && topIdea.weight > topOptionVotes;

  // Chart data: highlight user's bar with increased opacity
  const chartData = poll.options.map(o => ({
    ...o,
    fill: o.id === selectedOption
      ? o.color || '#6366f1'
      : (o.color ? `${o.color}99` : '#94a3b8'),
  }));

  return (
    <div className={clsx("mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6", showResults ? "max-w-5xl" : "max-w-2xl")}>

      {/* ══════════════════ HEADER ══════════════════ */}
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[24px] p-8 xl:p-12 text-center relative overflow-hidden shadow-2xl border border-white/10">
        <div className={clsx("absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r", cfg.accentGradient)} />

        {isCreator && (
          <div className="absolute top-5 left-6 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-400 bg-primary-950/40 px-3 py-1.5 rounded-full border border-primary-900/50">
            <ShieldCheck className="w-3.5 h-3.5" /> Creator Dashboard
          </div>
        )}

        <div className="absolute top-5 right-6 flex items-center gap-2">
          {isPro ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-slate-950 text-sky-400 border-sky-900/30 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Identity
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-slate-950 text-primary-400 border-primary-900/30 shadow-sm">
              <Lock className="w-3.5 h-3.5" /> 100% Anonymous
            </div>
          )}
          {isStructured ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-slate-950 text-slate-400 border-slate-800">
              🔒 Vote Required
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-emerald-950/40 text-emerald-400 border-emerald-900/50">
              🔓 Open Poll
            </div>
          )}
          <div className={clsx("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border", cfg.badge.replace('bg-', 'bg-').replace('text-', 'text-'))}>
            {cfg.icon} {cfg.label}
          </div>
          <button
            onClick={handleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this poll'}
            className={clsx("p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95",
              isBookmarked ? "bg-amber-950/40 border-amber-900 text-amber-500" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-amber-900 hover:text-amber-500"
            )}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* ─── Unified Timer Bar ────────────────────────────── */}
        {(poll.selfDestruct || (poll.correctOptionId && !isRevealed)) && (
          <div className="mt-12 mb-6 flex flex-wrap justify-center gap-4 animate-in fade-in zoom-in-95 duration-700">
            {poll.selfDestruct && (
              <div className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 shadow-lg transition-all",
                isExpired ? "bg-rose-950/40 border-rose-900 text-rose-500" : "bg-slate-950 border-rose-900/30 text-rose-400"
              )}>
                <div className="bg-rose-600 p-1 rounded-lg text-white">
                  <Timer className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Self-Destruct</p>
                  <p className="text-sm font-black tabular-nums">{isExpired ? "Exploded" : formatTimeLeft(poll.expiresAt - now)}</p>
                </div>
              </div>
            )}
            {poll.correctOptionId && !isRevealed && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-emerald-900/30 bg-slate-950 text-emerald-400 shadow-lg transition-all">
                <div className="bg-emerald-600 p-1 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Answer Reveal</p>
                  <p className="text-sm font-black tabular-nums">
                    {poll.revealAt ? formatTimeLeft(poll.revealAt - now) : "Creator Reveal"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <h1 className={clsx("font-black text-slate-100 tracking-tighter leading-tight pt-4 drop-shadow-2xl", showResults ? "text-4xl md:text-5xl mb-6" : "text-4xl mb-10")}>
          {poll.title}
        </h1>

        {showResults && (
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-slate-950/50 px-5 py-2.5 rounded-full border border-white/5 shadow-inner">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-slate-400 font-black text-xs uppercase tracking-widest">{(poll.totalVotes || 0).toLocaleString()} votes</span>
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Synced {timeAgo(lastUpdated)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════ GRID ══════════════════ */}
      <div className={clsx("grid gap-6", showResults ? (showVoting ? "grid-cols-1 lg:grid-cols-2 items-start" : "grid-cols-1") : "grid-cols-1")}>

        {/* ─── VOTING PANEL ─────────────────────────────────── */}
        {showVoting && (
          <div className={clsx("bg-slate-900/60 backdrop-blur-2xl rounded-[24px] p-6 md:p-10 flex flex-col shadow-2xl border border-white/5 flex-1 order-2 lg:order-1 relative overflow-hidden")}>
            <div className={clsx("absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r", cfg.accentGradient)} />
            {isExpired ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                 <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20 shadow-lg">
                    <span className="text-3xl relative top-px">💥</span>
                 </div>
                 <h2 className="text-2xl font-black text-white mb-3 tracking-tight">This poll has self-destructed</h2>
                 <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed font-medium">
                    The clock has run out. Voting is disabled, preserving this moment in time forever.
                 </p>
                 {!showResults && !isCreator && (
                    <button
                      onClick={handleBrowse}
                      className="mt-10 px-8 py-3 rounded-2xl bg-white text-slate-950 text-sm font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2 shadow-xl"
                    >
                      View dead results <ArrowRight className="w-4 h-4" />
                    </button>
                 )}
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black mb-1 text-white pt-2 tracking-tight">
                  {isCreator ? "Cast Your Vote (Optional)" : "Cast Your Vote"}
                </h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  {poll.correctOptionId ? "This poll has a correct answer — give it your best shot!" : "Your answer helps shape the AI summary."}
                </p>

                {error && (
                  <div className="mb-6 p-5 bg-rose-950/40 text-rose-400 rounded-2xl border-2 border-rose-900/50 font-bold text-sm reveal-dramatic">{error}</div>
                )}

                <form onSubmit={handleVote} className="flex-1 flex flex-col">
                  {isPro && !isUserVerified() ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10 animate-in fade-in zoom-in-95 duration-500">
                      <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 border border-sky-500/20 shadow-lg">
                        <Lock className="w-8 h-8 text-sky-400" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2 tracking-tight">Verified Response Required</h3>
                      <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed mb-10 font-medium">
                        Professional mode requires a verified identity to ensure accountability and data integrity.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await signInWithGoogle();
                            // Force re-sync of auth state if needed, though Firebase usually handles it
                          } catch (err) {
                            setError('Sign-in failed. Please try again.');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-white text-slate-950 font-black text-sm py-4 rounded-2xl shadow-xl hover:bg-sky-500 hover:text-white transition-all transform hover:-translate-y-1 active:scale-95"
                      >
                        <LogIn className="w-4 h-4" /> Sign in with Google
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-10">
                        {poll.options.map((option) => (
                          <label key={option.id} className={clsx(
                            "flex items-center gap-4 p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-300",
                            selectedOption === option.id
                              ? (isPro ? "border-sky-500 bg-sky-950/40 shadow-[0_0_20px_rgba(14,165,233,0.15)]" : "border-primary-500 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]")
                              : "border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40"
                          )}>
                            <div className={clsx(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedOption === option.id 
                                ? (isPro ? "border-sky-500 bg-sky-500" : "border-primary-500 bg-primary-500") 
                                : "border-slate-700"
                            )}>
                              {selectedOption === option.id && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className={clsx("font-black text-base tracking-tight", selectedOption === option.id ? "text-white" : "text-slate-400")}>
                              {option.text}
                            </span>
                            <input
                              type="radio" name="poll_option" value={option.id}
                              checked={selectedOption === option.id}
                              onChange={() => setSelectedOption(option.id)}
                              className="hidden"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-auto space-y-6 pt-6 border-t border-white/5">
                        <div>
                          <label htmlFor="reason" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">
                            {isPro ? 'Your reasoning' : 'Why did you choose this?'}
                            <span className="text-slate-700 font-bold ml-1 normal-case tracking-normal">(Optional)</span>
                          </label>
                          <textarea
                            id="reason" rows={2} maxLength={200}
                            value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder={isPro ? "Provide a brief rationale..." : "Briefly explain your choice..."}
                            className={clsx("w-full px-6 py-5 rounded-[20px] border-2 border-slate-800 focus:ring-0 outline-none transition text-sm bg-slate-950/50 text-white resize-none placeholder-slate-700 shadow-inner", isPro ? "focus:border-sky-500" : "focus:border-primary-500")}
                          />
                          <div className="text-right text-[10px] text-slate-600 mt-2 font-black uppercase tracking-widest">
                            <span className={reason.length > 180 ? 'text-rose-500' : ''}>{reason.length}</span>/200
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          <button
                            type="submit" disabled={!selectedOption || isVoting}
                            className={clsx("w-full flex items-center justify-center gap-3 text-white font-black text-lg py-5 rounded-[24px] shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                              isPro ? "bg-gradient-to-r from-sky-600 to-indigo-600 shadow-sky-500/20" : "bg-gradient-to-r from-primary-600 to-purple-600 shadow-indigo-500/20"
                            )}
                          >
                            {revealStage === 1 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                Locking in...
                              </div>
                            ) : (
                              <><Send className="w-5 h-5" /> {cfg.voteCta}</>
                            )}
                          </button>
                          
                          {!isStructured && !isCreator && (
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={handleBrowse}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                Skip — just browse results →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </form>
              </>
            )}
          </div>
        )}

        {/* ─── RESULTS COLUMN ───────────────────────────────── */}
        {showResults && (
          <div className="space-y-6 order-1 lg:order-2">

            {/* ── Creator: Share Panel ── */}
            {isCreator && (
              <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[24px] p-6 shadow-2xl border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-white tracking-tight">Share Poll</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Copy link to gather votes</p>
                </div>
                <div className="flex gap-2">
                  {hasVoted && (
                    <button onClick={handleCopyVerdict} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition-all duration-300 shadow-lg">
                      {copiedVerdict ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      {copiedVerdict ? "Verdict Copied!" : "Share Verdict"}
                    </button>
                  )}
                  <button onClick={handleCopyLink} className="flex items-center gap-2 bg-white hover:bg-primary-500 text-slate-950 hover:text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition-all duration-300 shrink-0 shadow-lg">
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ ZONE 1: FEEDBACK ════════════════════════════ */}
            {(hasVoted || isCreator) && (
              <div className={clsx("space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500")}>

                {/* Vote Confirmed (participants only) */}
                {revealStage === 2 && !isCreator && (
                  <div className="bg-slate-950/60 border-2 border-emerald-500/50 backdrop-blur-2xl rounded-[28px] p-7 flex items-center gap-5 text-emerald-400 shadow-2xl reveal-dramatic">
                    <div className="bg-emerald-500 p-2.5 text-slate-950 rounded-full shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-black text-2xl uppercase tracking-tighter leading-none mb-1">Vote Locked!</p>
                      <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest italic">Syncing crowd data...</p>
                    </div>
                  </div>
                )}

                {/* You vs Crowd (participants only) */}
                {hasVoted && !isCreator && (
                  <div className="relative group">
                    <YouVsCrowd poll={poll} selectedOption={selectedOption} cfg={cfg} revealStage={revealStage} />
                    {revealStage >= 3 && (
                      <button 
                        onClick={handleCopyVerdict}
                        className="absolute -top-3 -right-3 bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 z-10"
                      >
                        {copiedVerdict ? "Copied! ✨" : "Share Verdict 🔗"}
                      </button>
                    )}
                  </div>
                )}

                {/* Correctness (participants + creator) - only show after verdict */}
                {revealStage >= 3 && (
                  <CorrectnessCard 
                    poll={poll} 
                    selectedOption={selectedOption} 
                    isCreator={isCreator} 
                    isRevealed={isRevealed} 
                    now={now}
                    onRevealNow={handleRevealNow}
                  />
                )}
              </div>
            )}

            {/* ════ ZONE 2: CHART ══════════════════════════════ */}
            {revealStage === 4 && (
              poll.totalVotes === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-16 text-center shadow-2xl border border-white/5 animate-in fade-in duration-500">
                  <p className="text-slate-300 font-black text-xl tracking-tight mb-2">No Votes Yet</p>
                  <p className="text-slate-500 text-sm font-medium">Be the first to leave your mark!</p>
                </div>
              ) : (
                <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[28px] p-8 md:p-10 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Live Distribution</p>
                  <div className="h-[300px] -ml-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="text" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: 13 }}
                          itemStyle={{ color: '#f8fafc' }}
                          formatter={(v) => [`${v} votes`, '']}
                        />
                        <Bar dataKey="voteCount" radius={[0, 12, 12, 0]} barSize={38}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList
                            content={(props) => (
                              <BarLabel {...props} selectedOption={selectedOption} totalVotes={poll.totalVotes} />
                            )}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            )}

            {/* ════ ZONE 3: IDEA CLOUD ════════════════════════ */}
            {revealStage === 4 && (showIdeaCloud ? (
              <IdeaCloud
                poll={poll}
                isPro={isPro}
                isExpired={isExpired}
                isStructured={isStructured}
                hasVoted={hasVoted}
                isCreator={isCreator}
                isCommunityLeading={isCommunityLeading}
                topOptionVotes={topOptionVotes}
                communityBadge={cfg.communityBadge}
                onIdeaSubmit={() => setHasSubmittedIdea(true)}
              />
            ) : (
              // Pro + Structured: No Idea Cloud — show a minimal note encouraging reasons
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.2)', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-slate-700/40">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Feedback Channel</span>
                </div>
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg">📋</div>
                  <p className="text-slate-300 text-sm font-semibold">This is a formal vote</p>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-[220px]">
                    Alternative suggestions are disabled. Use the rationale field when voting to share your perspective.
                  </p>
                </div>
              </div>
            ))}

            {/* ════ ZONE 4: AI + EXPLORATION ═══════════════════ */}
            {revealStage === 4 && poll.totalVotes > 0 && (
              <div className={clsx("bg-gradient-to-br rounded-[30px] p-[1.5px] shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000", cfg.aiGradient)}>
                <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[29px] p-8 md:p-12">

                  {/* AI Section Header context */}
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">{cfg.aiTitle}</p>

                  {/* AI summary or CTA */}
                  {!poll.aiSummary ? (
                    <div className="text-center py-10 rounded-2xl border-2 border-dashed border-white/5 mb-8 bg-slate-950/30">
                      <Sparkles className="w-8 h-8 text-primary-400 mx-auto mb-4" />
                      {(poll.totalVotes < MIN_VOTES_FOR_AI && !isCreator) ? (
                        <>
                          <p className="text-sm text-slate-300 mb-2 px-6 font-bold">
                            {isPro ? 'Analysis unlocks with more data.' : 'Insight unlocks once the crowd grows.'}
                          </p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {poll.totalVotes}/{MIN_VOTES_FOR_AI} votes needed
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-300 mb-6 px-6 font-bold">
                            {isCreator ? 'Creator Access: Generate insight now.' : (isPro ? 'Ready to analyze participant reasoning.' : 'Ready to summarize recent hot takes.')}
                          </p>
                          <button
                            onClick={handleGenerateAISummary}
                            disabled={isGeneratingAI || !poll.recentReasons?.length}
                            className={clsx('text-white text-xs font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto',
                              isPro ? 'bg-sky-600 hover:bg-sky-500' : 'bg-indigo-600 hover:bg-indigo-500'
                            )}
                          >
                            {isGeneratingAI ? <><div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin" /> Analyzing...</> : 'Generate Insight'}
                          </button>
                        </>
                      )}
                      {!poll.recentReasons?.length && (poll.totalVotes >= MIN_VOTES_FOR_AI || isCreator) && <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-4">At least one reason required.</p>}
                      {aiError && <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-4 px-6">{aiError}</p>}
                    </div>
                  ) : (
                    <div className="mb-10 p-1 relative group/ai">
                      <p className="text-lg md:text-xl leading-relaxed font-bold italic border-l-4 border-primary-500 pl-6 text-white drop-shadow-lg pr-12">
                        "{poll.aiSummary}"
                      </p>
                      
                      <button 
                        onClick={handleCopyInsight}
                        className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-colors opacity-0 group-hover/ai:opacity-100"
                        title="Copy AI Insight"
                      >
                        {copiedVerdict ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>

                      {/* Creator can refresh analysis whenever they want */}
                      {isCreator && (
                        <div className="mt-6 flex items-center gap-4">
                          <button
                            onClick={handleGenerateAISummary}
                            disabled={isGeneratingAI || !poll.recentReasons?.length}
                            className={clsx('text-[10px] font-black uppercase tracking-widest py-2 px-5 rounded-lg border-2 transition-all disabled:opacity-50 group', 
                              isPro ? 'border-sky-900 text-sky-400 hover:bg-sky-950' : 'border-indigo-900 text-indigo-400 hover:bg-indigo-950'
                            )}
                          >
                            {isGeneratingAI ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-t-white border-white/20 rounded-full animate-spin" />
                                Updating...
                              </div>
                            ) : (
                              <span className="group-hover:scale-105 transition-transform flex items-center gap-2">
                                ↺ Regenerate Insight ({poll.totalVotes} votes)
                              </span>
                            )}
                          </button>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Creator Access</span>
                            <span className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.1em]">Forces re-analysis of all votes</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reasons Feed */}
                  {poll.recentReasons?.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 mt-8">
                        {(hasVoted && !isCreator) ? feedHeader() : cfg.feedTitle}
                      </p>
                      <div className="space-y-1">
                        {poll.recentReasons.map((r, idx) => (
                          <div key={idx} className="flex gap-4 items-start py-6 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-all px-4 rounded-2xl group/reason">
                            <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                              {isPro && r.author?.photoURL ? (
                                <img src={r.author.photoURL} alt="" className="w-8 h-8 rounded-full border border-sky-500/30" />
                              ) : (
                                <MessageSquareQuote className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                {isPro && r.author && (
                                  <div className="flex flex-col mb-2">
                                    <span className="text-[11px] font-black text-sky-400 uppercase tracking-wider leading-none">{r.author.name}</span>
                                    <span className="text-[9px] font-bold text-slate-500 lowercase leading-none mt-1">{r.author.email}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-base text-slate-200 font-bold mb-4 leading-snug">"{r.text}"</p>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-950 text-slate-400 border border-white/5">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: poll.options.find(o => o.id === r.optionId)?.color || '#6366f1' }} />
                                  {poll.options.find(o => o.id === r.optionId)?.text}
                                </div>
                                <div className="flex items-center gap-2">
                                  {cfg.reactions.map(rx => {
                                    const stateKey = `${r.timestamp}_${rx.key}`;
                                    const hasReacted = !!myReactions[stateKey];
                                    return (
                                      <button
                                        key={rx.key} type="button"
                                        onClick={(e) => handleReaction(r.timestamp, rx.key, e)}
                                        title={rx.label}
                                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border-2 transition-all duration-300",
                                          hasReacted
                                            ? "bg-primary-950/40 border-primary-500/50 text-primary-400"
                                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300 hover:scale-110 active:scale-95 shadow-sm"
                                        )}
                                      >
                                        <span className="text-base leading-none">{rx.emoji}</span>
                                        <span className={clsx("font-black text-[11px]", hasReacted ? "text-primary-400" : "text-slate-500")}>
                                          {r.reactions?.[rx.key] || 0}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-slate-600 font-bold uppercase tracking-widest italic">{cfg.reasonsEmpty}</p>
                  )}
                </div>
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
}
