import { useState, useEffect, useRef } from 'react';

const CELESTE = '#74ACDF';
const GOLD    = '#E8B84B';

// ═══════════════════════════════════════════════════════════════════
// CONFETTI CANVAS – papelitos celestes y blancos
// ═══════════════════════════════════════════════════════════════════
export function ConfettiCanvas({ count = 80, active = true, fixed = true }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = [CELESTE, '#FFFFFF', '#A8D4F0', '#E0EEFA'];
    const particles = Array.from({ length: count }, () => ({
      x:        Math.random() * window.innerWidth,
      y:       -20 - Math.random() * 180,
      w:        4 + Math.random() * 8,
      h:        3 + Math.random() * 5,
      speedY:   1.2 + Math.random() * 2.2,
      speedX:  (Math.random() - 0.5) * 1.6,
      rot:      Math.random() * 360,
      rotS:    (Math.random() - 0.5) * 6,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      isRect:   Math.random() > 0.35,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y   += p.speedY;
        p.x   += p.speedX;
        p.rot += p.rotS;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle   = p.color;
        ctx.globalAlpha = 0.88;
        if (p.isRect) {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active, count]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 9997,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANIMACIÓN DE ENTRADA – se muestra UNA sola vez por usuario
// ═══════════════════════════════════════════════════════════════════
export function MundialIntroAnimation({ onDone }) {
  const [phase, setPhase] = useState(1); // 1=confetti  2=texto  3=fade-out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 2000);
    const t2 = setTimeout(() => setPhase(3), 4000);
    const t3 = setTimeout(() => onDone && onDone(), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes mundialTextIn {
          from { opacity:0; transform: scale(0.82) translateY(28px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }
        @keyframes mundialGlow {
          0%,100% { text-shadow: 0 0 24px rgba(116,172,223,0.45); }
          50%      { text-shadow: 0 0 52px rgba(116,172,223,0.9), 0 0 100px rgba(116,172,223,0.3); }
        }
        @keyframes starPulse {
          0%,100% { transform: scale(1);    opacity: 1;   }
          50%      { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      <ConfettiCanvas count={110} active fixed />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        opacity:    phase === 3 ? 0 : 1,
        transition: phase === 3 ? 'opacity 0.9s ease' : 'none',
        pointerEvents: phase === 3 ? 'none' : 'auto',
      }}>
        {phase >= 2 && (
          <div style={{
            textAlign: 'center', padding: '0 28px', zIndex: 9999,
            animation: 'mundialTextIn 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <div style={{ fontSize: 'clamp(2.8rem, 11vw, 6rem)', lineHeight: 1, marginBottom: 10, animation: 'starPulse 1.8s ease infinite' }}>
              🇦🇷
            </div>
            <div style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize:   'clamp(2.4rem, 10vw, 5.5rem)',
              fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.92,
              color: CELESTE, textTransform: 'uppercase',
              animation: 'mundialGlow 1.8s ease infinite',
            }}>
              ¡VAMOS<br />ARGENTINA!
            </div>
            <div style={{
              marginTop: 16, fontSize: 'clamp(1.4rem, 5vw, 2rem)',
              animation: 'starPulse 1.4s ease infinite 0.3s',
            }}>
              ⭐⭐⭐
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HERO BADGE – pequeño pill dentro del hero
// ═══════════════════════════════════════════════════════════════════
export function MundialHeroBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(116,172,223,0.12)',
      border:  `1px solid rgba(116,172,223,0.35)`,
      borderRadius: 100, padding: '4px 11px', marginBottom: 10,
    }}>
      <span style={{ fontSize: '0.62rem' }}>⚽</span>
      <span style={{
        fontSize: '0.62rem', fontWeight: 800,
        color: CELESTE, letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        Modo Mundial Activado
      </span>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: CELESTE, display: 'inline-block',
        animation: 'none', boxShadow: `0 0 6px ${CELESTE}`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BANNER MODO MUNDIAL – debajo del hero
// ═══════════════════════════════════════════════════════════════════
export function MundialBanner({ promoUrl }) {
  return (
    <div style={{
      margin: '10px 16px 0',
      background: 'linear-gradient(135deg, rgba(116,172,223,0.11) 0%, rgba(116,172,223,0.03) 100%)',
      border: `1px solid rgba(116,172,223,0.28)`,
      borderRadius: 14, padding: '13px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Línea celeste superior decorativa */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${CELESTE} 0%, transparent 70%)`,
        opacity: 0.55,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: 'rgba(116,172,223,0.14)',
          border: `1px solid rgba(116,172,223,0.28)`,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>🏆</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '0.76rem', fontWeight: 900, color: CELESTE,
            lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3,
          }}>
            Modo Mundial Activado ⚽
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
            Pronosticá resultados, sumá puntos y ganá premios exclusivos
          </div>
        </div>
      </div>

      <a href={promoUrl || '/prode-publico'} style={{
        background: CELESTE, color: '#000',
        borderRadius: 8, padding: '8px 13px',
        fontSize: '0.72rem', fontWeight: 900,
        textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        letterSpacing: '0.03em',
      }}>
        IR AL PRODE →
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MATCH COUNTDOWN – contador del próximo partido
// ═══════════════════════════════════════════════════════════════════
export function MatchCountdown({ match }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [started,  setStarted]  = useState(false);

  useEffect(() => {
    if (!match?.date) return;
    const tick = () => {
      const diff = new Date(match.date) - new Date();
      if (diff <= 0) { setStarted(true); return; }
      setTimeLeft({
        days:  Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000)  / 60000),
        secs:  Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match?.date]);

  if (!match) return null;

  const TimeBlock = ({ value, label }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: '100%', padding: '9px 4px', textAlign: 'center',
        background: '#0a0a0a', border: `1px solid rgba(116,172,223,0.18)`,
        borderRadius: 8, fontWeight: 900, color: 'white',
        fontSize: 'clamp(1.1rem, 4.5vw, 1.55rem)',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
        letterSpacing: '-0.5px',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </div>
    </div>
  );

  const Sep = () => (
    <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '1.1rem', fontWeight: 900, paddingBottom: 14, flexShrink: 0 }}>:</div>
  );

  return (
    <div style={{
      margin: '10px 16px 0',
      background: '#0c0c0c',
      border: `1px solid rgba(116,172,223,0.12)`,
      borderRadius: 14, padding: '13px 16px', overflow: 'hidden', position: 'relative',
    }}>
      {/* Glow de fondo */}
      <div style={{
        position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)',
        width: 80, height: 80, background: CELESTE, borderRadius: '50%',
        filter: 'blur(40px)', opacity: 0.04, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🇦🇷</span>
        <div>
          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Próximo partido
          </div>
          <div style={{ fontWeight: 900, color: 'white', fontSize: '0.88rem', letterSpacing: '-0.3px' }}>
            Argentina vs {match.opponent || '???'}
          </div>
          {match.label && (
            <div style={{ fontSize: '0.6rem', color: CELESTE, fontWeight: 600, marginTop: 1 }}>
              {match.label}
            </div>
          )}
        </div>
      </div>

      {started ? (
        <div style={{ textAlign: 'center', color: CELESTE, fontWeight: 900, fontSize: '0.88rem', padding: '6px 0' }}>
          ⚽ ¡El partido ya comenzó! Alentamos juntos 🎉
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <TimeBlock value={timeLeft.days}  label="Días"  />
          <Sep />
          <TimeBlock value={timeLeft.hours} label="Horas" />
          <Sep />
          <TimeBlock value={timeLeft.mins}  label="Min"   />
          <Sep />
          <TimeBlock value={timeLeft.secs}  label="Seg"   />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ARGENTINA GANÓ – banner de celebración
// ═══════════════════════════════════════════════════════════════════
export function ArgentinaGanoBar({ clientId }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <>
      <ConfettiCanvas count={55} active fixed />
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 600,
        background: 'linear-gradient(90deg, #003087 0%, #74ACDF 45%, #FFFFFF 50%, #74ACDF 55%, #003087 100%)',
        backgroundSize: '200% 100%',
        animation: 'argSlide 4s linear infinite',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        boxShadow: `0 4px 28px rgba(116,172,223,0.35)`,
      }}>
        <style>{`
          @keyframes argSlide {
            0%   { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🇦🇷</span>
          <div>
            <div style={{ fontWeight: 900, color: 'white', fontSize: '0.82rem', lineHeight: 1.15, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              ¡ GANÓ ARGENTINA !
            </div>
            <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
              Festejemos con una Janz
            </div>
          </div>
        </div>
      </div>
      {/* Spacer para que el contenido no quede debajo del banner */}
      <div style={{ height: 52 }} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT BADGE – etiqueta especial en tarjetas de producto
// ═══════════════════════════════════════════════════════════════════
const BADGE_STYLES = {
  'MÁS ELEGIDA':           { bg: 'rgba(232,184,75,0.14)',  color: GOLD,      border: 'rgba(232,184,75,0.4)'  },
  'FAVORITA DE LA HINCHADA':{ bg: 'rgba(116,172,223,0.12)', color: CELESTE,   border: 'rgba(116,172,223,0.3)' },
  'COMBO MUNDIAL':          { bg: 'rgba(34,197,94,0.10)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)'  },
  'NUEVA':                  { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
};

export function MundialProductBadge({ label }) {
  const s = BADGE_STYLES[label] || BADGE_STYLES['NUEVA'];
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 4, padding: '2px 6px',
      fontSize: '0.56rem', fontWeight: 800,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      marginLeft: 7, verticalAlign: 'middle', lineHeight: 1.5,
    }}>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GOAL TOAST – mostrar al agregar producto
// Uso: showGoalToast(toast)
// ═══════════════════════════════════════════════════════════════════
export function showGoalToast(toastInstance) {
  toastInstance.custom(
    (t) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#111', border: `1px solid rgba(116,172,223,0.38)`,
        borderRadius: 12, padding: '11px 15px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        opacity:   t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
        transition: 'all 0.25s ease',
        maxWidth: 280, cursor: 'pointer',
      }}
      onClick={() => toastInstance.dismiss(t.id)}
      >
        <span style={{ fontSize: '1.35rem', lineHeight: 1, flexShrink: 0 }}>⚽</span>
        <div>
          <div style={{ fontWeight: 900, color: 'white', fontSize: '0.88rem', letterSpacing: '-0.2px' }}>
            ¡GOOOL!
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
            Producto agregado al equipo
          </div>
        </div>
      </div>
    ),
    { duration: 2000, position: 'bottom-center' }
  );
}

// ═══════════════════════════════════════════════════════════════════
// MUNDIAL BADGES MAP – asignar etiquetas a productos por nombre
// Editar esta lista para personalizar según el menú de Janz Burgers
// ═══════════════════════════════════════════════════════════════════
export const MUNDIAL_BADGES = {
  'CAVA':    'MÁS ELEGIDA',
  // 'DOBLE BACON': 'FAVORITA DE LA HINCHADA',
  // 'COMBO JANZ':  'COMBO MUNDIAL',
};

// ═══════════════════════════════════════════════════════════════════
// TARJETA UNIFICADA: Banner + Countdown + CTA en una sola pieza
// Reemplaza a MundialBanner + MatchCountdown por separado
// ═══════════════════════════════════════════════════════════════════
export function MundialCountdownCard({ match, promoUrl }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [started,  setStarted]  = useState(false);

  useEffect(() => {
    if (!match?.date) return;
    const tick = () => {
      const diff = new Date(match.date) - new Date();
      if (diff <= 0) { setStarted(true); return; }
      setTimeLeft({
        days:  Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000)  / 60000),
        secs:  Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match?.date]);

  const TimeBlock = ({ value, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        minWidth: 52, padding: '8px 6px', textAlign: 'center',
        background: '#080808', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, fontWeight: 900, color: 'white',
        fontSize: 'clamp(1.15rem, 4vw, 1.55rem)',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  );

  const Sep = () => (
    <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1.1rem', fontWeight: 900, paddingBottom: 14 }}>:</div>
  );

  return (
    <div className="mwc-card">
      <style>{`
        .mwc-card {
          margin: 0 16px;
          background: #111;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          overflow: hidden;
        }
        .mwc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #74ACDF 0%, transparent 55%);
          opacity: 0.5;
        }
        .mwc-info  { display: flex; align-items: center; gap: 14px; }
        .mwc-timer { display: flex; align-items: flex-start; gap: 5px; flex-wrap: wrap; }
        .mwc-cta   { display: flex; flex-direction: column; gap: 8px; }
        @media (min-width: 760px) {
          .mwc-card {
            flex-direction: row;
            align-items: center;
            padding: 18px 24px;
            gap: 0;
          }
          .mwc-info  { flex: 0 0 250px; }
          .mwc-timer { flex: 1; justify-content: center; padding: 0 24px; flex-wrap: nowrap; }
          .mwc-cta   { flex: 0 0 210px; align-items: flex-end; }
        }
      `}</style>

      <div className="mwc-info">
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          background: 'rgba(232,184,75,0.1)',
          border: '1px solid rgba(232,184,75,0.22)',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
        }}>🏆</div>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#74ACDF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
            Modo Mundial Activado ⚽
          </div>
          <div style={{ fontWeight: 900, color: 'white', fontSize: '0.95rem', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            Argentina vs {match?.opponent || 'próximo rival'}
          </div>
          {match?.label && (
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{match.label}</div>
          )}
        </div>
      </div>

      <div className="mwc-timer">
        {started ? (
          <div style={{ fontWeight: 800, color: '#74ACDF', fontSize: '0.88rem' }}>⚽ ¡El partido ya comenzó!</div>
        ) : (
          <>
            <TimeBlock value={timeLeft.days}  label="Días"  />
            <Sep />
            <TimeBlock value={timeLeft.hours} label="Horas" />
            <Sep />
            <TimeBlock value={timeLeft.mins}  label="Min"   />
            <Sep />
            <TimeBlock value={timeLeft.secs}  label="Seg"   />
          </>
        )}
      </div>

      <div className="mwc-cta">
        {promoUrl && (
          <a href={promoUrl} style={{
            display: 'block', background: '#74ACDF', color: '#000',
            borderRadius: 10, padding: '11px 20px',
            fontWeight: 900, textDecoration: 'none',
            fontSize: '0.88rem', textAlign: 'center', letterSpacing: '-0.2px',
          }}>
            IR AL PRODE →
          </a>
        )}
        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.26)', lineHeight: 1.5 }}>
          Pronosticá resultados, sumá puntos y ganá premios exclusivos.
        </div>
      </div>
    </div>
  );
}
