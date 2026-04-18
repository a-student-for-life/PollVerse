import { useState, memo } from 'react';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { addIdeaToCloud, agreeWithIdea } from '../services/pollService';

// ─── Color Palette ── (stored as RGB components for precise opacity control)
const COLORS = [
  { r:  99, g: 102, b: 241 }, // indigo
  { r: 139, g:  92, b: 246 }, // violet
  { r:  16, g: 185, b: 129 }, // emerald
  { r: 244, g:  63, b:  94 }, // rose
  { r: 245, g: 158, b:  11 }, // amber
  { r:  14, g: 165, b: 233 }, // sky
  { r:  20, g: 184, b: 166 }, // teal
  { r: 217, g:  70, b: 239 }, // fuchsia
];

const FLOAT_ANIMS = ['idea-float-a', 'idea-float-b', 'idea-float-c', 'idea-float-d'];
const FLOAT_DURS  = ['7s', '9.4s', '6.3s', '8.7s'];
const FLOAT_DELS  = ['0s', '2.7s', '1.4s', '4.2s'];

// ─── Seeded helpers ───────────────────────────────────────────────────────────
function sRand(n) {
  const x = Math.sin(n + 1) * 43758.5453;
  return x - Math.floor(x);
}

function charSeed(id, offset = 0) {
  return id.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0) + offset;
}

// Returns top/left percentages — stable for a given id+index
function getPos(id, index, weight, maxWeight) {
  const s    = charSeed(id);
  const wf   = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0;
  const r1   = sRand(s);
  const r2   = sRand(s + 9973);

  let top  = 13 + r1 * 68;   // [13%, 81%]
  let left = 13 + r2 * 74;   // [13%, 87%]

  // Heavier ideas drift toward center
  top  += (44 - top)  * wf * 0.36;
  left += (50 - left) * wf * 0.36;

  // Index-based jitter to reduce clustering
  top  = Math.min(83, Math.max(12, top  + ((index * 19 + 3) % 26) - 13));
  left = Math.min(85, Math.max(12, left + ((index * 31 + 7) % 26) - 13));

  return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` };
}

// Returns all inline visual style props for a pill
function getVis(id, index, weight, maxWeight, isPro) {
  const s    = charSeed(id);
  const c    = isPro ? null : COLORS[s % COLORS.length];
  const wf   = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0.25;

  const scale    = +(0.78 + wf * 0.52).toFixed(3);    // 0.78 → 1.30
  const opacity  = +(0.42 + wf * 0.58).toFixed(3);    // 0.42 → 1.00
  const fontSize = Math.round(10 + wf * 5);            // 10px → 15px
  const glowPx   = Math.round(wf * 22);                // 0 → 22px

  if (isPro) {
    return {
      '--ws':           scale,
      color:            `rgba(203,213,225,${opacity.toFixed(2)})`,
      border:           `1px solid rgba(148,163,184,${(0.25 + wf * 0.5).toFixed(2)})`,
      background:       `rgba(51,65,85,${(0.45 + wf * 0.3).toFixed(2)})`,
      boxShadow:        glowPx > 3 ? `0 0 ${glowPx}px rgba(148,163,184,${(wf*0.28).toFixed(2)})` : 'none',
      zIndex:           Math.round(wf * 8) + 1,
      fontSize:         `${fontSize}px`,
      animationName:         FLOAT_ANIMS[index % 4],
      animationDuration:     FLOAT_DURS[index % 4],
      animationDelay:        FLOAT_DELS[index % 4],
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
    };
  }

  const rgb = `${c.r},${c.g},${c.b}`;
  // Lighten the text color (+80 brightness)
  const tr = Math.min(255, c.r + 80);
  const tg = Math.min(255, c.g + 80);
  const tb = Math.min(255, c.b + 80);

  return {
    '--ws':           scale,
    color:            `rgba(${tr},${tg},${tb},${opacity.toFixed(2)})`,
    border:           `1px solid rgba(${rgb},${(0.35 + wf * 0.55).toFixed(2)})`,
    background:       `rgba(${rgb},${(0.07 + wf * 0.1).toFixed(2)})`,
    boxShadow:        glowPx > 3
      ? `0 0 ${glowPx}px ${Math.round(glowPx * 0.45)}px rgba(${rgb},${(wf * 0.36).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,0.1)`
      : `inset 0 1px 0 rgba(255,255,255,0.06)`,
    zIndex:           Math.round(wf * 8) + 1,
    fontSize:         `${fontSize}px`,
    animationName:         FLOAT_ANIMS[index % 4],
    animationDuration:     FLOAT_DURS[index % 4],
    animationDelay:        FLOAT_DELS[index % 4],
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default memo(function IdeaCloud({ poll, isPro, onIdeaSubmit, isExpired, isStructured, hasVoted, isCreator, isCommunityLeading, topOptionVotes, communityBadge, prompt }) {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poppingId, setPoppingId]   = useState(null);
  const [submitError, setSubmitError] = useState('');

  const ideas     = poll.ideaCloud || [];
  const maxWeight = ideas.length > 0 ? Math.max(...ideas.map(i => i.weight)) : 1;
  const topIdea   = isCommunityLeading && ideas.length > 0
    ? ideas.reduce((a, b) => b.weight > a.weight ? b : a)
    : null;

  const SUBMIT_KEY = `ideaSubmit_${poll.id}`;
  const agreedKey  = (iid) => `ideaAgreed_${poll.id}_${iid}`;

  const hasSubmitted = () => { try { return !!localStorage.getItem(SUBMIT_KEY); } catch { return false; } };
  const hasAgreed    = (iid) => { try { return !!localStorage.getItem(agreedKey(iid)); } catch { return false; } };

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text) return;
    setSubmitError('');
    if (text.length > 40) return setSubmitError('Keep it under 40 characters.');
    if (hasSubmitted())   return setSubmitError("You've already added a take to this cloud.");
    if (ideas.some(i => i.text.toLowerCase() === text.toLowerCase()))
      return setSubmitError("That's already floating up there!");

    setIsSubmitting(true);
    try {
      await addIdeaToCloud(poll.id, text);
      try { localStorage.setItem(SUBMIT_KEY, '1'); } catch {}
      onIdeaSubmit?.();   // unlock results in PollView if not voted yet
      setInputText('');
    } catch (err) {
      console.error(err);
      setSubmitError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgree = async (idea) => {
    if (hasAgreed(idea.id)) return;
    try { localStorage.setItem(agreedKey(idea.id), '1'); } catch {}
    setPoppingId(idea.id);
    setTimeout(() => setPoppingId(p => p === idea.id ? null : p), 500);
    try { await agreeWithIdea(poll.id, idea.id); } catch (err) { console.error(err); }
  };

  const submitted = hasSubmitted();

  const stageBg = isPro
    ? 'radial-gradient(ellipse at 50% 55%, #1e293b 0%, #0f172a 100%)'
    : 'radial-gradient(ellipse at 50% 55%, #1e1b4b 0%, #09081a 100%)';

  const ambientGlow = isPro
    ? 'radial-gradient(ellipse at center, rgba(100,116,139,0.14) 0%, transparent 68%)'
    : 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 68%)';

  return (
    <div className="rounded-[24px] overflow-hidden shadow-2xl border border-white/5 reveal-dramatic">

      {/* ── Section eyebrow label ── */}
      <div className={clsx(
        'px-6 pt-5 pb-0 flex items-center justify-between',
        isPro ? 'bg-slate-800/80' : 'bg-[#100e2a]'
      )}>
        <div className="flex items-center gap-2.5">
          <Sparkles className={clsx('w-4 h-4', isPro ? 'text-slate-400' : 'text-indigo-400')} />
          <span className={clsx('text-[11px] font-black uppercase tracking-[0.2em]', isPro ? 'text-slate-500' : 'text-indigo-400/80')}>
            {isPro ? 'Evidence of Alternative Thinking' : 'The Idea Cloud'}
          </span>
        </div>
      </div>

      {/* ── Community Leading Banner ── */}
      {isCommunityLeading && topIdea && (
        <CommunityLeadingBanner isPro={isPro} topIdea={topIdea} communityBadge={communityBadge} />
      )}

      {/* ── Input Row ── */}
      <div className={clsx(
        'px-6 py-4 flex items-center gap-4 border-b transition-colors',
        isPro ? 'bg-slate-800/80 border-slate-700/50' : 'bg-[#100e2a] border-indigo-900/40'
      )}>
        <p className={clsx('text-[13px] font-bold shrink-0', isPro ? 'text-slate-400' : 'text-indigo-300/80')}>
          {prompt || (isPro ? 'Propose a perspective:' : 'Drop a better idea:')}
        </p>
        <input
          type="text"
          value={inputText}
          onChange={e => { setInputText(e.target.value.slice(0, 40)); setSubmitError(''); }}
          onKeyDown={e => e.key === 'Enter' && !isSubmitting && !isExpired && handleSubmit()}
          placeholder={isExpired ? "Poll exploded" : submitted ? "Take recorded" : 'Type here...'}
          disabled={submitted || isSubmitting || isExpired || (isStructured && !hasVoted && !isCreator)}
          maxLength={40}
          className={clsx(
            'flex-1 bg-transparent outline-none text-[14px] min-w-0 placeholder:opacity-30 font-medium',
            isPro ? 'text-slate-300 placeholder-slate-500' : 'text-indigo-100 placeholder-indigo-400'
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || submitted || isSubmitting || isExpired || (isStructured && !hasVoted && !isCreator)}
          className={clsx(
            'shrink-0 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-20',
            isPro
              ? 'bg-slate-600 hover:bg-slate-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
          )}
        >
          {isSubmitting ? '...' : 'Add'}
        </button>
      </div>

      {/* Error row */}
      {submitError && (
        <div className={clsx('px-6 py-2 text-[11px] font-bold text-rose-400', isPro ? 'bg-slate-800/80' : 'bg-[#100e2a]')}>
          {submitError}
        </div>
      )}

      {/* ── Cloud Stage ── */}
      <div style={{ position: 'relative', height: '300px', background: stageBg, overflow: 'hidden' }}>


        {/* Ambient center glow (CSS only) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px', height: '220px',
          background: ambientGlow,
          pointerEvents: 'none',
        }} />

        {ideas.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <p style={{ color: 'rgba(148,163,184,0.45)', fontSize: '13px', fontWeight: 600 }}>No alternate takes yet</p>
            <p style={{ color: 'rgba(148,163,184,0.28)', fontSize: '12px' }}>Be the first 👀</p>
          </div>
        ) : (
          ideas.map((idea, index) => {
            const pos     = getPos(idea.id, index, idea.weight, maxWeight);
            const vis     = getVis(idea.id, index, idea.weight, maxWeight, isPro);
            const agreed  = hasAgreed(idea.id);
            const popping = poppingId === idea.id;

            return (
              <div
                key={idea.id}
                className={clsx('idea-pill', popping && 'idea-popping', isCommunityLeading && topIdea?.id === idea.id && 'idea-community-leader')}
                title={`"${idea.text}" · ${idea.weight} agree${idea.weight !== 1 ? 's' : ''} — click to agree`}
                style={{
                  top: pos.top,
                  left: pos.left,
                  cursor: agreed ? 'default' : 'pointer',
                  opacity: agreed ? vis['--ws'] < 0.5 ? 0.55 : 1 : undefined,
                  ...vis,
                }}
                onClick={() => !agreed && !isExpired && !(isStructured && !hasVoted && !isCreator) && handleAgree(idea)}
              >
                {idea.text}
                {idea.weight >= 3 && !isPro && (
                  <span style={{ marginLeft: 4, fontSize: '10px' }}>🔥</span>
                )}
                {idea.weight > 1 && (
                  <span style={{ marginLeft: 5, fontSize: '9px', opacity: 0.65, fontWeight: 700, letterSpacing: '0.04em' }}>
                    ✦{idea.weight}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Tap hint */}
        <div style={{
          position: 'absolute', bottom: 10, right: 14,
          color: 'rgba(148,163,184,0.22)', fontSize: '10px',
          fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          tap to agree
        </div>
      </div>
    </div>
  );
});

function CommunityLeadingBanner({ isPro, topIdea, communityBadge }) {
  return (
    <div className={clsx(
      "px-6 py-3 border-b flex items-center gap-3 animate-in slide-in-from-top-2 duration-500",
      isPro ? "bg-slate-800 border-slate-700" : "bg-indigo-950 border-indigo-900"
    )}>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-[10px] font-black uppercase tracking-widest mb-0.5", isPro ? "text-slate-500" : "text-indigo-400")}>
          Community Leading Option
        </p>
        <p className={clsx("text-sm font-bold truncate", isPro ? "text-slate-200" : "text-white")}>
          "{topIdea.text}"
        </p>
      </div>
      <div className={clsx("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0", isPro ? "bg-slate-700 text-slate-300" : "bg-indigo-600 text-indigo-100")}>
        {communityBadge || 'Leading'}
      </div>
    </div>
  );
}
