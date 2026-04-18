import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Bookmark, X, BookmarkCheck, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { subscribeToTrendingPolls, deletePoll } from '../services/pollService';
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

      // Proactive cleanup: Delete expired polls from Firebase to save on limits
      data.forEach(p => {
        if (p.selfDestruct && p.expiresAt && p.expiresAt < now) {
          deletePoll(p.id).catch(console.error);
        }
      });

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
      <div className="text-center space-y-6 py-20">
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]">
          What's the <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-500 animate-gradient-x">
            Verdict?
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-xl mx-auto pt-4 font-medium leading-relaxed">
          The social judgment system where your opinion meets the crowd. 
          Discover if you're a visionary or just part of the consensus.
        </p>
        <div className="pt-6">
          <Link 
            to="/create" 
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl hover:bg-primary-600 hover:-translate-y-1 transition-all duration-300"
          >
            Start a Debate <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {polls.map((poll, i) => (
              <Link
                key={poll.id}
                to={`/poll/${poll.id}`}
                className="block group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative overflow-hidden bg-white rounded-[24px] p-7 h-full flex flex-col justify-between transition-all duration-500 transform group-hover:-translate-y-3 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 group-hover:border-primary-200 animate-in fade-in duration-700">
                  {/* Subtle Heat Glow for high scores */}
                  {(poll.trendingScore || 0) > 2 && (
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/10 blur-[40px] rounded-full group-hover:bg-rose-400/20 transition-colors duration-500" />
                  )}
                  
                  <div className="flex-1 pb-6">
                    <div className="mb-4">
                      <ModePill mode={poll.mode} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 line-clamp-3 group-hover:text-primary-600 transition-colors leading-tight tracking-tight">
                      {poll.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-5 mt-auto">
                    <div className="flex items-center gap-1.5 font-bold text-slate-400">
                       <span className="text-slate-800">{(poll.totalVotes || 0).toLocaleString()}</span>
                       <span className="text-[10px] uppercase tracking-wider font-black opacity-50">voters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-500 font-black bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-100/50 shadow-sm transition-all group-hover:scale-110">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs uppercase tracking-tighter">On Fire</span>
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
