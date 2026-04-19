import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, RefreshCw, Trash2, CheckSquare, Square } from 'lucide-react';
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
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setSelected(new Set());
    Promise.all([
      API.get('/rejected-orders'),
      API.get('/rejected-orders/stats').catch(() => null)
    ]).then(([r, s]) => {
      setRejected(r.data);
      if (s) setStats(s.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rejected.length) setSelected(new Set());
    else setSelected(new Set(rejected.map(r => r._id)));
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`¿Eliminar ${selected.size} pedido(s) rechazado(s)?`)) return;
    setDeleting(true);
    try {
      await API.delete('/rejected-orders', { data: { ids: [...selected] } });
      toast.success(`${selected.size} eliminado(s)`);
      load();
    } catch { toast.error('Error al eliminar'); }
    finally { setDeleting(false); }
  };

  const deleteAll = async () => {
    if (!window.confirm(`¿Eliminar TODOS los ${rejected.length} pedidos rechazados? Esto no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await API.delete('/rejected-orders', { data: { all: true } });
      toast.success('Historial limpiado');
      load();
    } catch { toast.error('Error al eliminar'); }
    finally { setDeleting(false); }
  };

  const deleteSingle = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await API.delete(`/rejected-orders/${id}`);
      setRejected(prev => prev.filter(r => r._id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1><XCircle size={20} style={{ display: 'inline', marginRight: 8 }} />Pedidos Rechazados</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Actualizar</button>
          {rejected.length > 0 && (
            <>
              {selected.size > 0 && (
                <button className="btn btn-secondary" onClick={deleteSelected} disabled={deleting}
                  style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                  <Trash2 size={14} /> Eliminar ({selected.size})
                </button>
              )}
              <button className="btn btn-secondary" onClick={deleteAll} disabled={deleting}
                style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                <Trash2 size={14} /> Limpiar todo
              </button>
            </>
          )}
        </div>
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
          <>
            {/* Barra de selección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: 0 }}>
                {selected.size === rejected.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {selected.size === rejected.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
              {selected.size > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{selected.size} seleccionado(s)</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rejected.map((r) => {
                const reasonInfo = REASON_LABELS[r.reason] || REASON_LABELS.otro;
                const isSelected = selected.has(r._id);
                return (
                  <div key={r._id} onClick={() => toggleSelect(r._id)} className="card"
                    style={{ padding: '16px 20px', cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`, opacity: isSelected ? 1 : 0.9, transition: 'border-color 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        {/* Checkbox visual */}
                        <div style={{ marginTop: 2, color: isSelected ? 'var(--gold)' : 'var(--gray)', flexShrink: 0 }}>
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
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
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--red)' }}>-{fmt(r.total)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>
                            {new Date(r.rejectedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                        <button onClick={(e) => deleteSingle(r._id, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, opacity: 0.7, marginTop: 2 }}
                          title="Eliminar">
                          <Trash2 size={15} />
                        </button>
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
          </>
        )}
      </div>
    </>
  );
}


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
