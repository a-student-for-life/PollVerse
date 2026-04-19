import { useState, useEffect, memo } from 'react';
import { Sparkles, Check } from 'lucide-react';
import clsx from 'clsx';
import { addIdeaToCloud, agreeWithIdea } from '../services/pollService';

// ─── Color Palette ─────────────────────────────────────────────────────────────
const COLORS = [
  { r:  99, g: 102, b: 241 },
  { r: 139, g:  92, b: 246 },
  { r:  16, g: 185, b: 129 },
  { r: 244, g:  63, b:  94 },
  { r: 245, g: 158, b:  11 },
  { r:  14, g: 165, b: 233 },
  { r:  20, g: 184, b: 166 },
  { r: 217, g:  70, b: 239 },
];

const FLOAT_ANIMS = ['idea-float-a', 'idea-float-b', 'idea-float-c', 'idea-float-d'];
const FLOAT_DURS  = ['7s', '9.4s', '6.3s', '8.7s'];
const FLOAT_DELS  = ['0s', '2.7s', '1.4s', '4.2s'];

// ─── Seeded helpers ────────────────────────────────────────────────────────────
function sRand(n) {
  const x = Math.sin(n + 1) * 43758.5453;
  return x - Math.floor(x);
}
function charSeed(id, offset = 0) {
  return id.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0) + offset;
}

// Desktop: stable position for each pill
function getPos(id, index, weight, maxWeight) {
  const s  = charSeed(id);
  const wf = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0;
  let top  = 13 + sRand(s) * 68;
  let left = 13 + sRand(s + 9973) * 74;
  top  += (44 - top)  * wf * 0.36;
  left += (50 - left) * wf * 0.36;
  top  = Math.min(83, Math.max(12, top  + ((index * 19 + 3) % 26) - 13));
  left = Math.min(85, Math.max(12, left + ((index * 31 + 7) % 26) - 13));
  return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` };
}

// Desktop: full visual style (color + float animation + scale)
function getVis(id, index, weight, maxWeight, isPro) {
  const s   = charSeed(id);
  const c   = isPro ? null : COLORS[s % COLORS.length];
  const wf  = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0.25;
  const scale   = +(0.78 + wf * 0.52).toFixed(3);
  const opacity = +(0.42 + wf * 0.58).toFixed(3);
  const fontSize = Math.round(10 + wf * 5);
  const glowPx   = Math.round(wf * 22);
  if (isPro) {
    return {
      '--ws': scale,
      color:      `rgba(203,213,225,${opacity.toFixed(2)})`,
      border:     `1px solid rgba(148,163,184,${(0.25 + wf * 0.5).toFixed(2)})`,
      background: `rgba(51,65,85,${(0.45 + wf * 0.3).toFixed(2)})`,
      boxShadow:  glowPx > 3 ? `0 0 ${glowPx}px rgba(148,163,184,${(wf * 0.28).toFixed(2)})` : 'none',
      zIndex:     Math.round(wf * 8) + 1,
      fontSize:   `${fontSize}px`,
      animationName:           FLOAT_ANIMS[index % 4],
      animationDuration:       FLOAT_DURS[index % 4],
      animationDelay:          FLOAT_DELS[index % 4],
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
    };
  }
  const rgb = `${c.r},${c.g},${c.b}`;
  const tr = Math.min(255, c.r + 80);
  const tg = Math.min(255, c.g + 80);
  const tb = Math.min(255, c.b + 80);
  return {
    '--ws': scale,
    color:      `rgba(${tr},${tg},${tb},${opacity.toFixed(2)})`,
    border:     `1px solid rgba(${rgb},${(0.35 + wf * 0.55).toFixed(2)})`,
    background: `rgba(${rgb},${(0.07 + wf * 0.1).toFixed(2)})`,
    boxShadow:  glowPx > 3
      ? `0 0 ${glowPx}px ${Math.round(glowPx * 0.45)}px rgba(${rgb},${(wf * 0.36).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,0.1)`
      : `inset 0 1px 0 rgba(255,255,255,0.06)`,
    zIndex:     Math.round(wf * 8) + 1,
    fontSize:   `${fontSize}px`,
    animationName:           FLOAT_ANIMS[index % 4],
    animationDuration:       FLOAT_DURS[index % 4],
    animationDelay:          FLOAT_DELS[index % 4],
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  };
}

// Mobile chip breathing — 4 distinct rhythms keyed by charSeed(id) % 4
const CHIP_BREATHE = ['chip-breathe-a', 'chip-breathe-b', 'chip-breathe-c', 'chip-breathe-d'];
const CHIP_DURS    = ['6.8s', '8.5s', '7.3s', '9.8s'];
const CHIP_DELS    = ['0s',   '2.3s', '1.1s', '3.7s'];

// Weight-proportional font + padding — heaviest ideas read largest at a glance
function getChipSize(weight, maxWeight) {
  const wf = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0.25;
  if (wf >= 0.7)  return { fontSize: '14px',   paddingInline: '15px', paddingBlock: '8px' };
  if (wf >= 0.35) return { fontSize: '13px',   paddingInline: '13px', paddingBlock: '7px' };
  return           { fontSize: '11.5px', paddingInline: '11px', paddingBlock: '6px' };
}

// Mobile: chip color (no scale/animation — those are applied separately via class + inline)
function getChipStyle(id, weight, maxWeight, isPro) {
  const s  = charSeed(id);
  const wf = maxWeight > 1 ? Math.min(weight / maxWeight, 1) : 0.3;
  if (isPro) {
    return {
      color:      `rgba(203,213,225,${(0.55 + wf * 0.45).toFixed(2)})`,
      border:     `1.5px solid rgba(148,163,184,${(0.25 + wf * 0.45).toFixed(2)})`,
      background: `rgba(51,65,85,${(0.5 + wf * 0.25).toFixed(2)})`,
    };
  }
  const c   = COLORS[s % COLORS.length];
  const rgb = `${c.r},${c.g},${c.b}`;
  const tr  = Math.min(255, c.r + 90);
  const tg  = Math.min(255, c.g + 90);
  const tb  = Math.min(255, c.b + 90);
  return {
    color:      `rgba(${tr},${tg},${tb},${(0.7 + wf * 0.3).toFixed(2)})`,
    border:     `1.5px solid rgba(${rgb},${(0.4 + wf * 0.4).toFixed(2)})`,
    background: `rgba(${rgb},${(0.1 + wf * 0.12).toFixed(2)})`,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default memo(function IdeaCloud({
  poll, isPro, onIdeaSubmit,
  isExpired, isStructured, hasVoted, isCreator,
  isCommunityLeading, communityBadge,
}) {
  const [inputText,   setInputText]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poppingId,   setPoppingId]   = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isMobile,    setIsMobile]    = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  useEffect(() => {
    const mql     = window.matchMedia('(max-width: 639px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const ideas     = poll.ideaCloud || [];
  const maxWeight = ideas.length > 0 ? Math.max(...ideas.map(i => i.weight)) : 1;
  const topIdea   = isCommunityLeading && ideas.length > 0
    ? ideas.reduce((a, b) => b.weight > a.weight ? b : a)
    : null;

  const SUBMIT_KEY = `ideaSubmit_${poll.id}`;
  const agreedKey  = (iid) => `ideaAgreed_${poll.id}_${iid}`;
  const hasSubmitted = () => { try { return !!localStorage.getItem(SUBMIT_KEY); } catch { return false; } };
  const hasAgreed    = (iid) => { try { return !!localStorage.getItem(agreedKey(iid)); } catch { return false; } };

  // Single gate: expired OR (structured poll + user hasn't voted yet)
  const canInteract = !isExpired && !(isStructured && !hasVoted && !isCreator);
  const submitted   = hasSubmitted();

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text || !canInteract) return;
    setSubmitError('');
    if (text.length > 40)  return setSubmitError('Keep it under 40 characters.');
    if (submitted)         return setSubmitError("You've already added a take to this cloud.");
    if (ideas.some(i => i.text.toLowerCase() === text.toLowerCase()))
      return setSubmitError("That's already floating up there!");
    setIsSubmitting(true);
    try {
      await addIdeaToCloud(poll.id, text);
      try { localStorage.setItem(SUBMIT_KEY, '1'); } catch {}
      onIdeaSubmit?.();
      setInputText('');
    } catch (err) {
      console.error(err);
      setSubmitError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgree = async (idea) => {
    if (!canInteract || hasAgreed(idea.id)) return;
    try { localStorage.setItem(agreedKey(idea.id), '1'); } catch {}
    setPoppingId(idea.id);
    setTimeout(() => setPoppingId(p => p === idea.id ? null : p), 500);
    try { await agreeWithIdea(poll.id, idea.id); } catch (err) { console.error(err); }
  };

  // Copy for each mode
  const headingTitle = isPro ? 'Alternative Perspectives' : 'Challenge the Poll';
  const headingDesc  = isPro
    ? 'Propose a viewpoint outside the given options.'
    : "Don't see your answer? Drop it — the crowd decides if it belongs.";
  const inputLabel   = isPro ? 'Propose a perspective' : 'Drop a better idea';
  const inputPlaceholder = isExpired
    ? 'Poll has ended'
    : submitted
      ? 'Your take is recorded ✓'
      : (isStructured && !hasVoted && !isCreator)
        ? 'Vote first to contribute'
        : isPro ? 'Your alternative here...' : 'Your idea here...';

  const stageBg    = isPro
    ? 'radial-gradient(ellipse at 50% 55%, #0f172a 0%, #020617 100%)'
    : 'radial-gradient(ellipse at 50% 55%, #1e1b4b 0%, #020617 100%)';
  const ambientGlow = isPro
    ? 'radial-gradient(ellipse at center, rgba(100,116,139,0.1) 0%, transparent 68%)'
    : 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 68%)';

  return (
    <div className="rounded-[24px] overflow-hidden shadow-2xl border border-white/5 reveal-dramatic">

      {/* ── Section Header ── */}
      <div className={clsx('px-6 pt-6 pb-5 border-b border-white/5', isPro ? 'bg-slate-900/80' : 'bg-slate-950/70')}>
        <div className="flex items-start gap-3">
          <div className={clsx(
            'mt-0.5 p-2 rounded-xl shrink-0',
            isPro ? 'bg-slate-800 border border-slate-700/50' : 'bg-indigo-950 border border-indigo-900/50'
          )}>
            <Sparkles className={clsx('w-4 h-4', isPro ? 'text-slate-400' : 'text-indigo-400')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx('text-sm font-black uppercase tracking-[0.15em] leading-none', isPro ? 'text-slate-200' : 'text-indigo-200')}>
              {headingTitle}
            </p>
            <p className={clsx('text-[11px] font-medium mt-1.5 leading-relaxed', isPro ? 'text-slate-500' : 'text-indigo-400/70')}>
              {headingDesc}
            </p>
          </div>
          {ideas.length > 0 && (
            <div className={clsx(
              'shrink-0 self-start text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border',
              isPro ? 'bg-slate-800 text-slate-400 border-slate-700/50' : 'bg-indigo-950 text-indigo-400 border-indigo-900/50'
            )}>
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Community Leading Banner ── */}
      {isCommunityLeading && topIdea && (
        <CommunityLeadingBanner isPro={isPro} topIdea={topIdea} communityBadge={communityBadge} />
      )}

      {/* ── Input Row ── */}
      <div className={clsx('px-5 py-4 border-b border-white/5', isPro ? 'bg-slate-900/80' : 'bg-slate-950/70')}>
        {isMobile ? (
          /* Mobile: stacked layout for comfortable typing */
          <div className="space-y-2.5">
            <p className={clsx('text-[10px] font-black uppercase tracking-widest', isPro ? 'text-slate-500' : 'text-indigo-500/70')}>
              {inputLabel}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => { setInputText(e.target.value.slice(0, 40)); setSubmitError(''); }}
                onKeyDown={e => e.key === 'Enter' && !isSubmitting && canInteract && handleSubmit()}
                placeholder={inputPlaceholder}
                disabled={submitted || isSubmitting || !canInteract}
                maxLength={40}
                className={clsx(
                  'flex-1 bg-slate-950/60 border-2 rounded-xl px-4 py-3 text-sm outline-none transition font-medium placeholder:opacity-40 disabled:opacity-50',
                  isPro
                    ? 'text-slate-200 border-slate-700 focus:border-sky-500 placeholder-slate-600'
                    : 'text-white border-slate-800 focus:border-indigo-500 placeholder-indigo-600'
                )}
              />
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim() || submitted || isSubmitting || !canInteract}
                className={clsx(
                  'shrink-0 text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-25',
                  isPro
                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-white/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/60'
                )}
              >
                {isSubmitting ? '...' : 'Add'}
              </button>
            </div>
          </div>
        ) : (
          /* Desktop: horizontal layout */
          <div className="flex items-center gap-4">
            <p className={clsx('text-[13px] font-bold shrink-0', isPro ? 'text-slate-500' : 'text-indigo-300/80')}>
              {inputLabel}:
            </p>
            <input
              type="text"
              value={inputText}
              onChange={e => { setInputText(e.target.value.slice(0, 40)); setSubmitError(''); }}
              onKeyDown={e => e.key === 'Enter' && !isSubmitting && canInteract && handleSubmit()}
              placeholder={inputPlaceholder}
              disabled={submitted || isSubmitting || !canInteract}
              maxLength={40}
              className={clsx(
                'flex-1 bg-transparent outline-none text-[14px] min-w-0 placeholder:opacity-30 font-medium disabled:opacity-50',
                isPro ? 'text-slate-300 placeholder-slate-600' : 'text-indigo-100 placeholder-indigo-500'
              )}
            />
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || submitted || isSubmitting || !canInteract}
              className={clsx(
                'shrink-0 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-20',
                isPro
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
              )}
            >
              {isSubmitting ? '...' : 'Add'}
            </button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {submitError && (
        <div className={clsx('px-5 py-2 text-[11px] font-bold text-rose-400', isPro ? 'bg-slate-900/80' : 'bg-slate-950/70')}>
          {submitError}
        </div>
      )}

      {/* ── Ideas Display ── */}
      {isMobile ? (
        <MobileChips
          ideas={ideas}
          maxWeight={maxWeight}
          isPro={isPro}
          topIdea={topIdea}
          isCommunityLeading={isCommunityLeading}
          poppingId={poppingId}
          hasAgreed={hasAgreed}
          canInteract={canInteract}
          onAgree={handleAgree}
        />
      ) : (
        <DesktopCloud
          ideas={ideas}
          maxWeight={maxWeight}
          isPro={isPro}
          topIdea={topIdea}
          isCommunityLeading={isCommunityLeading}
          poppingId={poppingId}
          hasAgreed={hasAgreed}
          canInteract={canInteract}
          onAgree={handleAgree}
          stageBg={stageBg}
          ambientGlow={ambientGlow}
        />
      )}
    </div>
  );
});

// ─── Mobile: Wrapped Chip List ─────────────────────────────────────────────────
function MobileChips({ ideas, maxWeight, isPro, topIdea, isCommunityLeading, poppingId, hasAgreed, canInteract, onAgree }) {
  if (ideas.length === 0) {
    return (
      <div className={clsx('p-8 text-center', isPro ? 'bg-slate-900/60' : 'bg-slate-950/60')}>
        <p className={clsx('text-sm font-semibold', isPro ? 'text-slate-600' : 'text-indigo-400/40')}>No alternate takes yet</p>
        <p className={clsx('text-xs mt-1', isPro ? 'text-slate-700' : 'text-indigo-500/30')}>Be the first 👀</p>
      </div>
    );
  }

  // Sort: community leader first, then by weight desc
  const sorted = [...ideas].sort((a, b) => {
    const aIsTop = isCommunityLeading && topIdea?.id === a.id;
    const bIsTop = isCommunityLeading && topIdea?.id === b.id;
    if (aIsTop && !bIsTop) return -1;
    if (bIsTop && !aIsTop) return 1;
    return b.weight - a.weight;
  });

  return (
    // pt-3 gives breathing room so chips animating -3px upward aren't clipped
    <div className={clsx('px-5 pt-3 pb-5', isPro ? 'bg-slate-900/60' : 'bg-slate-950/60')}>
      <div className="flex flex-wrap gap-x-2.5 gap-y-3 pt-1">
        {sorted.map((idea) => {
          const agreed    = hasAgreed(idea.id);
          const isPopping = poppingId === idea.id;
          const isTop     = isCommunityLeading && topIdea?.id === idea.id;

          const colorStyle = getChipStyle(idea.id, idea.weight, maxWeight, isPro);
          const sizeStyle  = getChipSize(idea.weight, maxWeight);

          // Breathing: pick one of 4 rhythms from the idea's stable seed
          const animIdx = charSeed(idea.id) % 4;
          // Agreed chips are settled — they stop breathing
          const breatheStyle = agreed ? {
            animationPlayState: 'paused',
          } : {
            animationName:           CHIP_BREATHE[animIdx],
            animationDuration:       CHIP_DURS[animIdx],
            animationDelay:          CHIP_DELS[animIdx],
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          };

          return (
            <button
              key={idea.id}
              type="button"
              onClick={() => onAgree(idea)}
              disabled={agreed || !canInteract}
              title={agreed ? `Agreed ✓ · ${idea.weight} agree` : `Tap to agree · ${idea.weight} agree`}
              className={clsx(
                'idea-chip rounded-full font-semibold border select-none gap-1.5',
                agreed
                  ? 'opacity-55 cursor-default'
                  : canInteract ? 'cursor-pointer' : 'cursor-default opacity-40',
                isPopping && 'scale-110',
                isTop && 'ring-2 ring-yellow-400/50 ring-offset-1 ring-offset-slate-950',
              )}
              style={{ ...colorStyle, ...sizeStyle, ...breatheStyle, minHeight: '36px' }}
            >
              <span>{idea.text}</span>
              {idea.weight >= 3 && !isPro && <span style={{ fontSize: '11px', lineHeight: 1 }}>🔥</span>}
              {idea.weight > 1 && (
                <span style={{ fontSize: '9px', opacity: 0.65, fontWeight: 800, letterSpacing: '0.04em' }}>✦{idea.weight}</span>
              )}
              {agreed && <Check style={{ width: '11px', height: '11px', opacity: 0.6, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <p className={clsx('text-[10px] font-semibold mt-5 uppercase tracking-widest', isPro ? 'text-slate-700' : 'text-indigo-500/30')}>
        tap to agree
      </p>
    </div>
  );
}

// ─── Desktop: Floating Cloud (unchanged behavior) ──────────────────────────────
function DesktopCloud({ ideas, maxWeight, isPro, topIdea, isCommunityLeading, poppingId, hasAgreed, canInteract, onAgree, stageBg, ambientGlow }) {
  return (
    <div style={{ position: 'relative', height: '300px', background: stageBg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
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
          const isTop   = isCommunityLeading && topIdea?.id === idea.id;

          return (
            <div
              key={idea.id}
              className={clsx('idea-pill', popping && 'idea-popping', isTop && 'idea-community-leader')}
              title={`"${idea.text}" · ${idea.weight} agree${idea.weight !== 1 ? 's' : ''} — click to agree`}
              style={{
                top:    pos.top,
                left:   pos.left,
                cursor: (agreed || !canInteract) ? 'default' : 'pointer',
                opacity: agreed && vis['--ws'] < 0.5 ? 0.55 : undefined,
                ...vis,
              }}
              onClick={() => !agreed && canInteract && onAgree(idea)}
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

      <div style={{
        position: 'absolute', bottom: 10, right: 14,
        color: 'rgba(148,163,184,0.22)', fontSize: '10px',
        fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        click to agree
      </div>
    </div>
  );
}

// ─── Community Leading Banner ──────────────────────────────────────────────────
function CommunityLeadingBanner({ isPro, topIdea, communityBadge }) {
  return (
    <div className={clsx(
      'px-6 py-3 border-b flex items-center gap-3 animate-in slide-in-from-top-2 duration-500',
      isPro ? 'bg-slate-800 border-slate-700' : 'bg-indigo-950 border-indigo-900'
    )}>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-[10px] font-black uppercase tracking-widest mb-0.5', isPro ? 'text-slate-500' : 'text-indigo-400')}>
          Community Leading Option
        </p>
        <p className={clsx('text-sm font-bold truncate', isPro ? 'text-slate-200' : 'text-white')}>
          "{topIdea.text}"
        </p>
      </div>
      <div className={clsx('px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0', isPro ? 'bg-slate-700 text-slate-300' : 'bg-indigo-600 text-indigo-100')}>
        {communityBadge || 'Leading'}
      </div>
    </div>
  );
}
