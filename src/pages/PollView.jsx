import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Sparkles, MessageSquareQuote, CheckCircle2, Loader2, Copy, ShieldCheck, Bookmark, BookmarkCheck, Users, Trophy, Timer, ArrowRight, Send } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToPoll, voteOnPoll, hasUserVoted, getUserVote, getOrSignInUser, saveAiSummary, addReaction, removeReaction, revealCorrectAnswer } from '../services/pollService';
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
      <div className="rounded-[20px] border border-dashed border-emerald-200 bg-emerald-50/20 p-5 flex flex-col gap-4 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="section-eyebrow mb-1">Answer Reveal Pending</p>
            <p className="text-sm font-bold text-slate-700">Correct: <span className="text-emerald-700 font-extrabold">{correctOption.text}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onRevealNow}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group"
          >
            Drumroll... Reveal Now 🥁
          </button>
          {poll.revealAt && (
             <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
               <Timer className="w-3.5 h-3.5" />
               {formatTimeLeft(poll.revealAt - now)}
             </div>
          )}
        </div>
      </div>
    );
  }

  // Pre-reveal: Participants see a mystery card
  if (!isRevealed && !isCreator) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-slate-100 p-6 flex flex-col items-center justify-center text-center gap-4 reveal-mystery shadow-sm">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl shadow-inner animate-pulse">
          🤫
        </div>
        <div>
          <p className="text-lg font-extrabold text-slate-800">Mystery Answer</p>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
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
      <div className="relative overflow-hidden rounded-[20px] border border-emerald-500/30 bg-emerald-50/40 p-6 flex items-center gap-5 reveal-dramatic">
        <RevealConfetti />
        <div className="bg-emerald-500 rounded-full p-2.5 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xl font-black text-emerald-950 mb-1 leading-none uppercase tracking-tighter">Perfecto! 🏆</p>
          <p className="text-sm text-emerald-800/80 font-medium">
            You nailed it. {pctCorrect}% of the crowd was as sharp as you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-[20px] border p-6 reveal-dramatic",
      selectedOption ? "bg-orange-50/40 border-orange-200" : "bg-slate-50 border-slate-200"
    )}>
      {isRevealed && <RevealConfetti />}
      <div className="flex items-center gap-4">
        <div className={clsx(
          "rounded-full w-12 h-12 flex items-center justify-center shrink-0 shadow-sm border text-xl",
          selectedOption ? "bg-white border-orange-100" : "bg-white border-slate-100"
        )}>
           {selectedOption ? "❌" : "💡"}
        </div>
        <div>
          <p className="text-base font-extrabold text-slate-800 mb-0.5">
            {selectedOption ? "Not quite this time" : "The Correct Answer"}
          </p>
          <p className="text-sm text-slate-600">
            The secret is out: <span className="font-black text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4">{correctOption.text}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Bar Label showing "← You" ────────────────────────────────────────
// NOTE: Recharts LabelList spreads each data entry's fields directly onto props.
// So `props.id` gives the option's id — NOT `props.payload.id`.
function YouLabel(props) {
  const { x, y, width, height, value, selectedOption, id } = props;
  if (!id || id !== selectedOption || !value) return null;
  return (
    <g>
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#4f46e5"
        fontSize={12}
        fontWeight={800}
        dominantBaseline="middle"
      >
        ← You
      </text>
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PollView() {
  const { id } = useParams();
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
  useEffect(() => {
    if (poll?.selfDestruct && poll?.expiresAt && poll.expiresAt < now) {
      deletePoll(id).catch(console.error);
    }
  }, [poll, now, id]);

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

  const handleReaction = async (reasonIndex, reactionKey) => {
    const stateKey = `${reasonIndex}_${reactionKey}`;
    const hasReacted = !!myReactions[stateKey];
    
    // Toggle state
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
        await removeReaction(id, reasonIndex, reactionKey);
      } else {
        await addReaction(id, reasonIndex, reactionKey);
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
  if (!poll) return <div className="text-center text-xl py-20 text-slate-500 font-bold">Poll not found.</div>;

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
      <div className="bg-white rounded-[20px] p-8 xl:p-10 text-center relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className={clsx("absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r", cfg.accentGradient)} />

        {isCreator && (
          <div className="absolute top-5 left-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100">
            <ShieldCheck className="w-4 h-4" /> Creator Dashboard
          </div>
        )}

        <div className="absolute top-5 right-6 flex items-center gap-2">
          {isStructured ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
              🔒 Vote Required
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
              🔓 Open Poll
            </div>
          )}
          <div className={clsx("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border", cfg.badge)}>
            {cfg.icon} {cfg.label}
          </div>
          <button
            onClick={handleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this poll'}
            className={clsx("p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95",
              isBookmarked ? "bg-amber-50 border-amber-300 text-amber-500" : "bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500"
            )}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* ─── Unified Timer Bar ────────────────────────────── */}
        {(poll.selfDestruct || (poll.correctOptionId && !isRevealed)) && (
          <div className="mt-8 mb-4 flex flex-wrap justify-center gap-4 animate-in fade-in zoom-in-95 duration-700">
            {poll.selfDestruct && (
              <div className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-sm transition-all",
                isExpired ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-rose-100 text-rose-500"
              )}>
                <div className="bg-rose-500 p-1 rounded-lg text-white">
                  <Timer className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 leading-none mb-0.5">Self-Destruct</p>
                  <p className="text-xs font-black tabular-nums">{isExpired ? "Exploded" : formatTimeLeft(poll.expiresAt - now)}</p>
                </div>
              </div>
            )}
            {poll.correctOptionId && !isRevealed && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-emerald-100 bg-white text-emerald-600 shadow-sm transition-all">
                <div className="bg-emerald-500 p-1 rounded-lg text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 leading-none mb-0.5">Answer Reveal</p>
                  <p className="text-xs font-black tabular-nums">
                    {poll.revealAt ? formatTimeLeft(poll.revealAt - now) : "Creator Reveal"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <h1 className={clsx("font-extrabold text-slate-800 tracking-tight leading-tight pt-4", showResults ? "text-3xl md:text-4xl mb-4" : "text-3xl mb-8")}>
          {poll.title}
        </h1>

        {showResults && (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-slate-600 font-semibold text-sm">{(poll.totalVotes || 0).toLocaleString()} votes</span>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-medium">
                Updated {timeAgo(lastUpdated)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════ GRID ══════════════════ */}
      <div className={clsx("grid gap-6", showResults ? (showVoting ? "grid-cols-1 lg:grid-cols-2 items-start" : "grid-cols-1") : "grid-cols-1")}>

        {/* ─── VOTING PANEL ─────────────────────────────────── */}
        {showVoting && (
          <div className={clsx("bg-white rounded-[20px] p-6 md:p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 order-2 lg:order-1 relative overflow-hidden")}>
            <div className={clsx("absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r", cfg.accentGradient)} />
            {isExpired ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                 <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
                    <span className="text-2xl relative top-px">💥</span>
                 </div>
                 <h2 className="text-xl font-extrabold text-slate-800 mb-2">This poll has self-destructed</h2>
                 <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
                    The clock has run out. Voting is disabled, preserving this moment in time forever.
                 </p>
                 {!showResults && !isCreator && (
                    <button
                      onClick={handleBrowse}
                      className="mt-8 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      View dead results <ArrowRight className="w-4 h-4" />
                    </button>
                 )}
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-1 text-slate-800 pt-2">
                  {isCreator ? "Cast Your Vote (Optional)" : "Cast Your Vote"}
                </h2>
                <p className="text-sm text-slate-400 mb-6">
                  {poll.correctOptionId ? "This poll has a correct answer — give it your best shot!" : "Your answer helps shape the AI summary."}
                </p>

                {error && (
                  <div className="mb-5 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-medium text-sm">{error}</div>
                )}

                <form onSubmit={handleVote} className="flex-1 flex flex-col">
                  <div className="space-y-2.5 mb-8">
                    {poll.options.map((option) => (
                      <label key={option.id} className={clsx(
                        "flex items-center gap-4 p-4 rounded-[16px] border cursor-pointer transition-all duration-200",
                        selectedOption === option.id
                          ? (isPro ? "border-sky-400 bg-sky-50/60 shadow-sm" : "border-primary-400 bg-primary-50/60 shadow-sm")
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}>
                        <input
                          type="radio" name="poll_option" value={option.id}
                          checked={selectedOption === option.id}
                          onChange={() => setSelectedOption(option.id)}
                          className={clsx("w-5 h-5", isPro ? "text-sky-600 focus:ring-sky-500" : "text-primary-600 focus:ring-primary-500")}
                        />
                        <span className={clsx("font-semibold", selectedOption === option.id ? (isPro ? "text-sky-900" : "text-primary-900") : "text-slate-700")}>
                          {option.text}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-auto space-y-5 pt-5 border-t border-slate-100">
                    <div>
                      <label htmlFor="reason" className="block text-sm font-semibold text-slate-700 mb-2">
                        {isPro ? 'Your reasoning' : 'Why did you choose this?'}
                        <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                      </label>
                      <textarea
                        id="reason" rows={2} maxLength={200}
                        value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder={isPro ? "Provide a brief rationale..." : "Briefly explain your choice..."}
                        className={clsx("w-full px-5 py-4 rounded-[16px] border border-slate-200 focus:ring-0 outline-none transition text-sm bg-slate-50 resize-none placeholder-slate-400 shadow-sm", isPro ? "focus:border-sky-500" : "focus:border-primary-500")}
                      />
                      <div className="text-right text-xs text-slate-400 mt-1.5 font-medium">
                        <span className={reason.length > 180 ? 'text-rose-500' : ''}>{reason.length}</span>/200
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="submit" disabled={!selectedOption || isVoting}
                        className={clsx("w-full flex items-center justify-center gap-2 text-white font-bold text-base py-4 rounded-[16px] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                          isPro ? "bg-gradient-to-r from-sky-600 to-slate-600 shadow-sky-500/30" : "bg-gradient-to-r from-primary-600 to-indigo-600 shadow-indigo-500/30"
                        )}
                      >
                        {revealStage === 1 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Locking in...
                          </div>
                        ) : (
                          <><Send className="w-4 h-4" /> {cfg.voteCta}</>
                        )}
                      </button>
                      
                      {!isStructured && !isCreator && (
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleBrowse}
                            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors underline-offset-2 hover:underline"
                          >
                            Skip — just browse results →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ─── RESULTS COLUMN ───────────────────────────────── */}
        {showResults && (
          <div className="space-y-5 order-1 lg:order-2">

            {/* ── Creator: Share Panel ── */}
            {isCreator && (
              <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_16px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800">Share Poll</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Copy the link to collect votes.</p>
                </div>
                <button onClick={handleCopyLink} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl transition-colors shrink-0">
                  {copiedLink ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
              </div>
            )}

            {/* ════ ZONE 1: FEEDBACK ════════════════════════════ */}
            {(hasVoted || isCreator) && (
              <div className={clsx("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500")}>

                {/* Vote Confirmed (participants only) */}
                {revealStage === 2 && !isCreator && (
                  <div className="bg-white border-2 border-emerald-500 rounded-[24px] p-6 flex items-center gap-4 text-emerald-800 shadow-xl reveal-dramatic">
                    <div className="bg-emerald-500 p-2 text-white rounded-full shrink-0 shadow-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-xl uppercase tracking-tighter">Vote Locked!</p>
                      <p className="text-sm text-emerald-600 font-bold italic">Gathering crowd data...</p>
                    </div>
                  </div>
                )}

                {/* You vs Crowd (participants only) */}
                {hasVoted && !isCreator && (
                  <YouVsCrowd poll={poll} selectedOption={selectedOption} cfg={cfg} revealStage={revealStage} />
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
                <div className="bg-white rounded-[20px] p-12 text-center shadow-[0_4px_16px_rgb(0,0,0,0.04)] border border-slate-100 animate-in fade-in duration-500">
                  <p className="text-slate-500 font-semibold text-lg mb-1">No Votes Yet</p>
                  <p className="text-slate-400 text-sm">Be the first to vote!</p>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <p className="section-eyebrow mb-6">Live Distribution</p>
                  <div className="h-[280px] -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="text" type="category" width={110} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: 13 }}
                          formatter={(v) => [`${v} votes`, '']}
                        />
                        <Bar dataKey="voteCount" radius={[0, 10, 10, 0]} barSize={34}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList
                            content={(props) => (
                              <YouLabel {...props} selectedOption={selectedOption} />
                            )}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            )}

            {/* ════ ZONE 3: AI + EXPLORATION ═══════════════════ */}
            {revealStage === 4 && poll.totalVotes > 0 && (
              <div className={clsx("bg-gradient-to-br rounded-[24px] p-[1.5px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-6 duration-1000", cfg.aiGradient)}>
                <div className="bg-white rounded-[22px] p-8 md:p-10">

                  {/* AI Section Header context */}
                  <p className="section-eyebrow mb-5">{cfg.aiTitle}</p>

                  {/* AI summary or CTA */}
                  {!poll.aiSummary ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 mb-6 bg-slate-50/50">
                      <Sparkles className="w-6 h-6 text-indigo-300 mx-auto mb-3" />
                      {poll.totalVotes < MIN_VOTES_FOR_AI ? (
                        <>
                          <p className="text-sm text-slate-500 mb-2 px-4 font-medium">
                            {isPro ? 'Analysis unlocks with enough responses.' : 'Insight unlocks once the crowd grows.'}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            {poll.totalVotes}/{MIN_VOTES_FOR_AI} votes needed
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-500 mb-4 px-4 font-medium">
                            {isPro ? 'Ready to analyze participant reasoning.' : 'Ready to summarize recent hot takes.'}
                          </p>
                          <button
                            onClick={handleGenerateAISummary}
                            disabled={isGeneratingAI || !poll.recentReasons?.length}
                            className={clsx('text-white text-sm font-bold py-2 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto',
                              isPro ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                            )}
                          >
                            {isGeneratingAI ? <><div className={clsx('w-4 h-4 border-2 border-t-white rounded-full animate-spin', isPro ? 'border-sky-400' : 'border-indigo-400')} /> Analyzing...</> : 'Generate Insight'}
                          </button>
                        </>
                      )}
                      {!poll.recentReasons?.length && poll.totalVotes >= MIN_VOTES_FOR_AI && <p className="text-xs text-rose-500 font-medium mt-3">Needs at least one reason to generate.</p>}
                      {aiError && <p className="text-xs text-rose-500 font-medium mt-3 px-4">{aiError}</p>}
                    </div>
                  ) : (
                    <div className="mb-6 p-1">
                      <p className="text-[15px] leading-relaxed font-medium italic border-l-[3px] border-indigo-400 pl-4 text-slate-700">
                        "{poll.aiSummary}"
                      </p>
                      {/* Creator can refresh analysis when vote count grows meaningfully */}
                      {isCreator && poll.totalVotes >= (poll.aiGeneratedAtVotes || 0) + 5 && (
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={handleGenerateAISummary}
                            disabled={isGeneratingAI}
                            className={clsx('text-xs font-bold py-1.5 px-4 rounded-xl border transition-all disabled:opacity-50', isPro ? 'border-sky-200 text-sky-600 hover:bg-sky-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50')}
                          >
                            {isGeneratingAI ? 'Updating...' : `↺ Refresh Insight (${poll.totalVotes} votes now)`}
                          </button>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Creator only</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reasons Feed */}
                  {poll.recentReasons?.length > 0 ? (
                    <div>
                      <p className="section-eyebrow mb-3 mt-4">
                        {(hasVoted && !isCreator) ? feedHeader() : cfg.feedTitle}
                      </p>
                      <div className="space-y-0">
                        {poll.recentReasons.map((r, idx) => (
                          <div key={idx} className="flex gap-3 items-start py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-all px-2">
                            <MessageSquareQuote className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 font-medium mb-2.5 leading-snug">"{r.text}"</p>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-white border border-slate-200 text-slate-500">
                                  {poll.options.find(o => o.id === r.optionId)?.text}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {cfg.reactions.map(rx => {
                                    const stateKey = `${idx}_${rx.key}`;
                                    const hasReacted = !!myReactions[stateKey];
                                    return (
                                      <button
                                        key={rx.key} type="button"
                                        onClick={() => handleReaction(idx, rx.key)}
                                        title={rx.label}
                                        className={clsx("flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all duration-150",
                                          hasReacted
                                            ? "bg-indigo-50 border-indigo-200"
                                            : "bg-white border-slate-100 hover:bg-slate-100 hover:border-slate-200 hover:scale-110 active:scale-95"
                                        )}
                                      >
                                        <span className="text-base leading-none">{rx.emoji}</span>
                                        <span className={clsx("font-bold text-[11px]", hasReacted ? "text-indigo-500" : "text-slate-400")}>
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
                    <p className="text-center py-3 text-sm text-slate-400 italic">{cfg.reasonsEmpty}</p>
                  )}
                </div>
              </div>
            )}

            {/* ════ IDEA CLOUD ════════════════════════════════ */}
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

          </div>
        )}
      </div>
    </div>
  );
}
