import { useState, useEffect } from 'react';
import API from '../utils/api';
import logoJanz from '../assets/logo-janz.png';

const GOLD = '#E8B84B';
const bg   = '#080808';

export default function PublicReview() {
  const publicCode = window.location.pathname.split('/resena/')[1];

  const [phase, setPhase]       = useState('loading'); // loading | form | thanks | already | error
  const [info, setInfo]         = useState(null);
  const [stars, setStars]       = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [burgerRating, setBurger] = useState('');
  const [tempRating, setTemp]   = useState('');
  const [onTime, setOnTime]     = useState(null);
  const [comment, setComment]   = useState('');
  const [submitting, setSub]    = useState(false);
  const [result, setResult]     = useState(null);

  useEffect(() => {
    if (!publicCode) { setPhase('error'); return; }
    API.get(`/public/review/${publicCode}`)
      .then(r => {
        if (r.data.alreadyReviewed) { setPhase('already'); return; }
        setInfo(r.data);
        setPhase('form');
      })
      .catch(e => {
        const msg = e.response?.data?.message || '';
        if (msg.includes('entregado')) setPhase('not-delivered');
        else setPhase('error');
      });
  }, [publicCode]);

  const handleSubmit = async () => {
    if (!stars) return;
    setSub(true);
    try {
      const res = await API.post(`/public/review/${publicCode}`, {
        stars, burgerRating, tempRating, onTime, comment
      });
      setResult(res.data);
      setPhase('thanks');
    } catch { setPhase('error'); }
    finally { setSub(false); }
  };

  const wrap = { minHeight: '100vh', background: bg, color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 20px 60px' };
  const card = { width: '100%', maxWidth: 440, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 28 };
  const label = { fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 };
  const chipStyle = (active) => ({ padding: '9px 14px', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.1)'}`, background: active ? `rgba(232,184,75,0.1)` : 'rgba(255,255,255,0.03)', color: active ? GOLD : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' });

  // ── Header con logo ────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <img src={logoJanz} alt="Janz" style={{ height: 48, marginBottom: 14, filter: 'brightness(0.9)' }} />
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sistema de pedidos</div>
    </div>
  );

  // ── Estados ────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div style={{ ...wrap, justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );

  if (phase === 'already') return (
    <div style={wrap}>
      <Header />
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: GOLD, marginBottom: 8 }}>¡Ya dejaste tu reseña!</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Gracias por tu opinión. Nos ayuda a mejorar cada día.</div>
          <a href="/pedido" style={{ display: 'inline-block', marginTop: 24, background: GOLD, color: '#000', borderRadius: 12, padding: '12px 24px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>🍔 Hacer otro pedido</a>
        </div>
      </div>
    </div>
  );

  if (phase === 'not-delivered') return (
    <div style={wrap}>
      <Header />
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>Tu pedido todavía está en camino</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Te vamos a mandar el link para la reseña cuando lo recibas 🛵</div>
        </div>
      </div>
    </div>
  );

  if (phase === 'error') return (
    <div style={wrap}>
      <Header />
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>😕</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>No encontramos este pedido</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>El link puede haber vencido o el pedido no existe.</div>
          <a href="/pedido" style={{ display: 'inline-block', marginTop: 24, background: GOLD, color: '#000', borderRadius: 12, padding: '12px 24px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>🍔 Ir al menú</a>
        </div>
      </div>
    </div>
  );

  if (phase === 'thanks') return (
    <div style={wrap}>
      <Header />
      <div style={card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: GOLD, marginBottom: 8 }}>¡Gracias{info?.clientName ? `, ${info.clientName.split(' ')[0]}` : ''}!</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', marginBottom: 24, lineHeight: 1.6 }}>Tu opinión nos ayuda a preparar mejores hamburguesas cada día.</div>

          {/* Estrellas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ fontSize: '1.8rem', color: s <= stars ? GOLD : 'rgba(255,255,255,0.1)' }}>★</span>
            ))}
          </div>

          {/* Incentivo */}
          {result?.incentive && (
            <div style={{ background: 'rgba(232,184,75,0.08)', border: `1px solid rgba(232,184,75,0.3)`, borderRadius: 14, padding: '20px', marginBottom: 24 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎁</div>
              <div style={{ fontWeight: 800, color: GOLD, fontSize: '1.1rem', marginBottom: 4 }}>
                {result.incentive.type === 'discount'
                  ? `${result.incentive.percent}% OFF en tu próxima compra`
                  : 'Regalo especial para tu próximo pedido'}
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 16px', marginTop: 10 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Tu código</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.08em', color: 'white' }}>{result.incentive.code}</div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
                Válido por {result.incentive.validDays} días. Usalo en tu próximo pedido.
              </div>
            </div>
          )}

          <a href="/pedido" style={{ display: 'block', background: GOLD, color: '#000', borderRadius: 12, padding: '14px 24px', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem' }}>
            🍔 Pedir de nuevo
          </a>
        </div>
      </div>
    </div>
  );

  // ── Formulario principal ───────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <Header />
      <div style={card}>
        {/* Saludo */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', marginBottom: 4 }}>
            {info?.clientName ? `¿Cómo estuvo, ${info.clientName.split(' ')[0]}?` : '¿Cómo estuvo tu pedido?'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Contanos qué te pareció{info?.incentive?.type !== 'none' ? ' y te regalamos algo 🎁' : ''}.
          </div>
        </div>

        {/* ★ Estrellas */}
        <div style={{ marginBottom: 28 }}>
          <span style={label}>Calificación general *</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                onClick={() => setStars(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2.4rem', lineHeight: 1, padding: 0, transition: 'transform 0.1s', transform: hovered >= s || stars >= s ? 'scale(1.1)' : 'scale(1)', color: (hovered || stars) >= s ? GOLD : 'rgba(255,255,255,0.1)' }}
              >★</button>
            ))}
          </div>
          {stars > 0 && (
            <div style={{ fontSize: '0.8rem', color: GOLD, marginTop: 8, fontWeight: 600 }}>
              {['', '😕 Mejorable', '😐 Regular', '🙂 Bien', '😊 Muy buena', '🤩 ¡Increíble!'][stars]}
            </div>
          )}
        </div>

        {/* ¿Cómo estuvo la hamburguesa? */}
        <div style={{ marginBottom: 22 }}>
          <span style={label}>¿Cómo estuvo la hamburguesa?</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[['perfecta','🔥 Perfecta'],['muy_buena','😍 Muy buena'],['bien','👍 Bien'],['mejorable','😕 Mejorable']].map(([v, l]) => (
              <button key={v} onClick={() => setBurger(burgerRating === v ? '' : v)} style={chipStyle(burgerRating === v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ¿Cómo llegó? */}
        <div style={{ marginBottom: 22 }}>
          <span style={label}>¿Cómo llegó la temperatura?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['caliente','🔥 Caliente'],['tibia','🌡️ Tibia'],['fria','🧊 Fría']].map(([v, l]) => (
              <button key={v} onClick={() => setTemp(tempRating === v ? '' : v)} style={chipStyle(tempRating === v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ¿Llegó a tiempo? */}
        <div style={{ marginBottom: 22 }}>
          <span style={label}>¿Llegó a tiempo?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[true,'✅ Sí'],[false,'❌ No']].map(([v, l]) => (
              <button key={String(v)} onClick={() => setOnTime(onTime === v ? null : v)} style={chipStyle(onTime === v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Comentario libre */}
        <div style={{ marginBottom: 28 }}>
          <span style={label}>Comentario libre (opcional)</span>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Contanos qué te gustó, qué mejorarías, si lo recomendarías..."
            rows={3}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', padding: '12px 14px', fontSize: '0.88rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>

        {/* Incentivo preview */}
        {info?.incentive?.type !== 'none' && (
          <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }}>🎁</span>
            <div>
              <div style={{ fontWeight: 700, color: GOLD, fontSize: '0.88rem' }}>
                {info.incentive.type === 'discount'
                  ? `${info.incentive.percent}% OFF para tu próxima compra`
                  : `${info.incentive.productName || 'Regalo'} gratis en tu próxima compra`}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                Al enviar la reseña recibís tu código de descuento
              </div>
            </div>
          </div>
        )}

        {/* Botón enviar */}
        <button
          onClick={handleSubmit}
          disabled={!stars || submitting}
          style={{ width: '100%', background: (!stars || submitting) ? '#1a1a1a' : GOLD, color: (!stars || submitting) ? '#444' : '#000', border: 'none', padding: '15px', borderRadius: 12, fontWeight: 800, cursor: (!stars || submitting) ? 'not-allowed' : 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
        >
          {submitting ? 'Enviando...' : stars ? `Enviar ${info?.incentive?.type !== 'none' ? 'y recibir mi regalo →' : 'reseña →'}` : 'Seleccioná una calificación'}
        </button>
      </div>
    </div>
  );
}
