import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const REASON_LABELS = {
  sin_stock: { label: 'Sin stock', color: 'var(--red)', emoji: '📦' },
  cocina_cerrada: { label: 'Cocina cerrada', color: 'var(--yellow)', emoji: '🔒' },
  otro: { label: 'Otro motivo', color: 'var(--gray)', emoji: '❓' }
};

export default function RejectedOrders() {
  const [rejected, setRejected] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      API.get('/rejected-orders'),
      API.get('/rejected-orders/stats').catch(() => null)
    ]).then(([r, s]) => {
      setRejected(r.data);
      if (s) setStats(s.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1><XCircle size={20} style={{ display: 'inline', marginRight: 8 }} />Pedidos Rechazados</h1>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Actualizar</button>
      </div>

      <div className="page-body">

        {/* Stats */}
        {stats && (
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total rechazados', value: stats.total, color: 'var(--red)' },
              { label: 'Este mes', value: stats.thisMonth, color: 'var(--yellow)' },
              { label: 'Revenue perdido', value: fmt(stats.totalLost), color: 'var(--gray)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
            {stats.missingIngredients?.length > 0 && (
              <div className="stat-card">
                <div className="stat-label">Ingrediente más faltante</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--red)', marginTop: 4 }}>
                  📦 {stats.missingIngredients[0]._id}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>
                  {stats.missingIngredients[0].count} veces sin stock
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ingredientes más faltantes */}
        {stats?.missingIngredients?.length > 1 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>
              <AlertTriangle size={13} /> Ingredientes con más faltantes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.missingIngredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>📦 {ing._id}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 100, height: 4, background: 'var(--dark)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(ing.count / stats.missingIngredients[0].count) * 100}%`, background: 'var(--red)', borderRadius: 100 }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--red)', fontWeight: 700, minWidth: 20 }}>{ing.count}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(240,68,68,0.06)', border: '1px solid rgba(240,68,68,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--red)' }}>
              💡 Estos ingredientes necesitan mayor stock mínimo. Revisalos en la sección Stock.
            </div>
          </div>
        )}

        {/* Lista de rechazados */}
        {rejected.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', marginBottom: 8 }}>Sin rechazos registrados</div>
            <div style={{ fontSize: '0.85rem' }}>Los pedidos cancelados desde cocina aparecerán aquí</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rejected.map((r, i) => {
              const reasonInfo = REASON_LABELS[r.reason] || REASON_LABELS.otro;
              return (
                <div key={i} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--gold)' }}>
                          {r.publicCode || r.orderNumber}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>{r.orderNumber}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, background: `${reasonInfo.color}18`, color: reasonInfo.color, border: `1px solid ${reasonInfo.color}40` }}>
                          {reasonInfo.emoji} {reasonInfo.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{r.client?.name}</div>
                      {r.client?.whatsapp && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{r.client.whatsapp}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--red)' }}>-{fmt(r.total)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>
                        {new Date(r.rejectedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '8px 12px', marginBottom: r.notes || r.missingStock?.length ? 10 : 0 }}>
                    {r.items?.map((item, j) => (
                      <div key={j} style={{ fontSize: '0.82rem', color: 'var(--gray-light)' }}>
                        ×{item.quantity} {item.productName} {item.variant}
                      </div>
                    ))}
                  </div>

                  {/* Notas */}
                  {r.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--yellow)', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
                      📝 {r.notes}
                    </div>
                  )}

                  {/* Stock faltante */}
                  {r.missingStock?.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--red)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.missingStock.map((ms, k) => (
                        <span key={k} style={{ background: 'rgba(240,68,68,0.1)', border: '1px solid rgba(240,68,68,0.2)', borderRadius: 6, padding: '2px 8px' }}>
                          📦 {ms.ingredient}: tenía {ms.available}, necesitaba {ms.needed}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
