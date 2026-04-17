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
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-[20px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 mb-8">
          Create a New Poll
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
              What do you want to ask?
            </label>
            <input
              id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              className="w-full px-5 py-4 rounded-[16px] border border-slate-200 focus:border-primary-500 focus:ring-0 outline-none transition shadow-sm bg-white/70 text-lg placeholder-slate-400/50"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Options</label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text" value={option.text} onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-5 py-3 rounded-[16px] border border-slate-200 focus:border-primary-500 focus:ring-0 outline-none transition shadow-sm bg-white/70"
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button" onClick={() => handleRemoveOption(index)}
                    className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                type="button" onClick={handleAddOption}
                className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-4 py-3 rounded-xl transition-all w-fit"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            )}
          </div>

          {validOptions.length >= 2 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Correct Answer <span className="text-slate-400 font-normal ml-1">(Optional — for quizzes)</span>
                </label>
                {correctOptionIndex !== null && (
                  <button
                    type="button" onClick={() => setCorrectOptionIndex(null)}
                    className="text-xs text-slate-400 hover:text-rose-500 font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((option, index) => {
                  const text = option.text.trim();
                  if (!text) return null;
                  const isSelected = correctOptionIndex === index;
                  return (
                    <button
                      key={index} type="button" onClick={() => setCorrectOptionIndex(isSelected ? null : index)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-[16px] border text-left text-sm font-medium transition-all duration-200",
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-500/10"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      {text}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2 pl-1">
                If set, participants will see whether they got it right after voting.
              </p>

              {correctOptionIndex !== null && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-[20px] animate-in fade-in duration-300 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <label className="text-sm font-bold text-slate-700">Delayed Answer Reveal</label>
                    </div>
                    <button
                      type="button" onClick={() => setRevealDelayed(!revealDelayed)}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        revealDelayed ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    >
                      <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", revealDelayed ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                  
                  {revealDelayed ? (
                    <div className="space-y-4 pt-1">
                      <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                        Build tension by choosing when the secret answer comes out.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[5, 15, 30, 60, 360].map((v) => (
                          <button
                            key={v} type="button" onClick={() => setRevealMinutes(v)}
                            className={clsx(
                              "px-3 py-1.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wide transition-all border",
                              revealMinutes === v 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            )}
                          >
                            {v >= 60 ? `${v/60}h later` : `${v}m later`}
                          </button>
                        ))}
                        <button
                          type="button" onClick={() => setRevealMinutes('custom')}
                          className={clsx(
                            "px-3 py-1.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wide transition-all border",
                            revealMinutes === 'custom' ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          Custom
                        </button>
                        <button
                          type="button" onClick={() => setRevealMinutes('manual')}
                          className={clsx(
                            "px-3 py-1.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wide transition-all border",
                            revealMinutes === 'manual' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          Manual Reveal 🥁
                        </button>
                      </div>
                      {revealMinutes === 'custom' && (
                        <div className="flex items-center gap-3 mt-1 animate-in slide-in-from-top-1 duration-200">
                          <input 
                            type="number" min="1" max="1440" value={revealCustomMinutes} 
                            onChange={e => setRevealCustomMinutes(e.target.value)} 
                            placeholder="Minutes from now"
                            className="w-40 px-3 py-1.5 rounded-[12px] border border-slate-200 focus:border-emerald-400 focus:ring-0 text-sm" 
                          />
                          <span className="text-sm text-slate-500 font-medium">minutes delay</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium">Answer reveals immediately after participant votes.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Environment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button" onClick={() => setMode('social')}
                className={clsx(
                  "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-[16px] border font-semibold text-sm transition-all duration-200",
                  mode === 'social' ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/10" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Flame className={clsx("w-4 h-4", mode === 'social' ? "text-orange-500" : "text-slate-400")} />
                Social 🔥
              </button>
              <button
                type="button" onClick={() => setMode('professional')}
                className={clsx(
                  "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-[16px] border font-semibold text-sm transition-all duration-200",
                  mode === 'professional' ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm shadow-sky-500/10" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Briefcase className={clsx("w-4 h-4", mode === 'professional' ? "text-sky-500" : "text-slate-400")} />
                Professional 📊
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Participation Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button" onClick={() => setParticipationMode('open')}
                className={clsx(
                  "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-[16px] border font-semibold text-sm transition-all duration-200",
                  participationMode === 'open' ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/10" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Unlock className={clsx("w-4 h-4", participationMode === 'open' ? "text-emerald-500" : "text-slate-400")} />
                Open
              </button>
              <button
                type="button" onClick={() => setParticipationMode('structured')}
                className={clsx(
                  "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-[16px] border font-semibold text-sm transition-all duration-200",
                  participationMode === 'structured' ? "border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-500/10" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Lock className={clsx("w-4 h-4", participationMode === 'structured' ? "text-indigo-500" : "text-slate-400")} />
                Structured
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-slate-700">Self-Destruct Poll</label>
              <button
                type="button" onClick={() => setSelfDestructEnabled(!selfDestructEnabled)}
                className={clsx(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  selfDestructEnabled ? "bg-rose-500" : "bg-slate-200"
                )}
              >
                <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", selfDestructEnabled ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
            {selfDestructEnabled && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-[16px] animate-in fade-in duration-300">
                <div className="flex flex-wrap gap-2">
                  {[5, 15, 60, 360, 1440].map((m) => (
                    <button
                      key={m} type="button" onClick={() => setSelfDestructMinutes(m)}
                      className={clsx(
                        "px-3 py-1.5 rounded-[12px] text-sm font-medium transition-colors border",
                        selfDestructMinutes === m
                          ? "bg-rose-100 border-rose-200 text-rose-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {m >= 60 ? `${m/60} ${m === 60 ? 'Hour' : 'Hours'}` : `${m} Mins`}
                    </button>
                  ))}
                  <button
                    type="button" onClick={() => setSelfDestructMinutes('custom')}
                    className={clsx(
                      "px-3 py-1.5 rounded-[12px] text-sm font-medium transition-colors border",
                      selfDestructMinutes === 'custom'
                        ? "bg-rose-100 border-rose-200 text-rose-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Custom
                  </button>
                </div>
                {selfDestructMinutes === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                     <input type="number" min="1" max="10000" value={selfDestructCustomMinutes} onChange={e => setSelfDestructCustomMinutes(e.target.value)} placeholder="Minutes" className="w-24 px-3 py-1.5 rounded-[12px] border border-slate-200 focus:border-rose-400 focus:ring-0 text-sm" />
                     <span className="text-sm text-slate-500">minutes</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold py-4 rounded-[16px] shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send className="w-5 h-5" /> Publish Poll</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
