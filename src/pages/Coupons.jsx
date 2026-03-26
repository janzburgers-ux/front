import { useState, useEffect } from 'react';
import { Ticket, Plus, Gift, TrendingUp, Star } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [nearThreshold, setNearThreshold] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('coupons');
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [form, setForm] = useState({ code: '', ownerId: '', discountForUser: 10, rewardPerUse: 5 });
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [awardModal, setAwardModal] = useState(null);
  const [awardPoints, setAwardPoints] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ code: '', discountForUser: 0, label: 'Admin' });

  useEffect(() => {
    Promise.all([
      API.get('/coupons'),
      API.get('/clients'),
      API.get('/coupons/stats').catch(() => null),
      API.get('/coupons/loyalty/near-threshold').catch(() => ({ data: [] })),
      API.get('/config').catch(() => null)
    ]).then(([c, cl, st, nt, cfg]) => {
      setCoupons(c.data);
      setClients(cl.data);
      if (st) setStats(st.data);
      setNearThreshold(nt.data || []);
      if (cfg) setLoyaltyConfig(cfg.data?.loyalty);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.code || !form.ownerId) { toast.error('Código y cliente son obligatorios'); return; }
    try {
      const res = await API.post('/coupons', form);
      setCoupons(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ code: '', ownerId: '', discountForUser: 10, rewardPerUse: 5 });
      toast.success('Cupón creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al crear cupón'); }
  };


  const handleCreateAdmin = async () => {
    if (!adminForm.code) { toast.error('Código requerido'); return; }
    try {
      const res = await API.post('/coupons/admin', adminForm);
      setCoupons(prev => [res.data, ...prev]);
      setShowAdminModal(false);
      setAdminForm({ code: '', discountForUser: 0, label: 'Admin' });
      toast.success('Cupón admin creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al crear cupón'); }
  };

  const handleToggle = async (coupon) => {
    try {
      const res = await API.patch(`/coupons/${coupon._id}/toggle`);
      setCoupons(prev => prev.map(c => c._id === coupon._id ? res.data : c));
      toast.success(`Cupón ${res.data.active ? 'activado' : 'desactivado'}`);
    } catch { toast.error('Error al cambiar estado'); }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`¿Eliminar el cupón "${coupon.code}" definitivamente? Esta acción no se puede deshacer.`)) return;
    try {
      await API.delete(`/coupons/${coupon._id}`);
      setCoupons(prev => prev.filter(c => c._id !== coupon._id));
      toast.success('Cupón eliminado');
    } catch { toast.error('Error al eliminar el cupón'); }
  };

  const handleResetReward = async (coupon) => {
    try {
      await API.put(`/coupons/${coupon._id}`, { ownerPendingDiscount: 0 });
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, ownerPendingDiscount: 0 } : c));
      toast.success(`Recompensa de ${coupon.ownerName} marcada como usada`);
    } catch { toast.error('Error'); }
  };

  const handleAwardPoints = async () => {
    if (!awardPoints || Number(awardPoints) <= 0) { toast.error('Ingresá una cantidad válida'); return; }
    try {
      await API.post('/coupons/loyalty/award', { clientId: awardModal._id, points: Number(awardPoints) });
      toast.success(`${awardPoints} puntos acreditados a ${awardModal.name}`);
      setAwardModal(null);
      setAwardPoints('');
      const nt = await API.get('/coupons/loyalty/near-threshold');
      setNearThreshold(nt.data || []);
    } catch { toast.error('Error al acreditar puntos'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1><Ticket size={22} style={{ display: 'inline', marginRight: 10 }} />Cuponera</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowAdminModal(true)}>
            🔑 Cupón Admin
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16}/> Nuevo Cupón
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Stats */}
        {stats && (
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Cupones activos',    value: stats.activeCoupons,                       color: 'var(--green)' },
              { label: 'Usos totales',       value: stats.totalUses,                           color: 'var(--white)' },
              { label: 'Descuento otorgado', value: fmt(stats.totalDiscountAmount),            color: 'var(--red)'   },
              { label: 'Pedidos con cupón',  value: stats.ordersWithCoupon,                    color: 'var(--gold)'  },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Descuento mensual */}
        {stats?.monthlyDiscount?.length > 0 && (
          <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
            <div className="section-title" style={{ marginBottom: 14 }}>💸 Costo de cupones por mes</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {stats.monthlyDiscount.map((m, i) => (
                <div key={i} style={{ flex: 1, background: 'var(--dark)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: m.discount > 0 ? 'var(--red)' : 'var(--gray)', lineHeight: 1 }}>
                    -{fmt(m.discount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>{m.orders} pedidos con cupón</div>
                  {m.revenue > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>
                      {m.discount > 0 ? `${((m.discount / (m.revenue + m.discount)) * 100).toFixed(1)}% del bruto` : '0%'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab('coupons')} className={`btn btn-sm ${tab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`}>
            🎟️ Cupones de referido
          </button>
          <button onClick={() => setTab('loyalty')} className={`btn btn-sm ${tab === 'loyalty' ? 'btn-primary' : 'btn-secondary'}`}>
            🏆 Fidelización
            {nearThreshold.length > 0 && (
              <span style={{ marginLeft: 6, background: '#E8B84B', color: '#000', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px' }}>
                {nearThreshold.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB: Cupones de referido ── */}
        {tab === 'coupons' && (
          <>
            {coupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎟️</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', marginBottom: 8 }}>Sin cupones todavía</div>
                <div style={{ fontSize: '0.85rem' }}>Creá un cupón y asignalo a un cliente estrella</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {coupons.map(coupon => (
                  <div key={coupon._id} style={{
                    background: 'var(--card)',
                    border: `1px solid ${coupon.active ? 'var(--border)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 12, padding: 20,
                    opacity: coupon.active ? 1 : 0.55,
                    transition: 'opacity 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>{coupon.code}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 2 }}>
                          👤 Dueño: <strong style={{ color: 'white' }}>{coupon.ownerName}</strong>
                        </div>
                      </div>

                      {/* Toggle switch + Eliminar */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          onClick={() => handleDelete(coupon)}
                          title="Eliminar cupón"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          🗑️ Eliminar
                        </button>
                        <div
                          onClick={() => handleToggle(coupon)}
                          title={coupon.active ? 'Desactivar cupón' : 'Activar cupón'}
                          style={{
                            width: 44, height: 24, borderRadius: 100, cursor: 'pointer',
                            transition: 'background 0.2s',
                            background: coupon.active
                              ? 'linear-gradient(135deg, var(--gold-dark), var(--gold))'
                              : 'rgba(255,255,255,0.12)',
                            position: 'relative', flexShrink: 0
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: 3,
                            left: coupon.active ? 23 : 3,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#fff', transition: 'left 0.2s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: coupon.active ? 'var(--green)' : 'var(--gray)', fontWeight: 600 }}>
                          {coupon.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {coupon.unlimited && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 100, padding: '2px 8px', fontWeight: 700 }}>
                            ∞ Admin
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                      {[
                        { label: 'Descuento para usuario', value: `${coupon.discountForUser}%` },
                        { label: 'Recompensa por uso',     value: `${coupon.rewardPerUse}%`    },
                        { label: 'Usos totales',           value: coupon.totalUses             }
                      ].map(s => (
                        <div key={s.label} style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recompensa pendiente */}
                    {coupon.ownerPendingDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.85rem' }}>
                          🎁 Recompensa pendiente para <strong>{coupon.ownerName}</strong>: <strong style={{ color: 'var(--gold)' }}>{coupon.ownerPendingDiscount}%</strong>
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleResetReward(coupon)}>
                          Marcar como usada
                        </button>
                      </div>
                    )}

                    {/* Historial de usos */}
                    {coupon.uses?.length > 0 && (
                      <div>
                        <button
                          onClick={() => setSelectedCoupon(selectedCoupon?._id === coupon._id ? null : coupon)}
                          style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                        >
                          {selectedCoupon?._id === coupon._id ? '▲ Ocultar usos' : `▼ Ver ${coupon.uses.length} uso${coupon.uses.length > 1 ? 's' : ''}`}
                        </button>
                        {selectedCoupon?._id === coupon._id && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {coupon.uses.map((use, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 10px', background: 'var(--dark)', borderRadius: 6 }}>
                                <span>{use.clientName} <span style={{ color: 'var(--gray)' }}>· {use.orderNumber}</span></span>
                                <span style={{ color: 'var(--gold)' }}>-{use.discountApplied}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Fidelización ── */}
        {tab === 'loyalty' && (
          <>
            {loyaltyConfig && (
              <div style={{ background: loyaltyConfig.enabled ? 'rgba(232,184,75,0.06)' : 'var(--card)', border: `1px solid ${loyaltyConfig.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{loyaltyConfig.enabled ? '🟢' : '⚪'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {loyaltyConfig.enabled ? 'Sistema de puntos activo' : 'Sistema de puntos inactivo'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                    {loyaltyConfig.enabled
                      ? `1 punto cada $${loyaltyConfig.pointsPerPeso} • Cupón al llegar a ${loyaltyConfig.redeemThreshold} pts • ${loyaltyConfig.couponPercent}% de descuento`
                      : 'Activalo desde Configuración → Fidelización'}
                  </div>
                </div>
              </div>
            )}

            {nearThreshold.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏆</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', marginBottom: 6 }}>Sin clientes cerca del umbral</div>
                <div style={{ fontSize: '0.82rem' }}>
                  {loyaltyConfig?.enabled ? 'Aparecerán aquí cuando estén al 70% del umbral de canje' : 'Activá el sistema de puntos para empezar a acumular'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={16} color="var(--gold)"/> Clientes cerca del umbral de canje
                </div>
                {nearThreshold.map(client => {
                  const threshold = loyaltyConfig?.redeemThreshold || 500;
                  const pct = Math.min(100, Math.round((client.loyaltyPoints / threshold) * 100));
                  return (
                    <div key={client._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{client.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{client.whatsapp}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: pct >= 100 ? '#22c55e' : 'var(--gold)' }}>
                            {client.loyaltyPoints} pts
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>de {threshold}</div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--dark)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22c55e' : 'var(--gold)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: pct >= 100 ? '#22c55e' : 'var(--gray)' }}>
                          {pct >= 100 ? '🎉 ¡Listo para canjear!' : `${pct}% — le faltan ${threshold - client.loyaltyPoints} puntos`}
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setAwardModal(client); setAwardPoints(''); }}>
                          <Gift size={13}/> Acreditar puntos
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal nuevo cupón */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎟️ Nuevo Cupón de Referido</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Código *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ej: CARLOS10" />
              </div>
              <div className="form-group">
                <label>Cliente estrella (dueño) *</label>
                <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
                  <option value="">Seleccioná un cliente...</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Descuento para quien lo usa (%)</label>
                  <input type="number" value={form.discountForUser} onChange={e => setForm(f => ({ ...f, discountForUser: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Recompensa para el dueño (%)</label>
                  <input type="number" value={form.rewardPerUse} onChange={e => setForm(f => ({ ...f, rewardPerUse: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Crear Cupón</button>
            </div>
          </div>
        </div>
      )}


      {/* Modal cupón admin */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Cupón Admin</h2>
              <button className="btn-icon" onClick={() => setShowAdminModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#a5b4fc' }}>
                💡 Este cupón es de <strong>uso ilimitado</strong> — podés aplicarlo todas las veces que quieras y desactivarlo con el switch cuando no lo necesites. Ideal para que vos o tu equipo paguen al costo sin perder en mercadería.
              </div>
              <div className="form-group">
                <label>Código *</label>
                <input value={adminForm.code} onChange={e => setAdminForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Ej: COSTO2024" />
              </div>
              <div className="form-group">
                <label>Nombre / etiqueta</label>
                <input value={adminForm.label} onChange={e => setAdminForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Para mí, Para el equipo..." />
              </div>
              <div className="form-group">
                <label>% de descuento</label>
                <input type="number" min={0} max={100} value={adminForm.discountForUser} onChange={e => setAdminForm(f => ({ ...f, discountForUser: Number(e.target.value) }))} />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
                  Poné el % que cubre tu ganancia. Ej: si tu margen es 40%, poné 40 — pagás solo el costo.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdminModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateAdmin}>Crear Cupón Admin</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal acreditar puntos */}
      {awardModal && (
        <div className="modal-overlay" onClick={() => setAwardModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏆 Acreditar puntos</h2>
              <button className="btn-icon" onClick={() => setAwardModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray)', marginBottom: 16 }}>
                Acreditá puntos manualmente a <strong style={{ color: 'white' }}>{awardModal.name}</strong>.
                Actualmente tiene <strong style={{ color: 'var(--gold)' }}>{awardModal.loyaltyPoints || 0} puntos</strong>.
              </p>
              <div className="form-group">
                <label>Puntos a acreditar</label>
                <input type="number" value={awardPoints} onChange={e => setAwardPoints(e.target.value)} placeholder="ej: 50" min={1} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAwardModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAwardPoints}>Acreditar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
