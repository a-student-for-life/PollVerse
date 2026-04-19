import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Bookmark, X, BookmarkCheck, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { subscribeToTrendingPolls } from '../services/pollService';
import { getRecentPolls, getSavedPolls, removeSavedPoll, clearRecentPolls } from '../utils/pollHistory';

// ─── Small helper: relative time label ───────────────────────────────────────
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Mode pill ────────────────────────────────────────────────────────────────
function ModePill({ mode }) {
  const isPro = mode === 'professional';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
      isPro ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
    }`}>
      {isPro ? '📊 Pro' : '🔥 Social'}
    </span>
  );
}

// ─── Minimal local-history card ───────────────────────────────────────────────
function HistoryCard({ poll, onRemove, showTime, timeKey }) {
  return (
    <div className="group relative flex items-center gap-3 bg-slate-900/40 hover:bg-slate-900/60 rounded-[20px] px-4 py-3 border border-white/5 hover:border-primary-500/30 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-left-2 duration-300">
      <Link to={`/poll/${poll.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-200 truncate group-hover:text-primary-400 transition-colors">
          {poll.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <ModePill mode={poll.mode} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {poll.totalVotes || 0} votes · {timeAgo(poll[timeKey])}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Link
          to={`/poll/${poll.id}`}
          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
          title="Open poll"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        {onRemove && (
          <button
            onClick={(e) => { e.preventDefault(); onRemove(poll.id); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mode Explorer ───────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'social-open',
    mode: 'Social', modeIcon: '🔥', modeClass: 'text-orange-400',
    part: 'Open', partIcon: '🔓',
    tagline: 'Drop hot takes & browse freely',
    features: [
      { label: '100% anonymous', ok: true },
      { label: 'Idea cloud on', ok: true },
      { label: 'Browse without voting', ok: true },
    ],
    hoverCls: 'hover:border-orange-500/40 hover:shadow-[0_8px_40px_rgba(249,115,22,0.12)]',
  },
  {
    id: 'pro-open',
    mode: 'Professional', modeIcon: '📊', modeClass: 'text-sky-400',
    part: 'Open', partIcon: '🔓',
    tagline: 'Verified insights, open results',
    features: [
      { label: 'Verified identity required', ok: false },
      { label: 'Idea cloud on', ok: true },
      { label: 'Browse without voting', ok: true },
    ],
    hoverCls: 'hover:border-sky-500/40 hover:shadow-[0_8px_40px_rgba(14,165,233,0.12)]',
  },
  {
    id: 'social-structured',
    mode: 'Social', modeIcon: '🔥', modeClass: 'text-orange-400',
    part: 'Structured', partIcon: '🔒',
    tagline: 'Vote first, crowd unlocked after',
    features: [
      { label: '100% anonymous', ok: true },
      { label: 'Idea cloud on', ok: true },
      { label: 'Vote required to view', ok: false },
    ],
    hoverCls: 'hover:border-orange-500/40 hover:shadow-[0_8px_40px_rgba(249,115,22,0.12)]',
  },
  {
    id: 'pro-structured',
    mode: 'Professional', modeIcon: '📊', modeClass: 'text-sky-400',
    part: 'Structured', partIcon: '🔒',
    tagline: 'Gold standard. No shortcuts.',
    features: [
      { label: 'Verified identity required', ok: false },
      { label: 'Community ideas off', ok: false },
      { label: 'Vote required to view', ok: false },
    ],
    hoverCls: 'hover:border-indigo-500/40 hover:shadow-[0_8px_40px_rgba(99,102,241,0.15)]',
    special: true,
  },
];

function ModeCard({ config, cardIndex }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[20px] p-4 sm:p-5 border border-white/5 transition-all duration-300 ${config.hoverCls} ${config.special ? 'bg-indigo-950/30' : 'bg-slate-900/40'}`}
      style={{
        opacity: 0,
        animation: `fadeSlideUp 0.5s ease forwards`,
        animationDelay: `${cardIndex * 90}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-black uppercase tracking-widest ${config.modeClass}`}>
          {config.modeIcon} {config.mode}
        </span>
        <span className="text-[9px] font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full whitespace-nowrap">
          {config.partIcon} {config.part}
        </span>
      </div>

      <p className="text-xs sm:text-sm font-bold text-slate-200 mb-3 leading-tight">{config.tagline}</p>

      <div className="space-y-1.5">
        {config.features.map((f, fi) => (
          <div
            key={fi}
            className="flex items-center gap-2"
            style={{
              opacity: 0,
              animation: `fadeSlideLeft 0.3s ease forwards`,
              animationDelay: `${cardIndex * 90 + 240 + fi * 60}ms`,
            }}
          >
            <span className={`text-xs font-black w-3 shrink-0 leading-none ${f.ok ? 'text-emerald-400' : 'text-amber-500/70'}`}>
              {f.ok ? '✓' : '—'}
            </span>
            <span className={`text-[11px] font-semibold leading-none ${f.ok ? 'text-slate-200' : 'text-amber-400/60'}`}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      {config.special && (
        <div className="mt-3 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
          ⭐ Most rigorous
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [polls, setPolls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [recentPolls, setRecent]    = useState([]);
  const [savedPolls, setSaved]      = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToTrendingPolls(10, (data) => {
      const now = Date.now();
      // Filter expired polls visually; actual deletion happens when someone visits PollView
      const filtered = data
        .filter(p => !p.selfDestruct || !p.expiresAt || p.expiresAt > now)
        .slice(0, 6);
      setPolls(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load localStorage lists once on mount
  useEffect(() => {
    setRecent(getRecentPolls());
    setSaved(getSavedPolls());
  }, []);

  // Re-read on window focus so data is fresh when user returns from a poll
  useEffect(() => {
    const onFocus = () => {
      setRecent(getRecentPolls());
      setSaved(getSavedPolls());
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleRemoveSaved = (pollId) => {
    removeSavedPoll(pollId);
    setSaved(getSavedPolls());
  };

  const handleClearRecent = () => {
    clearRecentPolls();
    setRecent([]);
  };

  return (
    <div className="space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <div className="text-center space-y-6 py-20 relative">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-100 leading-[0.85]">
          What's the <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-primary-400 to-indigo-400 animate-gradient-x drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            Verdict?
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto pt-6 font-medium leading-relaxed px-4">
          The ultimate social judgment system. Test your knowledge in <span className="text-emerald-400 font-bold">Quizzes</span>, 
          drop <span className="font-black uppercase tracking-tighter text-indigo-400">Hot Takes</span>, and see if your intuition 
          matches the crowd — with modes for every level of privacy.
        </p>

        {/* ─── Modes Explorer ─── */}
        <div className="pt-16 max-w-3xl mx-auto px-4">
          <p className="section-eyebrow text-center mb-2">Four ways to poll</p>
          <p className="text-slate-500 text-sm text-center mb-8 font-medium">Mix mode &amp; participation to match your use case</p>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((config, i) => (
              <ModeCard key={config.id} config={config} cardIndex={i} />
            ))}
          </div>
        </div>

        <div className="pt-12">
          <Link 
            to="/create" 
            className="inline-flex items-center gap-3 bg-slate-100 text-slate-950 px-10 py-5 rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:bg-emerald-500 hover:text-white hover:-translate-y-2 hover:scale-105 transition-all duration-300 group"
          >
            Ignite a Debate <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ─── Recent + Saved side-by-side (only if data exists) ───── */}
      {(recentPolls.length > 0 || savedPolls.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Recent Polls */}
          {recentPolls.length > 0 && (
            <section className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-6 border border-white/5 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="bg-violet-500/20 p-2 rounded-xl border border-violet-500/20">
                    <Clock className="w-4 h-4 text-violet-400" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Recently Viewed</h2>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-3">
                {recentPolls.slice(0, 5).map(poll => (
                  <HistoryCard
                    key={poll.id}
                    poll={poll}
                    timeKey="lastViewedAt"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Saved Polls */}
          {savedPolls.length > 0 && (
            <section className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-6 border border-white/5 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/20">
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Saved Polls</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{savedPolls.length} saved</span>
              </div>
              <div className="space-y-3">
                {savedPolls.slice(0, 5).map(poll => (
                  <HistoryCard
                    key={poll.id}
                    poll={poll}
                    onRemove={handleRemoveSaved}
                    timeKey="savedAt"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── Trending Polls ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-rose-500/20 p-2 rounded-xl border border-rose-500/20">
            <TrendingUp className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Trending Now</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
               <div key={i} className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-8 h-48 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 backdrop-blur-xl rounded-[24px] border border-white/5 shadow-2xl">
            <div className="text-5xl mb-4">🗳️</div>
            <p className="text-slate-300 font-black text-xl tracking-tight">No polls yet.</p>
            <p className="text-slate-500 text-sm mt-2 font-medium">Be the first to ignite a debate!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {polls.map((poll, i) => (
              <Link
                key={poll.id}
                to={`/poll/${poll.id}`}
                className="block group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl rounded-[28px] p-8 h-full flex flex-col justify-between transition-all duration-500 transform group-hover:-translate-y-3 group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.4)] border border-white/5 group-hover:border-primary-500/40 animate-in fade-in duration-700">
                  {/* Subtle Heat Glow for high scores */}
                  {(poll.trendingScore || 0) > 2 && (
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/10 blur-[40px] rounded-full group-hover:bg-rose-400/20 transition-colors duration-500" />
                  )}
                  
                  <div className="flex-1 pb-8">
                    <div className="mb-5">
                      <ModePill mode={poll.mode} />
                    </div>
                    <h3 className="text-2xl font-black text-white line-clamp-3 group-hover:text-primary-400 transition-colors leading-tight tracking-tighter">
                      {poll.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-white/5 pt-6 mt-auto">
                    <div className="flex items-center gap-2 font-black text-slate-500">
                       <span className="text-slate-200">{(poll.totalVotes || 0).toLocaleString()}</span>
                       <span className="text-[10px] uppercase tracking-[0.15em] opacity-50">voters</span>
                    </div>
                    {(poll.trendingScore || 0) > 1 ? (
                      <div className="flex items-center gap-2 text-rose-400 font-black bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 shadow-sm transition-all group-hover:scale-110">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-widest">On Fire</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 font-black bg-slate-900/60 px-4 py-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-widest">Trending</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
