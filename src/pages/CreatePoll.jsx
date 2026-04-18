import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Send, Flame, Briefcase, CheckCircle2, Lock, Unlock, Timer, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { createPoll } from '../services/pollService';

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
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || validOptions.length < 2) return;
    setIsSubmitting(true);
    try {
      const finalSelfDestructMinutes = selfDestructEnabled ? (selfDestructMinutes === 'custom' ? Number(selfDestructCustomMinutes) : selfDestructMinutes) : null;
      if (selfDestructEnabled && !finalSelfDestructMinutes) { setError('Specify custom self-destruct minutes.'); setIsSubmitting(false); return; }
      
      let finalRevealMinutes = null;
      if (correctOptionIndex !== null && revealDelayed) {
        if (revealMinutes === 'manual') {
          finalRevealMinutes = 'manual';
        } else {
          finalRevealMinutes = revealMinutes === 'custom' ? Number(revealCustomMinutes) : Number(revealMinutes);
        }
      }
      
      const pollId = await createPoll(title.trim(), validOptions, mode, correctOptionIndex, participationMode, finalSelfDestructMinutes, finalRevealMinutes);
      navigate(`/poll/${pollId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create poll. Check your connection or Firebase setup.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      <div className="bg-white rounded-[24px] p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2 leading-tight">
          Start a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">New Debate</span>
        </h1>
        <p className="text-slate-400 font-medium mb-10">Define the options, set the rules, and let the crowd decide.</p>

        {error && (
          <div className="mb-8 p-5 bg-rose-50 text-rose-700 rounded-2xl border-2 border-rose-100 font-bold text-sm reveal-dramatic">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label htmlFor="title" className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-3 ml-1">
              The Question
            </label>
            <input
              id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              className="w-full px-6 py-5 rounded-[20px] border-2 border-slate-100 focus:border-primary-500 focus:ring-0 outline-none transition-all shadow-sm bg-slate-50/30 text-xl font-bold placeholder-slate-300"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-3 ml-1">The Options</label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                  <input
                    type="text" value={option.text} onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-6 py-4 rounded-[18px] border-2 border-slate-100 focus:border-primary-400 focus:ring-0 outline-none transition shadow-sm bg-white font-semibold text-slate-700"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button" onClick={() => handleRemoveOption(index)}
                      className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
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
                className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-primary-600 hover:bg-primary-50 px-5 py-3.5 rounded-2xl transition-all w-fit border-2 border-transparent hover:border-primary-100"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            )}
          </div>

          {validOptions.length >= 2 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                  Secret Correct Answer <span className="text-slate-300 font-bold ml-1 normal-case tracking-normal">(Optional)</span>
                </label>
                {correctOptionIndex !== null && (
                  <button
                    type="button" onClick={() => setCorrectOptionIndex(null)}
                    className="text-[11px] font-black uppercase tracking-wider text-rose-500 hover:underline"
                  >
                    Remove
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
                        "flex items-center gap-3 px-5 py-4 rounded-[18px] border-2 text-left text-sm font-bold transition-all duration-200",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md"
                          : "border-slate-50 bg-slate-50/50 text-slate-500 hover:border-emerald-200 hover:bg-white"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-200"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="truncate">{text}</span>
                    </button>
                  );
                })}
              </div>

              {correctOptionIndex !== null && (
                <div className="mt-8 p-6 bg-slate-900 rounded-[24px] animate-in zoom-in-95 duration-300 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-primary-500 opacity-50" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <div>
                        <label className="text-sm font-black text-white uppercase tracking-wider">Delayed Answer Reveal</label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">Build maximum tension</p>
                      </div>
                    </div>
                    <button
                      type="button" onClick={() => setRevealDelayed(!revealDelayed)}
                      className={clsx(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none",
                        revealDelayed ? "bg-emerald-500" : "bg-slate-700"
                      )}
                    >
                      <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white transition-transform", revealDelayed ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                  
                  {revealDelayed && (
                    <div className="space-y-6 pt-2 animate-in fade-in duration-500">
                      <div className="flex flex-wrap gap-2">
                        {[5, 15, 60, 360, 1440].map((v) => (
                          <button
                            key={v} type="button" onClick={() => setRevealMinutes(v)}
                            className={clsx(
                              "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                              revealMinutes === v 
                                ? "bg-emerald-500 border-emerald-400 text-white" 
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                            )}
                          >
                            {v >= 60 ? `${v/60}h` : `${v}m`}
                          </button>
                        ))}
                        <button
                          type="button" onClick={() => setRevealMinutes('custom')}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                            revealMinutes === 'custom' ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          Custom
                        </button>
                        <button
                          type="button" onClick={() => setRevealMinutes('manual')}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                            revealMinutes === 'manual' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
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
                              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2 text-white font-bold focus:border-emerald-500 outline-none"
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
                              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2 text-white font-bold focus:border-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
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
              <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-4 ml-1 text-center md:text-left">Environment</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => setMode('social')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[20px] border-2 font-black text-[11px] uppercase tracking-wider transition-all duration-300",
                    mode === 'social' ? "border-orange-500 bg-orange-50/50 text-orange-700 shadow-lg" : "border-slate-50 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-100"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all", mode === 'social' ? "bg-orange-500 text-white scale-110" : "bg-slate-100 text-slate-300")}>🔥</div>
                  Social
                </button>
                <button
                  type="button" onClick={() => setMode('professional')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[20px] border-2 font-black text-[11px] uppercase tracking-wider transition-all duration-300",
                    mode === 'professional' ? "border-sky-500 bg-sky-50/50 text-sky-700 shadow-lg" : "border-slate-50 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-100"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all", mode === 'professional' ? "bg-sky-500 text-white scale-110" : "bg-slate-100 text-slate-300")}>📊</div>
                  Professional
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-4 ml-1 text-center md:text-left">Participation</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => setParticipationMode('open')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[20px] border-2 font-black text-[11px] uppercase tracking-wider transition-all duration-300",
                    participationMode === 'open' ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-lg" : "border-slate-50 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-100"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all", participationMode === 'open' ? "bg-emerald-500 text-white scale-110" : "bg-slate-100 text-slate-300")}>🔓</div>
                  Open
                </button>
                <button
                  type="button" onClick={() => setParticipationMode('structured')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-[20px] border-2 font-black text-[11px] uppercase tracking-wider transition-all duration-300",
                    participationMode === 'structured' ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-lg" : "border-slate-50 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-100"
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all", participationMode === 'structured' ? "bg-indigo-500 text-white scale-110" : "bg-slate-100 text-slate-300")}>🔒</div>
                  Structured
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-50 mt-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-rose-100 p-2 rounded-xl">
                  <Timer className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <label className="text-sm font-black text-slate-800 uppercase tracking-wider">Self-Destruct</label>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">Poll vanishes from Firebase</p>
                </div>
              </div>
              <button
                type="button" onClick={() => setSelfDestructEnabled(!selfDestructEnabled)}
                className={clsx(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-sm",
                  selfDestructEnabled ? "bg-rose-500" : "bg-slate-200"
                )}
              >
                <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md", selfDestructEnabled ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
            
            {selfDestructEnabled && (
              <div className="p-6 bg-rose-50/50 rounded-[24px] border-2 border-rose-100 animate-in zoom-in-95 duration-300">
                <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-4 text-center">Live Duration 💣</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[5, 15, 60, 360, 1440].map((m) => (
                    <button
                      key={m} type="button" onClick={() => setSelfDestructMinutes(m)}
                      className={clsx(
                        "px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                        selfDestructMinutes === m
                          ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-200"
                          : "bg-white border-rose-100 text-rose-400 hover:border-rose-200"
                      )}
                    >
                      {m >= 60 ? `${m/60}h` : `${m}m`}
                    </button>
                  ))}
                  <button
                    type="button" onClick={() => setSelfDestructMinutes('custom')}
                    className={clsx(
                      "px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2",
                      selfDestructMinutes === 'custom' ? "bg-rose-600 border-rose-500 text-white shadow-lg" : "bg-white border-rose-100 text-rose-400 hover:border-rose-200"
                    )}
                  >
                    Custom
                  </button>
                </div>
                {selfDestructMinutes === 'custom' && (
                  <div className="flex items-center gap-3 mt-4 max-w-[200px] mx-auto animate-in slide-in-from-top-1">
                     <input 
                       type="number" min="1" max="10000" value={selfDestructCustomMinutes} 
                       onChange={e => setSelfDestructCustomMinutes(e.target.value)} 
                       placeholder="Mins" 
                       className="w-full px-4 py-2 rounded-xl border-2 border-rose-100 focus:border-rose-400 focus:ring-0 text-center font-bold text-rose-700" 
                     />
                     <span className="text-[10px] font-black uppercase text-rose-300">mins</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-black text-xl py-6 rounded-[24px] shadow-2xl hover:bg-primary-600 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send className="w-6 h-6" /> Publish Poll</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
