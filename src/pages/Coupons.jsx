import { useState, useEffect } from 'react';
import { Ticket, Plus, Gift, TrendingUp, Star, Tag } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

export default function Coupons() {
  const [coupons, setCoupons]         = useState([]);
  const [clients, setClients]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [nearThreshold, setNearThreshold] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('coupons');
  const [showModal, setShowModal]     = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [form, setForm]               = useState({ code: '', ownerId: '', discountForUser: 10, rewardPerUse: 5, applicableProduct: '', expiresAt: '' });
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [awardModal, setAwardModal]   = useState(null);
  const [awardPoints, setAwardPoints] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm]     = useState({ code: '', discountForUser: 0, label: 'Admin', applicableProduct: '', applicableProductName: '', expiresAt: '' });
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleForm, setSingleForm]   = useState({ code: '', discountForUser: 10, label: 'Promo', applicableProduct: '', applicableProductName: '', expiresAt: '' });

  useEffect(() => {
    Promise.all([
      API.get('/coupons'),
      API.get('/clients'),
      API.get('/coupons/stats').catch(() => null),
      API.get('/coupons/loyalty/near-threshold').catch(() => ({ data: [] })),
      API.get('/config').catch(() => null),
      API.get('/public/menu').catch(() => null)
    ]).then(([c, cl, st, nt, cfg, menu]) => {
      setCoupons(c.data);
      setClients(cl.data);
      if (st) setStats(st.data);
      setNearThreshold(nt.data || []);
      if (cfg) setLoyaltyConfig(cfg.data?.loyalty);
      // Flatten products from menu
      if (menu?.data?.menu) {
        const prods = [];
        Object.entries(menu.data.menu).forEach(([, variants]) => variants.forEach(v => prods.push(v)));
        setProducts(prods);
      }
    }).finally(() => setLoading(false));
  }, []);

  const getProductName = (productId) => {
    if (!productId) return null;
    const p = products.find(p => p._id === productId);
    return p ? `${p.name} ${p.variant}` : null;
  };

  const handleCreate = async () => {
    if (!form.code || !form.ownerId) { toast.error('Código y cliente son obligatorios'); return; }
    try {
      const payload = {
        ...form,
        applicableProduct: form.applicableProduct || null,
        applicableProductName: form.applicableProduct ? getProductName(form.applicableProduct) : null,
        expiresAt: form.expiresAt || null
      };
      const res = await API.post('/coupons', payload);
      setCoupons(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ code: '', ownerId: '', discountForUser: 10, rewardPerUse: 5, applicableProduct: '', expiresAt: '' });
      toast.success('Cupón creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al crear cupón'); }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.code) { toast.error('Código requerido'); return; }
    try {
      const payload = {
        ...adminForm,
        applicableProduct: adminForm.applicableProduct || null,
        applicableProductName: adminForm.applicableProduct ? getProductName(adminForm.applicableProduct) : null,
        expiresAt: adminForm.expiresAt || null
      };
      const res = await API.post('/coupons/admin', payload);
      setCoupons(prev => [res.data, ...prev]);
      setShowAdminModal(false);
      setAdminForm({ code: '', discountForUser: 0, label: 'Admin', applicableProduct: '', expiresAt: '' });
      toast.success('Cupón admin creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al crear cupón'); }
  };

  const handleCreateSingle = async () => {
    if (!singleForm.code) { toast.error('Código requerido'); return; }
    try {
      const payload = {
        ...singleForm,
        applicableProduct: singleForm.applicableProduct || null,
        applicableProductName: singleForm.applicableProduct ? getProductName(singleForm.applicableProduct) : null,
        expiresAt: singleForm.expiresAt || null
      };
      const res = await API.post('/coupons/single-use', payload);
      setCoupons(prev => [res.data, ...prev]);
      setShowSingleModal(false);
      setSingleForm({ code: '', discountForUser: 10, label: 'Promo', applicableProduct: '', expiresAt: '' });
      toast.success('Cupón de uso único creado');
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
    if (!window.confirm(`¿Eliminar el cupón "${coupon.code}" definitivamente?`)) return;
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
    if (!awardPoints || isNaN(awardPoints)) { toast.error('Ingresá una cantidad válida'); return; }
    try {
      await API.post('/coupons/loyalty/award', { clientId: awardModal._id, points: Number(awardPoints) });
      toast.success(`${awardPoints} puntos acreditados a ${awardModal.name}`);
      setNearThreshold(prev => prev.map(c => c._id === awardModal._id ? { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + Number(awardPoints) } : c));
      setAwardModal(null);
    } catch { toast.error('Error al acreditar puntos'); }
  };

  // Componente selector de producto
  const ProductSelector = ({ value, onChange, placeholder = 'Todo el pedido (sin restricción)' }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="form-select">
      <option value="">{placeholder}</option>
      {products.map(p => (
        <option key={p._id} value={p._id}>{p.name} {p.variant} — {fmt(p.salePrice)}</option>
      ))}
    </select>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner"/></div>;

  const typeLabel = (c) => {
    if (c.type === 'product') return { label: 'Producto', color: '#818cf8' };
    if (c.type === 'admin')   return { label: 'Admin', color: '#6366f1' };
    if (c.type === 'loyalty') return { label: 'Fidelización', color: '#f59e0b' };
    return { label: 'Referido', color: '#22c55e' };
  };

  return (
    <>
      <div className="page-header">
        <h1>🎟️ Cupones & Fidelización</h1>
      </div>

      <div className="page-body">

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Cupones activos', value: stats.activeCoupons, icon: '🎟️' },
              { label: 'Usos totales', value: stats.totalUses, icon: '✅' },
              { label: 'Descuento total dado', value: fmt(stats.totalDiscountAmount), icon: '💸' },
              { label: 'Recompensas pendientes', value: `${stats.pendingRewards}%`, icon: '🎁' }
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--gold)' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ v: 'coupons', l: '🎟️ Cupones' }, { v: 'loyalty', l: '⭐ Fidelización' }].map(({ v, l }) => (
            <button key={v} onClick={() => setTab(v)} className={`btn ${tab === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
          ))}
        </div>

        {/* ── CUPONES ── */}
        {tab === 'coupons' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15}/> Cupón de referido
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAdminModal(true)}>
                🔑 Cupón admin
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSingleModal(true)}>
                🎯 Uso único
              </button>
            </div>

            {/* Tip cupones de producto */}
            <div style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#a5b4fc' }}>
              <Tag size={13} style={{ marginRight: 6 }}/>
              <strong>Cupones de producto:</strong> al crear cualquier cupón podés restringirlo a una hamburguesa específica.
              Ejemplo: <em>CHEESE10</em> → 10% solo en la Cheeseburger Doble.
            </div>

            {coupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎟️</div>
                <div>No hay cupones creados todavía.</div>
              </div>
            ) : (
              <div>
                {coupons.map(coupon => {
                  const { label: tLabel, color: tColor } = typeLabel(coupon);
                  const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
                  return (
                    <div key={coupon._id} style={{ background: 'var(--card)', border: `1px solid ${!coupon.active || isExpired ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, opacity: isExpired ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: 1 }}>{coupon.code}</span>
                            <span style={{ background: `${tColor}20`, color: tColor, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{tLabel}</span>
                            {coupon.singleUse && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>1 USO</span>}
                            {coupon.unlimited && <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>ILIMITADO</span>}
                            {isExpired && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>VENCIDO</span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 4 }}>
                            Dueño: <strong style={{ color: 'white' }}>{coupon.ownerName}</strong>
                            {coupon.applicableProductName && (
                              <span style={{ marginLeft: 8, color: '#818cf8' }}>
                                <Tag size={11} style={{ marginRight: 3 }}/>
                                Solo para: <strong>{coupon.applicableProductName}</strong>
                              </span>
                            )}
                            {coupon.expiresAt && (
                              <span style={{ marginLeft: 8, color: isExpired ? '#ef4444' : 'var(--gray)' }}>
                                · Vence: {new Date(coupon.expiresAt).toLocaleDateString('es-AR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)' }}>{coupon.discountForUser}%</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>{coupon.totalUses} uso{coupon.totalUses !== 1 ? 's' : ''}</div>
                          </div>
                          <button onClick={() => handleToggle(coupon)}
                            style={{ width: 42, height: 24, borderRadius: 12, background: coupon.active ? 'var(--gold)' : 'var(--dark)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: 3, left: coupon.active ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: coupon.active ? '#000' : '#555', transition: 'all 0.2s' }}/>
                          </button>
                          <button onClick={() => handleDelete(coupon)} className="btn-icon" style={{ color: '#ef4444' }}>✕</button>
                        </div>
                      </div>

                      {coupon.ownerPendingDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                          <span style={{ fontSize: '0.85rem' }}>
                            🎁 Recompensa pendiente para <strong>{coupon.ownerName}</strong>: <strong style={{ color: 'var(--gold)' }}>{coupon.ownerPendingDiscount}%</strong>
                          </span>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleResetReward(coupon)}>Marcar como usada</button>
                        </div>
                      )}

                      {coupon.uses?.length > 0 && (
                        <div>
                          <button onClick={() => setSelectedCoupon(selectedCoupon?._id === coupon._id ? null : coupon)}
                            style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                            {selectedCoupon?._id === coupon._id ? '▲ Ocultar usos' : `▼ Ver ${coupon.uses.length} uso${coupon.uses.length !== 1 ? 's' : ''}`}
                          </button>
                          {selectedCoupon?._id === coupon._id && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {coupon.uses.map((use, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 10px', background: 'var(--dark)', borderRadius: 6 }}>
                                  <span>{use.clientName} <span style={{ color: 'var(--gray)' }}>· {use.orderNumber}</span></span>
                                  <span style={{ color: 'var(--gold)' }}>-{use.discountApplied}{typeof use.discountApplied === 'number' && use.discountApplied < 100 ? '%' : ''}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── FIDELIZACIÓN ── */}
        {tab === 'loyalty' && (
          <>
            {loyaltyConfig && (
              <div style={{ background: loyaltyConfig.enabled ? 'rgba(232,184,75,0.06)' : 'var(--card)', border: `1px solid ${loyaltyConfig.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{loyaltyConfig.enabled ? '🟢' : '⚪'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{loyaltyConfig.enabled ? 'Sistema de puntos activo' : 'Sistema de puntos inactivo'}</div>
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
                  {loyaltyConfig?.enabled ? 'Aparecerán aquí cuando estén al 70% del umbral' : 'Activá el sistema de puntos para empezar'}
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
                          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: pct >= 100 ? '#22c55e' : 'var(--gold)' }}>{client.loyaltyPoints} pts</div>
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

      {/* ── MODALES ── */}

      {/* Modal cupón de referido */}
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
              <div className="form-group">
                <label>🍔 Restringir a producto específico (opcional)</label>
                <ProductSelector value={form.applicableProduct} onChange={v => setForm(f => ({ ...f, applicableProduct: v }))} />
                {form.applicableProduct && <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: 4 }}>El descuento solo aplica a ese producto dentro del pedido.</div>}
              </div>
              <div className="form-group">
                <label>📅 Fecha de vencimiento (opcional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
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
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Cupón Admin</h2>
              <button className="btn-icon" onClick={() => setShowAdminModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#a5b4fc' }}>
                💡 Este cupón es de <strong>uso ilimitado</strong>. Ideal para consumo interno o equipo.
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
              </div>
              <div className="form-group">
                <label>🍔 Restringir a producto específico (opcional)</label>
                <ProductSelector value={adminForm.applicableProduct} onChange={v => setAdminForm(f => ({ ...f, applicableProduct: v }))} />
              </div>
              <div className="form-group">
                <label>📅 Fecha de vencimiento (opcional)</label>
                <input type="date" value={adminForm.expiresAt} onChange={e => setAdminForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdminModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateAdmin}>Crear Cupón Admin</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cupón de uso único */}
      {showSingleModal && (
        <div className="modal-overlay" onClick={() => setShowSingleModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 Cupón de Uso Único</h2>
              <button className="btn-icon" onClick={() => setShowSingleModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#f5d06a' }}>
                🎯 Solo puede usarlo <strong>un cliente, una sola vez</strong>. Se desactiva automáticamente.
              </div>
              <div className="form-group">
                <label>Código *</label>
                <input value={singleForm.code} onChange={e => setSingleForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Ej: REGALO2024" />
              </div>
              <div className="form-group">
                <label>Etiqueta interna</label>
                <input value={singleForm.label} onChange={e => setSingleForm(f => ({ ...f, label: e.target.value }))} placeholder="Premio sorteo, Cumpleaños..." />
              </div>
              <div className="form-group">
                <label>% de descuento</label>
                <input type="number" min={1} max={100} value={singleForm.discountForUser} onChange={e => setSingleForm(f => ({ ...f, discountForUser: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>🍔 Restringir a producto específico (opcional)</label>
                <ProductSelector value={singleForm.applicableProduct} onChange={v => setSingleForm(f => ({ ...f, applicableProduct: v }))} />
              </div>
              <div className="form-group">
                <label>📅 Fecha de vencimiento (opcional)</label>
                <input type="date" value={singleForm.expiresAt} onChange={e => setSingleForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSingleModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateSingle}>Crear Cupón</button>
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
                Acreditá puntos a <strong style={{ color: 'white' }}>{awardModal.name}</strong>.
                Tiene <strong style={{ color: 'var(--gold)' }}>{awardModal.loyaltyPoints || 0} puntos</strong>.
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
