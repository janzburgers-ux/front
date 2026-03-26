import { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, Target, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const PRIORITY_INFO = {
  A: { label: 'CRÍTICO — Comprar primero', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', emoji: '🔴' },
  B: { label: 'IMPORTANTE', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', emoji: '🟡' },
  C: { label: 'SECUNDARIO', color: 'var(--gray)', bg: 'rgba(255,255,255,0.02)', emoji: '⚪' }
};

function ItemRow({ item }) {
  const pct = item.needed > 0 ? Math.min(100, Math.round((item.currentStock / item.needed) * 100)) : 100;
  const barColor = pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{item.name}</span>
          {item.perishable && <span style={{ fontSize: '0.68rem', color: 'var(--gold)', marginLeft: 6, background: 'rgba(232,184,75,0.1)', padding: '1px 6px', borderRadius: 100 }}>Perecedero</span>}
          {item.isCritical && <span style={{ fontSize: '0.68rem', color: '#ef4444', marginLeft: 6, background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 100 }}>Falta stock</span>}
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>{item.category}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {item.isCritical && item.estimatedCost > 0 && (
            <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmt(item.estimatedCost)}</div>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>
            {item.currentStock} / {item.needed} {item.unit}
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 4, background: 'var(--dark)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      {item.isCritical && (
        <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>
          ↑ Necesitás comprar: <strong>{item.deficit} {item.unit}</strong>
        </div>
      )}
    </div>
  );
}

export default function Shopping() {
  const [mode, setMode] = useState('standard'); // standard | production
  const [list, setList] = useState(null);
  const [prodList, setProdList] = useState(null);
  const [target, setTarget] = useState(50);
  const [loading, setLoading] = useState(true);
  const [prodLoading, setProdLoading] = useState(false);

  const fetchStandard = () => {
    setLoading(true);
    API.get('/shopping')
      .then(r => setList(r.data))
      .catch(() => toast.error('Error al cargar lista de compras'))
      .finally(() => setLoading(false));
  };

  const fetchProduction = async () => {
    setProdLoading(true);
    try {
      const res = await API.get(`/shopping/production?target=${target}`);
      setProdList(res.data);
    } catch { toast.error('Error al calcular lista'); }
    finally { setProdLoading(false); }
  };

  useEffect(() => { fetchStandard(); }, []);

  // ── Vista estándar (deficit vs mínimo) ────────────────────────────────────
  const grouped = list?.items?.reduce((acc, item) => {
    if (!acc[item.priority]) acc[item.priority] = [];
    acc[item.priority].push(item);
    return acc;
  }, {}) || {};

  // ── Vista producción ──────────────────────────────────────────────────────
  const prodGrouped = prodList?.items?.reduce((acc, item) => {
    const key = item.isCritical ? 'critical' : 'ok';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {}) || {};

  return (
    <>
      <div className="page-header">
        <h1>Lista de Compras</h1>
        <button className="btn btn-secondary btn-sm" onClick={mode === 'standard' ? fetchStandard : fetchProduction}>
          <RefreshCw size={14}/> Actualizar
        </button>
      </div>
      <div className="page-body">

        {/* Toggle de modo */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setMode('standard')}
            className={`btn ${mode === 'standard' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>
            <ShoppingCart size={15}/> Lista estándar
          </button>
          <button onClick={() => setMode('production')}
            className={`btn ${mode === 'production' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>
            <Target size={15}/> Por objetivo de producción
          </button>
        </div>

        {/* ── MODO ESTÁNDAR ─────────────────────────────────────────────── */}
        {mode === 'standard' && (
          <>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={14}/>
              Lista generada automáticamente por prioridad ABC. Ítems en rojo bloquean la producción.
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
            ) : !list ? (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--gold)' }}>Sin datos</div>
                <div style={{ color: 'var(--gray)', marginTop: 8 }}>No se pudo cargar la lista. Intentá actualizar.</div>
              </div>
            ) : list?.items?.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#22c55e' }}>Stock Completo</div>
                <div style={{ color: 'var(--gray)', marginTop: 8 }}>No hay ítems para comprar</div>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--card)', border: '1px solid var(--gold)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Inversión estimada</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--gold)' }}>{fmt(list.totalEstimated)}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray)', textAlign: 'right' }}>
                    <div>{list.items?.length} ítems para comprar</div>
                    <div style={{ color: '#ef4444' }}>{list.items?.filter(i => i.priority === 'A').length} críticos</div>
                  </div>
                </div>

                {['A', 'B', 'C'].map(priority => {
                  const items = grouped[priority];
                  if (!items?.length) return null;
                  const info = PRIORITY_INFO[priority];
                  return (
                    <div key={priority} style={{ background: info.bg, border: `1px solid ${info.color}22`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span>{info.emoji}</span>
                        <span style={{ fontWeight: 700, color: info.color, fontSize: '0.8rem', textTransform: 'uppercase' }}>{info.label}</span>
                        <span style={{ marginLeft: 'auto', background: info.color, color: '#000', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px' }}>{items.length}</span>
                      </div>
                      {items.map(item => (
                        <div key={item.ingredient} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.name}
                              {item.perishable && <span style={{ fontSize: '0.68rem', color: 'var(--gold)', marginLeft: 6 }}>Perecedero</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                              Stock: {item.currentStock} / Mínimo: {item.minimumStock} {item.unit}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: info.color }}>Comprar: {item.deficit} {item.unit}</div>
                            {item.estimatedCost > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{fmt(item.estimatedCost)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── MODO PRODUCCIÓN ───────────────────────────────────────────── */}
        {mode === 'production' && (
          <>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>¿Cuántas hamburguesas querés hacer?</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 14 }}>
                Calculamos automáticamente todos los ingredientes y packaging necesarios para ese objetivo.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Objetivo</label>
                  <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))}
                    min={1} style={{ width: 100 }} />
                </div>
                <button className="btn btn-primary" onClick={fetchProduction} disabled={prodLoading}>
                  {prodLoading ? '...' : '🔍 Calcular'}
                </button>
              </div>
            </div>

            {prodLoading ? (
              <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
            ) : prodList && (
              <>
                {/* Estado general */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 12, marginBottom: 20,
                  background: prodList.isReady ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${prodList.isReady ? '#22c55e' : '#ef4444'}`
                }}>
                  <span style={{ fontSize: '2rem' }}>{prodList.isReady ? '✅' : '⚠️'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: prodList.isReady ? '#22c55e' : '#ef4444' }}>
                      {prodList.isReady
                        ? `✔ Stock suficiente para ${target} hamburguesas`
                        : `Stock para ${prodList.canProduceNow} de ${target} hamburguesas`}
                    </div>
                    {!prodList.isReady && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginTop: 2 }}>
                        {prodList.criticalItems} ingrediente{prodList.criticalItems !== 1 ? 's' : ''} insuficiente{prodList.criticalItems !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {prodList.totalEstimated > 0 && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', textTransform: 'uppercase' }}>A comprar</div>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--gold)' }}>{fmt(prodList.totalEstimated)}</div>
                    </div>
                  )}
                </div>

                {/* Ítems que faltan */}
                {prodGrouped.critical?.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <AlertTriangle size={16} color="#ef4444"/>
                      <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ingredientes insuficientes</span>
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px' }}>{prodGrouped.critical.length}</span>
                    </div>
                    {prodGrouped.critical.map(item => <ItemRow key={item.ingredientId} item={item} />)}
                  </div>
                )}

                {/* Ítems OK */}
                {prodGrouped.ok?.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem', textTransform: 'uppercase' }}>✅ Suficiente stock</span>
                      <span style={{ marginLeft: 'auto', background: '#22c55e', color: '#000', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px' }}>{prodGrouped.ok.length}</span>
                    </div>
                    {prodGrouped.ok.map(item => <ItemRow key={item.ingredientId} item={item} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}