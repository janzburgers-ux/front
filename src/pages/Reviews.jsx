import { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, Trash2, RefreshCw, Filter, Send } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const GOLD = '#E8B84B';
const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

function StarDisplay({ stars, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= stars ? GOLD : 'rgba(255,255,255,0.1)', fontSize: size }}> ★</span>
      ))}
    </span>
  );
}

function StatBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: '0.78rem', color: 'white', fontWeight: 700 }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function Reviews() {
  const [data, setData]         = useState({ reviews: [], total: 0, pages: 1, stats: null });
  const [loading, setLoading]   = useState(true);
  const [filterStars, setFilter] = useState('');
  const [filterUnread, setUnread] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState('all'); // 'all' | 'completed' | 'pending'
  const [page, setPage]         = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [sending, setSending]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStars) params.set('stars', filterStars);
      if (filterUnread) params.set('unread', 'true');
      if (filterCompleted !== 'all') params.set('completed', filterCompleted === 'completed' ? 'true' : 'false');
      const res = await API.get(`/reviews?${params}`);
      setData(res.data);
    } catch { toast.error('Error al cargar reseñas'); }
    finally { setLoading(false); }
  }, [page, filterStars, filterUnread, filterCompleted]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await API.put(`/reviews/${id}/read`);
      setData(d => ({ ...d, reviews: d.reviews.map(r => r._id === id ? { ...r, reviewed: true } : r) }));
    } catch { toast.error('Error'); }
  };

  const remove = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/reviews/${id}`);
      toast.success('Reseña eliminada');
      load();
    } catch { toast.error('Error'); }
    finally { setDeleting(null); }
  };

  const sendManual = async (review) => {
    setSending(review._id);
    try {
      await API.post(`/reviews/${review._id}/send-request`);
      toast.success(`WA enviado a ${review.clientName || 'cliente'}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al enviar WA');
    } finally { setSending(null); }
  };

  const s = data.stats;
  const burgerLabels = { perfecta: '🔥 Perfecta', muy_buena: '😍 Muy buena', bien: '👍 Bien', mejorable: '😕 Mejorable' };
  const tempLabels   = { caliente: '🔥 Caliente', tibia: '🌡️ Tibia', fria: '🧊 Fría' };

  return (
    <>
      <div className="page-header">
        <h1>⭐ Reseñas de clientes</h1>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Actualizar</button>
      </div>

      <div className="page-body">
        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        {s && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {/* Promedio */}
            <div className="stat-card" style={{ gridColumn: 'span 1' }}>
              <div className="stat-label">Promedio general</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: GOLD, letterSpacing: '-1px' }}>{s.avgStars}</div>
                <div>
                  <StarDisplay stars={Math.round(s.avgStars)} size={16} />
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.total} reseñas</div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Sin leer</div>
              <div className="stat-value" style={{ color: s.unread > 0 ? '#f59e0b' : '#22c55e' }}>{s.unread}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">A tiempo</div>
              <div className="stat-value" style={{ color: '#22c55e' }}>
                {s.onTime.yes + s.onTime.no > 0
                  ? `${Math.round(s.onTime.yes / (s.onTime.yes + s.onTime.no) * 100)}%`
                  : '–'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.onTime.yes} sí · {s.onTime.no} no</div>
            </div>

            {/* Distribución de estrellas */}
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div className="stat-label" style={{ marginBottom: 12 }}>Distribución</div>
              {[5,4,3,2,1].map(n => (
                <StatBar key={n} label={`${n} ★`} value={s.distribution[n] || 0} total={s.total}
                  color={n >= 4 ? '#22c55e' : n === 3 ? GOLD : '#ef4444'} />
              ))}
            </div>

            {/* Temperatura */}
            {Object.keys(s.tempRating).length > 0 && (
              <div className="stat-card">
                <div className="stat-label" style={{ marginBottom: 10 }}>Temperatura</div>
                {Object.entries(s.tempRating).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{tempLabels[k] || k}</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          {['', '5','4','3','2','1'].map(v => (
            <button key={v} onClick={() => { setFilter(v); setPage(1); }}
              style={{ padding: '6px 14px', borderRadius: 100, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', border: 'none', background: filterStars === v ? GOLD : 'var(--card)', color: filterStars === v ? '#000' : 'var(--gray)', transition: 'all 0.15s' }}>
              {v ? `${v} ★` : 'Todas'}
            </button>
          ))}
          <button onClick={() => { setUnread(!filterUnread); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 100, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', border: 'none', background: filterUnread ? '#f59e0b' : 'var(--card)', color: filterUnread ? '#000' : 'var(--gray)', transition: 'all 0.15s' }}>
            Sin leer
          </button>
          {/* Filtro completadas vs pendientes */}
          {[['all','Todas'],['completed','✅ Completadas'],['pending','⏳ Pendientes']].map(([v,l]) => (
            <button key={v} onClick={() => { setFilterCompleted(v); setPage(1); }}
              style={{ padding: '6px 14px', borderRadius: 100, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', border: 'none', background: filterCompleted === v ? '#6366f1' : 'var(--card)', color: filterCompleted === v ? '#fff' : 'var(--gray)', transition: 'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Lista de reseñas ──────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : data.reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <div>No hay reseñas todavía</div>
            <div style={{ fontSize: '0.82rem', marginTop: 8, color: 'rgba(255,255,255,0.15)' }}>
              Se envían automáticamente por WhatsApp al entregar cada pedido
            </div>
          </div>
        ) : (
          <>
            {data.reviews.map(r => (
              <div key={r._id} style={{ background: '#0f0f0f', border: `1px solid ${!r.reviewed && r.completed ? 'rgba(232,184,75,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: 20, marginBottom: 12, transition: 'border 0.2s', opacity: r.completed ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      {r.completed
                        ? <StarDisplay stars={r.stars} size={16} />
                        : <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>⏳ WA enviado · esperando respuesta</span>
                      }
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{r.clientName || 'Cliente'}</span>
                      {r.clientWhatsapp && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>{r.clientWhatsapp}</span>}
                      {!r.reviewed && r.completed && <span style={{ background: 'rgba(232,184,75,0.15)', color: GOLD, fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nuevo</span>}
                      {!r.completed && r.requestSent && <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pendiente</span>}
                      {!r.requestSent && <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No enviado</span>}
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
                        {new Date(r.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Chips de respuestas rápidas (solo si completó la reseña) */}
                    {r.completed && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: r.comment ? 12 : 0 }}>
                        {r.burgerRating && <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 99, color: 'rgba(255,255,255,0.5)' }}>{burgerLabels[r.burgerRating] || r.burgerRating}</span>}
                        {r.tempRating   && <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 99, color: 'rgba(255,255,255,0.5)' }}>{tempLabels[r.tempRating] || r.tempRating}</span>}
                        {r.onTime != null && <span style={{ fontSize: '0.75rem', background: r.onTime ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', padding: '3px 10px', borderRadius: 99, color: r.onTime ? '#22c55e' : '#ef4444' }}>{r.onTime ? '✅ A tiempo' : '❌ Llegó tarde'}</span>}
                      </div>
                    )}

                    {/* Comentario */}
                    {r.comment && (
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.6, fontStyle: 'italic', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: `3px solid ${GOLD}` }}>
                        "{r.comment}"
                      </div>
                    )}

                    {/* Cupón generado */}
                    {r.couponGenerated && (
                      <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#22c55e' }}>
                        🎁 Cupón enviado: <strong>{r.couponGenerated}</strong>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {/* Enviar WA manualmente (si no se envió aún) */}
                    {!r.requestSent && r.clientWhatsapp && (
                      <button onClick={() => sendManual(r)} disabled={sending === r._id} title="Enviar solicitud de reseña por WA"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', opacity: sending === r._id ? 0.5 : 1 }}>
                        <Send size={14} />
                      </button>
                    )}
                    {r.completed && !r.reviewed && (
                      <button onClick={() => markRead(r._id)} title="Marcar como leída"
                        style={{ background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.2)', color: GOLD, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button onClick={() => remove(r._id)} disabled={deleting === r._id} title="Eliminar"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', opacity: deleting === r._id ? 0.5 : 1 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Paginación */}
            {data.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: page === p ? GOLD : 'var(--card)', color: page === p ? '#000' : 'var(--gray)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
