import { useState, useEffect } from 'react';
import { Edit2, Check, X, Target, AlertTriangle, ShoppingCart } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmt = n => `$${Number(n||0).toLocaleString('es-AR')}`;

export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [filter, setFilter] = useState('all');
  const [target, setTarget] = useState(50);
  const [productionCheck, setProductionCheck] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const navigate = useNavigate();

  const fetchStocks = () => {
    API.get('/stock').then(r => setStocks(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStocks(); }, []);

  const checkProduction = async () => {
    setCheckLoading(true);
    try {
      const res = await API.get(`/shopping/production?target=${target}`);
      setProductionCheck(res.data);
    } catch { toast.error('Error al verificar producción'); }
    finally { setCheckLoading(false); }
  };

  const startEdit = (stock) => {
    setEditing(stock._id);
    setEditValues({ currentStock: stock.currentStock, minimumStock: stock.minimumStock, notes: stock.notes || '' });
  };

  const saveEdit = async (stockId) => {
    try {
      const res = await API.put(`/stock/${stockId}`, editValues);
      setStocks(prev => prev.map(s => s._id === stockId ? res.data : s));
      setEditing(null);
      toast.success('Stock actualizado');
    } catch { toast.error('Error al actualizar stock'); }
  };

  const filtered = filter === 'all' ? stocks : stocks.filter(s => s.status === filter);
  const counts = {
    all: stocks.length,
    out: stocks.filter(s => s.status === 'out').length,
    low: stocks.filter(s => s.status === 'low').length,
    ok: stocks.filter(s => s.status === 'ok').length
  };
  const totalValue = stocks.reduce((sum, s) => sum + (s.currentStock * (s.ingredient?.costPerUnit || 0)), 0);

  return (
    <>
      <div className="page-header">
        <h1>Control de Stock</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchStocks}>↻ Actualizar</button>
      </div>
      <div className="page-body">

        {/* Cards resumen */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Sin Stock 🔴', value: counts.out, color: 'var(--red)' },
            { label: 'Stock Bajo 🟡', value: counts.low, color: 'var(--yellow)' },
            { label: 'OK 🟢', value: counts.ok, color: 'var(--green)' }
          ].map(c => (
            <div key={c.label} className="card" style={{ borderColor: c.color }}>
              <div className="card-title">{c.label}</div>
              <div className="card-value" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
          <div className="card" style={{ borderColor: 'var(--gold)' }}>
            <div className="card-title">💰 Valor en mercadería</div>
            <div className="card-value" style={{ color: 'var(--gold)', fontSize: 'clamp(0.95rem, 2vw, 1.3rem)', wordBreak: 'break-all' }}>{fmt(totalValue)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Costo total del stock actual</div>
          </div>
        </div>

        {/* ── Verificador de producción mínima ─────────────────────────── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Target size={18} color="var(--gold)" />
            <span style={{ fontWeight: 700 }}>Verificador de producción</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 14 }}>
            Calculá si tu stock actual alcanza para producir una cantidad objetivo de hamburguesas.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Objetivo de hamburguesas</label>
              <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))}
                min={1} style={{ width: 100 }} />
            </div>
            <button className="btn btn-primary" onClick={checkProduction} disabled={checkLoading}>
              {checkLoading ? '...' : '🔍 Verificar'}
            </button>
            {productionCheck && (
              <button className="btn btn-secondary" onClick={() => navigate('/compras')}>
                <ShoppingCart size={14}/> Ver lista de compras
              </button>
            )}
          </div>

          {/* Resultado */}
          {productionCheck && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: productionCheck.isReady ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${productionCheck.isReady ? '#22c55e' : '#ef4444'}`
              }}>
                <span style={{ fontSize: '1.5rem' }}>{productionCheck.isReady ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: productionCheck.isReady ? '#22c55e' : '#ef4444' }}>
                    {productionCheck.isReady
                      ? `Podés hacer las ${target} hamburguesas`
                      : `Solo podés hacer ${productionCheck.canProduceNow} de ${target} hamburguesas`}
                  </div>
                  {!productionCheck.isReady && (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: 2 }}>
                      Faltan ingredientes para {productionCheck.criticalItems} ítem{productionCheck.criticalItems > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Ítems críticos */}
              {productionCheck.items?.filter(i => i.isCritical).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Ingredientes que faltan
                  </div>
                  {productionCheck.items.filter(i => i.isCritical).map(item => (
                    <div key={item.ingredientId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, marginBottom: 6,
                      border: '1px solid rgba(239,68,68,0.2)'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, marginRight: 8 }}>{item.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{item.category}</span>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                        <div style={{ color: '#ef4444', fontWeight: 700 }}>Falta: {item.deficit} {item.unit}</div>
                        <div style={{ color: 'var(--gray)' }}>Tenés: {item.currentStock} / Necesitás: {item.needed}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alerta rápida si hay críticos */}
        {counts.out > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 16 }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>
              {counts.out} ingrediente{counts.out > 1 ? 's' : ''} sin stock — la producción puede verse afectada
            </span>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {Object.entries({ all: 'Todos', out: 'Sin Stock', low: 'Bajo', ok: 'OK' }).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`}>
              {v} ({counts[k]})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                  <th>Costo unit.</th>
                  <th>Valor stock</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(stock => (
                  <tr key={stock._id} style={{ background: stock.status === 'out' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{stock.ingredient?.name}</div>
                      {stock.ingredient?.perishable && <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>Perecedero</div>}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{stock.ingredient?.category}</td>
                    <td>
                      {editing === stock._id ? (
                        <input type="number" value={editValues.currentStock}
                          onChange={e => setEditValues(v => ({ ...v, currentStock: Number(e.target.value) }))}
                          style={{ width: 90 }} min={0} />
                      ) : (
                        <span style={{ fontWeight: 700, color: stock.status === 'out' ? '#ef4444' : 'inherit' }}>
                          {stock.currentStock.toLocaleString('es-AR')}
                        </span>
                      )}
                    </td>
                    <td>
                      {editing === stock._id ? (
                        <input type="number" value={editValues.minimumStock}
                          onChange={e => setEditValues(v => ({ ...v, minimumStock: Number(e.target.value) }))}
                          style={{ width: 90 }} min={0} />
                      ) : stock.minimumStock.toLocaleString('es-AR')}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{stock.unit}</td>
                    <td>
                      <span className={`badge badge-${stock.status}`}>
                        {stock.status === 'out' ? '🔴 Sin Stock' : stock.status === 'low' ? '🟡 Bajo' : '🟢 OK'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>
                      {stock.ingredient?.costPerUnit ? fmt(stock.ingredient.costPerUnit) : '—'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--gold)' }}>
                      {stock.ingredient?.costPerUnit ? fmt(Math.round(stock.currentStock * stock.ingredient.costPerUnit)) : '—'}
                    </td>
                    <td>
                      {editing === stock._id ? (
                        <input value={editValues.notes}
                          onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                          placeholder="Notas..." style={{ width: 140 }} />
                      ) : <span style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>{stock.notes || '—'}</span>}
                    </td>
                    <td>
                      {editing === stock._id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" onClick={() => saveEdit(stock._id)} style={{ color: 'var(--green)' }}><Check size={14}/></button>
                          <button className="btn-icon" onClick={() => setEditing(null)} style={{ color: 'var(--red)' }}><X size={14}/></button>
                        </div>
                      ) : (
                        <button className="btn-icon" onClick={() => startEdit(stock)}><Edit2 size={14}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
