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
    <div className="group relative flex items-center gap-3 bg-white hover:bg-slate-50 rounded-[20px] px-4 py-3 border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-left-2 duration-300">
      <Link to={`/poll/${poll.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary-600 transition-colors">
          {poll.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <ModePill mode={poll.mode} />
          <span className="text-[11px] text-slate-400">
            {poll.totalVotes || 0} votes · {timeAgo(poll[timeKey])}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Link
          to={`/poll/${poll.id}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="Open poll"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        {onRemove && (
          <button
            onClick={(e) => { e.preventDefault(); onRemove(poll.id); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
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
    const unsubscribe = subscribeToTrendingPolls(15, (data) => {
      // Filter out polls that have self-destructed (using local time for efficiency)
      const now = Date.now();
      const filtered = data
        .filter(p => !p.selfDestruct || !p.expiresAt || p.expiresAt > now)
        .slice(0, 6); // Keep the top 6 trending
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
      <div className="text-center space-y-4 py-16">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Capture opinions in <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-indigo-600">
            real-time.
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto pt-2">
          Create dynamic polls with AI-powered consensus insights. Fast, anonymous, and globally available.
        </p>
      </div>

      {/* ─── Recent + Saved side-by-side (only if data exists) ───── */}
      {(recentPolls.length > 0 || savedPolls.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Recent Polls */}
          {recentPolls.length > 0 && (
            <section className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-violet-100 p-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-violet-500" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800">Recently Viewed</h2>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-slate-400 hover:text-rose-500 font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
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
            <section className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                    <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800">Saved Polls</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">{savedPolls.length} saved</span>
              </div>
              <div className="space-y-2">
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
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-rose-100 p-1.5 rounded-lg">
            <TrendingUp className="w-5 h-5 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Trending Now</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
               <div key={i} className="glass-panel rounded-[20px] p-6 h-40 border border-white/40 bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[20px] border border-slate-100 shadow-sm">
            <div className="text-4xl mb-3">🗳️</div>
            <p className="text-slate-600 font-semibold">No polls yet.</p>
            <p className="text-slate-400 text-sm mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polls.map((poll, i) => (
              <Link
                key={poll.id}
                to={`/poll/${poll.id}`}
                className="block group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="glass-panel rounded-[20px] p-6 h-full flex flex-col justify-between transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-2xl border border-white/40 group-hover:border-primary-100 bg-white/60 animate-in fade-in duration-500">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-3 mb-3 group-hover:text-primary-600 transition-colors leading-snug">
                      {poll.title}
                    </h3>
                    <ModePill mode={poll.mode} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-4 mt-4">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-medium">
                       {poll.totalVotes || 0} <span className="font-normal text-slate-500">votes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-500 font-semibold bg-rose-50 px-3 py-1 rounded-full">
                      <TrendingUp className="w-4 h-4" />
                      <span>{(poll.trendingScore || 0).toFixed(1)}</span>
                    </div>
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
