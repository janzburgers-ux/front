import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Settings, TrendingUp, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Tarjeta de cajita ─────────────────────────────────────────────────────────
function BucketCard({ bucket, total }) {
  const amount = Math.round((total || 0) * bucket.percent / 100);
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
      opacity: bucket.active ? 1 : 0.45,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.4rem' }}>{bucket.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{bucket.label}</div>
            {bucket.description && (
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>{bucket.description}</div>
            )}
          </div>
        </div>
        {!bucket.active && (
          <span style={{ fontSize: '0.68rem', background: 'var(--dark)', color: 'var(--gray)', padding: '2px 8px', borderRadius: 100, border: '1px solid var(--border)' }}>
            Inactiva
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'var(--gold)', marginBottom: 4 }}>
        {bucket.active ? fmt(amount) : '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--dark)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${bucket.active ? bucket.percent : 0}%`, background: 'var(--gold)', borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--gray)', minWidth: 36, textAlign: 'right' }}>
          {bucket.active ? `${bucket.percent}%` : '0%'}
        </span>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Finance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [tab, setTab]     = useState('resumen'); // resumen | noches | cajitas

  const [config, setConfig]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [nights, setNights]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal nueva noche
  const [showNight, setShowNight] = useState(false);
  const [nightForm, setNightForm] = useState({ date: new Date().toISOString().split('T')[0], totalRevenue: '', ayudante: '', notes: '' });
  const [savingNight, setSavingNight]   = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  // Modal configurar cajitas
  const [showConfig, setShowConfig]     = useState(false);
  const [editBuckets, setEditBuckets]   = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, sumRes, nightsRes] = await Promise.all([
        API.get('/finance/config'),
        API.get(`/finance/summary?month=${month}&year=${year}`),
        API.get(`/finance/nights?month=${month}&year=${year}`),
      ]);
      setConfig(cfgRes.data);
      setSummary(sumRes.data);
      setNights(nightsRes.data);
    } catch { toast.error('Error al cargar finanzas'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Navegación de mes ───────────────────────────────────────────────────────
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); };

  // ── Buscar total de ventas de una fecha ─────────────────────────────────────
  const fetchDailyRevenue = async (date) => {
    if (!date) return;
    setLoadingRevenue(true);
    try {
      const res = await API.get(`/finance/daily-revenue?date=${date}`);
      const { totalRevenue, orderCount } = res.data;
      setNightForm(f => ({ ...f, totalRevenue: totalRevenue || '' }));
      if (totalRevenue > 0) {
        toast.success(`${orderCount} pedidos entregados — $${Number(totalRevenue).toLocaleString('es-AR')}`);
      } else {
        toast.error('Sin pedidos entregados ese día');
      }
    } catch { toast.error('Error al buscar ventas'); }
    finally { setLoadingRevenue(false); }
  };

  // ── Guardar noche ───────────────────────────────────────────────────────────
  const handleSaveNight = async () => {
    if (!nightForm.totalRevenue) return toast.error('Ingresá el total de la noche');
    setSavingNight(true);
    try {
      await API.post('/finance/night', {
        date: nightForm.date,
        totalRevenue: Number(nightForm.totalRevenue),
        ayudante: Number(nightForm.ayudante || 0),
        notes: nightForm.notes,
      });
      toast.success('Noche registrada ✓');
      setShowNight(false);
      setNightForm({ date: new Date().toISOString().split('T')[0], totalRevenue: '', ayudante: '', notes: '' });
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Error al guardar'); }
    finally { setSavingNight(false); }
  };

  // ── Eliminar noche ──────────────────────────────────────────────────────────
  const handleDeleteNight = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await API.delete(`/finance/night/${id}`);
      toast.success('Eliminado');
      fetchAll();
    } catch { toast.error('Error al eliminar'); }
  };

  // ── Guardar cajitas ─────────────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    const activeTotal = editBuckets
      .filter(b => b.active && b.key !== 'ayudante')
      .reduce((s, b) => s + Number(b.percent || 0), 0);

    if (Math.round(activeTotal) !== 100) {
      return toast.error(`Los % activos deben sumar 100%. Ahora suman ${activeTotal}%`);
    }
    setSavingConfig(true);
    try {
      const res = await API.put('/finance/buckets', { buckets: editBuckets });
      setConfig(res.data);
      setShowConfig(false);
      toast.success('Cajitas actualizadas ✓');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Error al guardar'); }
    finally { setSavingConfig(false); }
  };

  const openConfig = () => {
    setEditBuckets(config?.buckets?.map(b => ({ ...b })) || []);
    setShowConfig(true);
  };

  const addBucket = () => {
    setEditBuckets(prev => [...prev, {
      key: `custom_${Date.now()}`, label: 'Nueva cajita', emoji: '💼',
      percent: 0, active: true, order: prev.length, description: ''
    }]);
  };

  const removeBucket = (idx) => setEditBuckets(prev => prev.filter((_, i) => i !== idx));

  const activeTotal = editBuckets.filter(b => b.active && b.key !== 'ayudante').reduce((s, b) => s + Number(b.percent || 0), 0);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  );

  return (
    <>
      <div className="page-header">
        <h1>💰 Finanzas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openConfig}>
            <Settings size={15}/> Cajitas
          </button>
          <button className="btn btn-primary" onClick={() => setShowNight(true)}>
            <Plus size={15}/> Registrar noche
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── Selector de mes ─────────────────────────────────────────────── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)', minWidth: 220, textAlign: 'center' }}>
            {months[month-1]} {year}
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronRight size={20}/></button>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: '0.8rem', color: 'var(--gray)' }}>
            <span>🌙 <strong style={{ color: 'var(--white)' }}>{summary?.nights || 0}</strong> noches</span>
            <span>💵 <strong style={{ color: 'var(--gold)' }}>{fmt(summary?.totalRevenue)}</strong></span>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { key: 'resumen', label: '📊 Resumen' },
            { key: 'noches',  label: '🌙 Noches' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', border: '1px solid',
              borderColor: tab === t.key ? 'var(--gold)' : 'var(--border)',
              background: tab === t.key ? 'rgba(232,184,75,0.12)' : 'var(--card)',
              color: tab === t.key ? 'var(--gold)' : 'var(--gray)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB RESUMEN ─────────────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <>
            {/* Cajitas del mes */}
            {(!summary || summary.nights === 0) ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌙</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin noches registradas este mes</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowNight(true)}>
                  <Plus size={14}/> Registrar primera noche
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {config?.buckets?.filter(b => b.active && b.key !== 'ayudante').map(b => {
                    const summaryBucket = summary?.buckets?.find(sb => sb.key === b.key);
                    return (
                      <div key={b.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: '1.4rem' }}>{b.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{b.description}</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--gold)', marginBottom: 4 }}>
                          {fmt(summaryBucket?.amount || 0)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--dark)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${b.percent}%`, background: 'var(--gold)', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--gray)', minWidth: 36, textAlign: 'right' }}>{b.percent}%</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Cajita ayudante (suma de todas las noches) */}
                  {(() => {
                    const ayudanteTotal = nights.reduce((s, n) => s + (n.ayudante || 0), 0);
                    return ayudanteTotal > 0 ? (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: '1.4rem' }}>👷</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ayudante</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Costo real pagado este mes</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#ef4444', marginBottom: 4 }}>
                          {fmt(ayudanteTotal)}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Resumen total */}
                <div style={{ background: 'var(--card)', border: '1px solid rgba(232,184,75,0.3)', borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color="var(--gold)"/> Resumen del mes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Ingresos totales', value: fmt(summary?.totalRevenue), color: 'var(--gold)' },
                      { label: 'Para vos este mes', value: fmt(summary?.buckets?.find(b => b.key === 'ganancia')?.amount), color: '#22c55e' },
                      { label: 'Para reinvertir', value: fmt(summary?.buckets?.find(b => b.key === 'reinversion')?.amount), color: 'var(--gold)' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', background: 'var(--dark)', borderRadius: 10, padding: '14px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── TAB NOCHES ──────────────────────────────────────────────────── */}
        {tab === 'noches' && (
          <>
            {nights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌙</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin noches registradas</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowNight(true)}>
                  <Plus size={14}/> Registrar noche
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {nights.map(night => (
                  <div key={night._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                          🌙 {new Date(night.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        {night.notes && <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>{night.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)' }}>{fmt(night.totalRevenue)}</div>
                          {night.ayudante > 0 && <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>👷 {fmt(night.ayudante)} ayudante</div>}
                        </div>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNight(night._id)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    {/* Distribución de la noche */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {night.distribution.filter(d => d.key !== 'ayudante').map(d => (
                        <div key={d.key} style={{ background: 'var(--dark)', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem' }}>
                          <span style={{ marginRight: 4 }}>{d.emoji}</span>
                          <span style={{ color: 'var(--gray)' }}>{d.label}: </span>
                          <strong style={{ color: 'var(--gold)' }}>{fmt(d.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL: Registrar noche ───────────────────────────────────────── */}
      {showNight && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNight(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>🌙 Registrar noche</h2>
              <button className="btn-icon" onClick={() => setShowNight(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Fecha</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" value={nightForm.date}
                    onChange={e => setNightForm(f => ({ ...f, date: e.target.value, totalRevenue: '' }))}
                    style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={() => fetchDailyRevenue(nightForm.date)} disabled={loadingRevenue}
                    style={{ whiteSpace: 'nowrap' }}>
                    {loadingRevenue ? '...' : '📊 Traer ventas'}
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 4, display: 'block' }}>
                  Trae automáticamente el total de pedidos entregados de ese día
                </span>
              </div>
              <div className="form-group">
                <label>Total de la noche ($) *</label>
                <input type="number" min="0" value={nightForm.totalRevenue}
                  onChange={e => setNightForm(f => ({ ...f, totalRevenue: e.target.value }))}
                  placeholder="Se completa automáticamente o ingresalo manual" />
              </div>
              <div className="form-group">
                <label>Costo del ayudante ($) <span style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>(opcional, si trabajaste con alguien)</span></label>
                <input type="number" min="0" value={nightForm.ayudante}
                  onChange={e => setNightForm(f => ({ ...f, ayudante: e.target.value }))}
                  placeholder="0" />
              </div>
              <div className="form-group">
                <label>Notas <span style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>(opcional)</span></label>
                <input value={nightForm.notes}
                  onChange={e => setNightForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ej: Noche con lluvia, bajaron las ventas" />
              </div>

              {/* Preview distribución */}
              {nightForm.totalRevenue > 0 && config?.buckets && (
                <div style={{ background: 'var(--dark)', borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', marginBottom: 10, textTransform: 'uppercase' }}>
                    Vista previa de distribución
                  </div>
                  {Number(nightForm.ayudante) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                      <span>👷 Ayudante</span>
                      <span style={{ color: '#ef4444' }}>−{fmt(nightForm.ayudante)}</span>
                    </div>
                  )}
                  {config.buckets.filter(b => b.active && b.key !== 'ayudante').map(b => {
                    const base = Math.max(0, Number(nightForm.totalRevenue) - Number(nightForm.ayudante || 0));
                    const amount = Math.round(base * b.percent / 100);
                    return (
                      <div key={b.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                        <span>{b.emoji} {b.label} ({b.percent}%)</span>
                        <strong style={{ color: 'var(--gold)' }}>{fmt(amount)}</strong>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total ingresado</span>
                    <span style={{ color: 'var(--gold)' }}>{fmt(nightForm.totalRevenue)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNight(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveNight} disabled={savingNight}>
                {savingNight ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Configurar cajitas ────────────────────────────────────── */}
      {showConfig && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConfig(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2>⚙️ Configurar cajitas</h2>
              <button className="btn-icon" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>
                El total de los % activos (excepto Ayudante) debe sumar exactamente 100%.
              </div>

              {/* Indicador de total */}
              <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>Total activos:</span>
                <strong style={{ color: Math.round(activeTotal) === 100 ? '#22c55e' : '#ef4444', fontSize: '1.1rem' }}>
                  {activeTotal}%
                  {Math.round(activeTotal) === 100 ? ' ✓' : ` (faltan ${100 - activeTotal}%)`}
                </strong>
              </div>

              {editBuckets.map((b, idx) => (
                <div key={b.key} style={{ background: 'var(--dark)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px auto auto', gap: 8, alignItems: 'center', marginBottom: b.key.startsWith('custom') ? 8 : 0 }}>
                    <input value={b.emoji} onChange={e => setEditBuckets(prev => prev.map((x,i) => i===idx ? {...x, emoji: e.target.value} : x))}
                      style={{ textAlign: 'center', fontSize: '1.2rem', padding: '4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--white)' }} />
                    <input value={b.label} onChange={e => setEditBuckets(prev => prev.map((x,i) => i===idx ? {...x, label: e.target.value} : x))}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--white)', fontSize: '0.9rem' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" min="0" max="100" value={b.percent}
                        onChange={e => setEditBuckets(prev => prev.map((x,i) => i===idx ? {...x, percent: Number(e.target.value)} : x))}
                        style={{ width: 52, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--white)', textAlign: 'center' }}
                        disabled={b.key === 'ayudante'} />
                      <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>%</span>
                    </div>
                    <button onClick={() => setEditBuckets(prev => prev.map((x,i) => i===idx ? {...x, active: !x.active} : x))}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: b.active ? 'rgba(34,197,94,0.15)' : 'var(--card)', color: b.active ? '#22c55e' : 'var(--gray)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {b.active ? '✓ Activa' : 'Inactiva'}
                    </button>
                    {b.key.startsWith('custom') && (
                      <button onClick={() => removeBucket(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                  {b.key === 'ayudante' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
                      El ayudante se resta antes de distribuir — no usa % fijo.
                    </div>
                  )}
                  {/* Descripción editable */}
                  <input value={b.description} onChange={e => setEditBuckets(prev => prev.map((x,i) => i===idx ? {...x, description: e.target.value} : x))}
                    placeholder="Descripción (opcional)"
                    style={{ width: '100%', marginTop: 8, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--gray)', fontSize: '0.8rem' }} />
                </div>
              ))}

              <button className="btn btn-secondary" onClick={addBucket} style={{ width: '100%', marginTop: 4 }}>
                <Plus size={14}/> Agregar cajita personalizada
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowConfig(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveConfig} disabled={savingConfig || Math.round(activeTotal) !== 100}>
                <Save size={14}/> {savingConfig ? 'Guardando...' : 'Guardar cajitas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}