import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Send, Flame, Briefcase, CheckCircle2, Lock, Unlock, Timer, Sparkles, Trophy, ShieldCheck, LogIn } from 'lucide-react';
import clsx from 'clsx';
import { createPoll, signInWithGoogle, isUserVerified } from '../services/pollService';

export default function CreatePoll() {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState([{ text: '' }, { text: '' }]);
  const [mode, setMode] = useState('social');
  const [participationMode, setParticipationMode] = useState('open');
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null); 
  const [selfDestructEnabled, setSelfDestructEnabled] = useState(false);
  const [selfDestructMinutes, setSelfDestructMinutes] = useState(1440);
  const [selfDestructCustomMinutes, setSelfDestructCustomMinutes] = useState('');
  const [revealDelayed, setRevealDelayed] = useState(false);
  const [revealMinutes, setRevealMinutes] = useState(60);
  const [revealCustomMinutes, setRevealCustomMinutes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "🔥 Who's the GOAT: Messi or Ronaldo?",
    "📊 Which JS framework wins in 2026?",
    "🍕 Pineapples on pizza: Yes or No?",
    "📈 Remote work vs. Office? (The truth)",
    "🎧 Kendrick or Drake? 🥊",
    "💼 Best tech stack for a $1M SaaS?",
    "🎥 MCU vs. DC: Who's winning?",
    "💻 Tabs or Spaces? (Choose wisely)"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const validOptions = options.map(o => o.text.trim()).filter(Boolean);

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, { text: '' }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
      if (correctOptionIndex === index) setCorrectOptionIndex(null);
      else if (correctOptionIndex > index) setCorrectOptionIndex(correctOptionIndex - 1);
    }
  };

  const handleOptionChange = (index, value) => {
    // Immutable update to prevent React from losing track of state/crashing
    setOptions(prev => prev.map((opt, i) => i === index ? { ...opt, text: value } : opt));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || validOptions.length < 2) return;

    // Force sign-in for professional polls
    if (mode === 'professional' && !isUserVerified()) {
      try {
        await signInWithGoogle();
      } catch (err) {
        setError('Google Sign-in is required to publish professional polls.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalSelfDestructMinutes = selfDestructEnabled ? (selfDestructMinutes === 'custom' ? Number(selfDestructCustomMinutes) : selfDestructMinutes) : null;
      if (selfDestructEnabled && !finalSelfDestructMinutes) { 
        setError('Specify custom self-destruct minutes.'); 
        setIsSubmitting(false); 
        return; 
      }
      
      let finalRevealMinutes = null;
      if (correctOptionIndex !== null && revealDelayed) {
        if (revealMinutes === 'manual') {
          finalRevealMinutes = 'manual';
        } else {
          finalRevealMinutes = revealMinutes === 'custom' ? Number(revealCustomMinutes) : Number(revealMinutes);
        }
      }
      
      // Remap correctOptionIndex from the unfiltered `options` array to `validOptions`
      let validCorrectOptionIndex = null;
      if (correctOptionIndex !== null) {
        const correctText = options[correctOptionIndex]?.text?.trim();
        if (correctText) {
          const mapped = validOptions.indexOf(correctText);
          validCorrectOptionIndex = mapped !== -1 ? mapped : null;
        }
      }

      const pollId = await createPoll(title.trim(), validOptions, mode, validCorrectOptionIndex, participationMode, finalSelfDestructMinutes, finalRevealMinutes);
      navigate(`/poll/${pollId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create poll. Check your connection or Firebase setup.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-6 px-4">
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[32px] p-8 md:p-12 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary-500/10 blur-[80px] rounded-full" />
        
        <div className="flex items-center justify-between mb-2 relative">
          <h1 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tighter leading-tight">
            Start a <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary-400">New Debate</span>
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-900/50 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> Privacy-First
          </div>
        </div>
        <p className="text-slate-400 font-medium mb-10 relative">
          Define the options, set the rules, and let the crowd decide. 
          <span className="text-slate-500 block sm:inline sm:ml-1 font-bold">Anonymous for fun, verified for work.</span>
        </p>

        {error && (
          <div className="mb-8 p-5 bg-rose-950/40 text-rose-400 rounded-2xl border-2 border-rose-900/50 font-bold text-sm reveal-dramatic">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10 relative">
          <div>
            <label htmlFor="title" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 ml-1">
              The Question
            </label>
            <input
              id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              className="w-full px-7 py-6 rounded-[24px] border-2 border-slate-800 focus:border-primary-500 focus:ring-0 outline-none transition-all shadow-inner bg-slate-950/50 text-slate-100 text-xl font-bold placeholder-slate-700"
              required
            />
          </div>

          <div className="space-y-5">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">The Options</label>
            <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                  <input
                    type="text" value={option.text} onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-6 py-5 rounded-[20px] border-2 border-slate-800 focus:border-primary-400 focus:ring-0 outline-none transition shadow-inner bg-slate-950/30 font-bold text-slate-200 placeholder-slate-700"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button" onClick={() => handleRemoveOption(index)}
                      className="p-4 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button" onClick={handleAddOption}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary-400 hover:bg-primary-500/10 px-6 py-4 rounded-2xl transition-all w-fit border-2 border-primary-900/20"
              >
                <Plus className="w-5 h-5" /> Add Option
              </button>
            )}
          </div>

          {validOptions.length >= 2 && (
            <div className="pt-2 border-t border-white/5 mt-10 pt-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/20">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <label className="text-sm font-black text-slate-100 uppercase tracking-wider">Quiz Mode</label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-0.5">Mark the hidden truth</p>
                  </div>
                </div>
                {correctOptionIndex !== null && (
                  <button
                    type="button" onClick={() => setCorrectOptionIndex(null)}
                    className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                  >
                    Disable Quiz
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((option, index) => {
                  const text = option.text.trim();
                  if (!text) return null;
                  const isSelected = correctOptionIndex === index;
                  return (
                    <button
                      key={index} type="button" onClick={() => setCorrectOptionIndex(isSelected ? null : index)}
                      className={clsx(
                        "flex items-center gap-3 px-5 py-5 rounded-[20px] border-2 text-left text-sm font-black transition-all duration-200",
                        isSelected
                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                          : "border-slate-800 bg-slate-950/20 text-slate-600 hover:border-slate-700 hover:bg-slate-950/40"
                      )}
                    >
                      <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-700"
                      )}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                      </div>
                      <span className="truncate">{text}</span>
                    </button>
                  );
                })}
              </div>

              {correctOptionIndex !== null && (
                <div className="mt-8 p-8 bg-slate-950 rounded-[28px] animate-in zoom-in-95 duration-300 shadow-2xl relative overflow-hidden border border-emerald-500/20">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-primary-500 opacity-50" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Sparkles className="w-6 h-6 text-emerald-400" />
                      <div>
                        <label className="text-sm font-black text-slate-100 uppercase tracking-wider">Delayed Reveal</label>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-0.5">Build maximum tension</p>
                      </div>
                    </div>
                    <button
                      type="button" onClick={() => setRevealDelayed(!revealDelayed)}
                      className={clsx(
                        "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none",
                        revealDelayed ? "bg-emerald-500" : "bg-slate-800"
                      )}
                    >
                      <span className={clsx("inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md", revealDelayed ? "translate-x-7" : "translate-x-1")} />
                    </button>
                  </div>
                  
                  {revealDelayed && (
                    <div className="space-y-6 pt-2 animate-in fade-in duration-500">
                      <div className="flex flex-wrap gap-2">
                        {[5, 15, 60, 360, 1440].map((v) => (
                          <button
                            key={v} type="button" onClick={() => setRevealMinutes(v)}
                            className={clsx(
                              "px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                              revealMinutes === v 
                                ? "bg-emerald-500 border-emerald-400 text-white" 
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            )}
                          >
                            {v >= 60 ? `${v/60}h` : `${v}m`}
                          </button>
                        ))}
                        <button
                          type="button" onClick={() => setRevealMinutes('custom')}
                          className={clsx(
                            "px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                            revealMinutes === 'custom' ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          Custom
                        </button>
                        <button
                          type="button" onClick={() => setRevealMinutes('manual')}
                          className={clsx(
                            "px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                            revealMinutes === 'manual' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          Manual Reveal 🥁
                        </button>
                      </div>

                      {revealMinutes === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Hours</label>
                            <input 
                              type="number" min="0" max="168" value={Math.floor(Number(revealCustomMinutes || 0) / 60)} 
                              onChange={e => {
                                const h = Math.max(0, parseInt(e.target.value) || 0);
                                const m = Number(revealCustomMinutes || 0) % 60;
                                setRevealCustomMinutes((h * 60 + m).toString());
                              }}
                              className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl px-5 py-3 text-white font-bold focus:border-emerald-500 outline-none shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Minutes</label>
                            <input 
                              type="number" min="0" max="59" value={Number(revealCustomMinutes || 0) % 60} 
                              onChange={e => {
                                const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                const h = Math.floor(Number(revealCustomMinutes || 0) / 60);
                                setRevealCustomMinutes((h * 60 + m).toString());
                              }}
                              className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl px-5 py-3 text-white font-bold focus:border-emerald-500 outline-none shadow-inner"
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider leading-relaxed">
                        {revealMinutes === 'manual' 
                          ? "Answer stays hidden until you manually click reveal." 
                          : "Answer reveals automatically at the set time, but you can still reveal it early from your dashboard."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 ml-1 text-center md:text-left">Environment</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button" onClick={() => setMode('social')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-300",
                    mode === 'social' ? "border-orange-500 bg-orange-950/40 text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.15)]" : "border-slate-800 bg-slate-950/20 text-slate-600 hover:border-slate-700 hover:bg-slate-950/40"
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all", mode === 'social' ? "bg-orange-500 text-white scale-110 shadow-lg" : "bg-slate-900 text-slate-700")}>🔥</div>
                  Social
                </button>
                <button
                  type="button" onClick={() => setMode('professional')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-300",
                    mode === 'professional' ? "border-sky-500 bg-sky-950/40 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.15)]" : "border-slate-800 bg-slate-950/20 text-slate-600 hover:border-slate-700 hover:bg-slate-950/40"
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all", mode === 'professional' ? "bg-sky-500 text-white scale-110 shadow-lg" : "bg-slate-900 text-slate-700")}>📊</div>
                  Professional
                </button>
              </div>
              {mode === 'professional' && (
                <p className="mt-4 text-[10px] text-sky-500 font-bold uppercase tracking-wider text-center animate-in fade-in slide-in-from-top-1">
                  🔒 Identity visible to participants
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 ml-1 text-center md:text-left">Participation</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button" onClick={() => setParticipationMode('open')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-300",
                    participationMode === 'open' ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "border-slate-800 bg-slate-950/20 text-slate-600 hover:border-slate-700 hover:bg-slate-950/40"
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all", participationMode === 'open' ? "bg-emerald-500 text-white scale-110 shadow-lg" : "bg-slate-900 text-slate-700")}>🔓</div>
                  Open
                </button>
                <button
                  type="button" onClick={() => setParticipationMode('structured')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all duration-300",
                    participationMode === 'structured' ? "border-indigo-500 bg-indigo-950/40 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.15)]" : "border-slate-800 bg-slate-950/20 text-slate-600 hover:border-slate-700 hover:bg-slate-950/40"
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all", participationMode === 'structured' ? "bg-indigo-500 text-white scale-110 shadow-lg" : "bg-slate-900 text-slate-700")}>🔒</div>
                  Structured
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 mt-10">
            <div className="flex items-center justify-between mb-8 mt-10">
              <div className="flex items-center gap-4">
                <div className="bg-rose-500/20 p-3 rounded-2xl border border-rose-500/20">
                  <Timer className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <label className="text-sm font-black text-slate-100 uppercase tracking-wider">Self-Destruct</label>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-0.5">Poll vanishes from Firebase</p>
                </div>
              </div>
              <button
                type="button" onClick={() => setSelfDestructEnabled(!selfDestructEnabled)}
                className={clsx(
                  "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner",
                  selfDestructEnabled ? "bg-rose-500" : "bg-slate-800"
                )}
              >
                <span className={clsx("inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md", selfDestructEnabled ? "translate-x-7" : "translate-x-1")} />
              </button>
            </div>
            
            {selfDestructEnabled && (
              <div className="p-8 bg-rose-950/20 rounded-[28px] border-2 border-rose-900/20 animate-in zoom-in-95 duration-300">
                <p className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest mb-6 text-center">Live Duration 💣</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[5, 15, 60, 360, 1440].map((m) => (
                    <button
                      key={m} type="button" onClick={() => setSelfDestructMinutes(m)}
                      className={clsx(
                        "px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                        selfDestructMinutes === m
                          ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/40"
                          : "bg-slate-900 border-rose-900/20 text-rose-600 hover:border-rose-900/40"
                      )}
                    >
                      {m >= 60 ? `${m/60}h` : `${m}m`}
                    </button>
                  ))}
                  <button
                    type="button" onClick={() => setSelfDestructMinutes('custom')}
                    className={clsx(
                      "px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                      selfDestructMinutes === 'custom' ? "bg-rose-600 border-rose-500 text-white shadow-lg" : "bg-slate-900 border-rose-900/20 text-rose-600 hover:border-rose-900/40"
                    )}
                  >
                    Custom
                  </button>
                </div>
                {selfDestructMinutes === 'custom' && (
                  <div className="flex items-center gap-4 mt-6 max-w-[200px] mx-auto animate-in slide-in-from-top-1">
                     <input 
                       type="number" min="1" max="10000" value={selfDestructCustomMinutes} 
                       onChange={e => setSelfDestructCustomMinutes(e.target.value)} 
                       placeholder="Mins" 
                       className="w-full px-5 py-3 rounded-xl border-2 border-rose-900/30 focus:border-rose-500 focus:ring-0 outline-none text-center font-black text-rose-400 bg-slate-900 shadow-inner" 
                     />
                     <span className="text-[10px] font-black uppercase text-rose-700">mins</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-8">
            <button
              type="submit" disabled={isSubmitting}
              className={clsx(
                "w-full flex items-center justify-center gap-4 font-black text-xl py-6 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                mode === 'professional' && !isUserVerified() 
                  ? "bg-sky-600 text-white hover:bg-sky-500" 
                  : "bg-slate-100 text-slate-950 hover:bg-emerald-500 hover:text-white"
              )}
            >
              {isSubmitting ? (
                <div className="w-8 h-8 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                mode === 'professional' && !isUserVerified() ? (
                  <><LogIn className="w-6 h-6" /> Sign in & Publish</>
                ) : (
                  <><Send className="w-6 h-6" /> Publish Debate</>
                )
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
