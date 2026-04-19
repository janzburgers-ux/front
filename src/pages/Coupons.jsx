import { useState, useEffect } from 'react';
import { Ticket, Plus, Gift, TrendingUp, Star, Tag, Send, Users, Award, ShieldAlert } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const TYPE_META = {
  referral: { label: 'Referido',      color: '#22c55e' },
  admin:    { label: 'Admin',          color: '#6366f1' },
  loyalty:  { label: 'Fidelización',   color: '#f59e0b' },
  product:  { label: 'Producto',       color: '#818cf8' },
};

// ── Barra de progreso de acumulación ──────────────────────────────────────────
function AccumBar({ percent }) {
  const capped = Math.min(percent, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--dark)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${capped}%`, background: capped >= 50 ? 'var(--gold)' : 'var(--green)', borderRadius: 3, transition: 'width 0.4s' }}/>
      </div>
      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', minWidth: 36 }}>{percent}%</span>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons]         = useState([]);
  const [clients, setClients]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [nearThreshold, setNearThreshold] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('coupons');
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [loyaltyConfig, setLoyaltyConfig]   = useState(null);

  // Modales
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showAdminModal, setShowAdminModal]       = useState(false);
  const [showSingleModal, setShowSingleModal]     = useState(false);
  const [showInviteModal, setShowInviteModal]     = useState(null); // coupon object
  const [awardModal, setAwardModal]   = useState(null);
  const [awardPoints, setAwardPoints] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);

  // Formularios
  const [referralForm, setReferralForm] = useState({ ownerId: '', discountForUser: 10, rewardPerUse: 5, expiresAt: '' });
  const [adminForm, setAdminForm]   = useState({ code: '', discountForUser: 0, label: 'Admin', applicableProduct: '', applicableProductName: '', expiresAt: '' });
  const [singleForm, setSingleForm] = useState({ code: '', discountForUser: 10, label: 'Promo', applicableProduct: '', applicableProductName: '', expiresAt: '' });

  // Invitaciones WA
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [inviteMsg, setInviteMsg]   = useState('');
  const [sending, setSending]       = useState(false);

  const load = () => {
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
      if (st)   setStats(st.data);
      setNearThreshold(nt.data || []);
      if (cfg)  setLoyaltyConfig(cfg.data?.loyalty);
      if (menu?.data?.menu) {
        const prods = [];
        Object.entries(menu.data.menu).forEach(([, v]) => v.forEach(p => prods.push(p)));
        setProducts(prods);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── helpers ───────────────────────────────────────────────────────────────
  const getProductName = id => { const p = products.find(p => p._id === id); return p ? `${p.name} ${p.variant}` : null; };

  const handleToggle = async (c) => {
    try {
      await API.put(`/coupons/${c._id}`, { active: !c.active });
      setCoupons(prev => prev.map(x => x._id === c._id ? { ...x, active: !c.active } : x));
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Eliminar cupón ${c.code}?`)) return;
    try { await API.delete(`/coupons/${c._id}`); setCoupons(prev => prev.filter(x => x._id !== c._id)); toast.success('Eliminado'); }
    catch { toast.error('Error'); }
  };

  // ── Crear cupón de referido (nuevo endpoint enriquecido) ──────────────────
  const handleCreateReferral = async () => {
    if (!referralForm.ownerId) { toast.error('Seleccioná un cliente'); return; }
    try {
      const res = await API.post('/coupons/referral', {
        ownerId: referralForm.ownerId,
        discountForUser: referralForm.discountForUser,
        rewardPerUse: referralForm.rewardPerUse,
        expiresAt: referralForm.expiresAt || null
      });
      setCoupons(prev => [res.data.coupon, ...prev]);
      setShowReferralModal(false);
      setReferralForm({ ownerId: '', discountForUser: 10, rewardPerUse: 5, expiresAt: '' });
      const avg = res.data.ownerAvgTicket;
      toast.success(`Cupón ${res.data.coupon.code} creado${avg ? ` · Tope: ${fmt(avg)}` : ''}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  // ── Canjear recompensa acumulada ──────────────────────────────────────────
  const handleRedeem = async (coupon) => {
    if (!window.confirm(`¿Generar cupón de recompensa para ${coupon.ownerName} con ${coupon.ownerAccumulatedPercent}% acumulado?`)) return;
    setRedeemingId(coupon._id);
    try {
      const res = await API.post(`/coupons/${coupon._id}/redeem`);
      toast.success(`Cupón ${res.data.rewardCode} generado y enviado por WA 🎉`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setRedeemingId(null); }
  };

  // ── Enviar invitaciones WA ────────────────────────────────────────────────
  const handleSendInvitations = async () => {
    if (!selectedClients.size) { toast.error('Seleccioná al menos un cliente'); return; }
    if (!inviteMsg.trim())     { toast.error('Escribí el mensaje'); return; }
    setSending(true);
    try {
      const res = await API.post('/coupons/send-referral-invitations', {
        clientIds: [...selectedClients],
        message: inviteMsg
      });
      toast.success(`✅ ${res.data.sent} enviado(s)${res.data.failed ? `, ${res.data.failed} fallaron` : ''}`);
      setShowInviteModal(null);
      setSelectedClients(new Set());
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSending(false); }
  };

  const handleAwardPoints = async () => {
    if (!awardModal || !awardPoints) return;
    try {
      await API.post('/coupons/loyalty/award', { clientId: awardModal._id, points: Number(awardPoints) });
      toast.success(`${awardPoints} puntos acreditados`);
      setAwardModal(null); setAwardPoints('');
    } catch { toast.error('Error'); }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.code) { toast.error('Código requerido'); return; }
    // Necesitamos un owner para el modelo — usar primer cliente o cliente "admin"
    const owner = clients[0];
    if (!owner) { toast.error('No hay clientes en el sistema'); return; }
    try {
      const res = await API.post('/coupons/admin', {
        ...adminForm,
        ownerId: owner._id,
        applicableProduct: adminForm.applicableProduct || null,
        applicableProductName: adminForm.applicableProduct ? getProductName(adminForm.applicableProduct) : null,
        expiresAt: adminForm.expiresAt || null
      });
      setCoupons(prev => [res.data, ...prev]);
      setShowAdminModal(false);
      toast.success('Cupón admin creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleCreateSingle = async () => {
    if (!singleForm.code) { toast.error('Código requerido'); return; }
    const owner = clients[0];
    if (!owner) { toast.error('No hay clientes'); return; }
    try {
      const res = await API.post('/coupons/single', {
        ...singleForm,
        ownerId: owner._id,
        applicableProduct: singleForm.applicableProduct || null,
        applicableProductName: singleForm.applicableProduct ? getProductName(singleForm.applicableProduct) : null,
        expiresAt: singleForm.expiresAt || null
      });
      setCoupons(prev => [res.data, ...prev]);
      setShowSingleModal(false);
      toast.success('Cupón creado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const ProductSelector = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Todo el pedido</option>
      {products.map(p => <option key={p._id} value={p._id}>{p.name} {p.variant}</option>)}
    </select>
  );

  // ── Referral coupons con recompensa acumulada ─────────────────────────────
  const referralCoupons = coupons.filter(c => c.type === 'referral');
  const pointsThreshold = loyaltyConfig?.redeemThreshold || 500;

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner"/></div>;

  return (
    <>
      <div className="page-header">
        <h1>🎟️ Cupones & Fidelización</h1>
      </div>

      <div className="page-body">

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Cupones activos', value: stats.activeCoupons, icon: '🎟️' },
              { label: 'Usos totales',    value: stats.totalUses, icon: '✅' },
              { label: 'Descuento dado',  value: fmt(stats.totalDiscountAmount), icon: '💸' },
              { label: 'Referidos activos', value: referralCoupons.filter(c => c.active).length, icon: '🌟' },
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
          {[
            { v: 'coupons',  l: '🎟️ Todos los cupones' },
            { v: 'referral', l: '🌟 Referidos' },
            { v: 'loyalty',  l: '⭐ Fidelización' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setTab(v)} className={`btn ${tab === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: TODOS LOS CUPONES
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'coupons' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => setShowReferralModal(true)}>
                <Plus size={15}/> Cupón de referido
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAdminModal(true)}>🔑 Cupón admin</button>
              <button className="btn btn-secondary" onClick={() => setShowSingleModal(true)}>🎯 Uso único</button>
            </div>

            {coupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎟️</div>
                <div>No hay cupones creados todavía.</div>
              </div>
            ) : coupons.map(coupon => {
              const { label: tLabel, color: tColor } = TYPE_META[coupon.type] || TYPE_META.admin;
              const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
              const accum = coupon.ownerAccumulatedPercent || 0;
              return (
                <div key={coupon._id} style={{ background: 'var(--card)', border: `1px solid ${!coupon.active || isExpired ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, opacity: isExpired ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: 1 }}>{coupon.code}</span>
                        <span style={{ background: `${tColor}20`, color: tColor, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{tLabel}</span>
                        {coupon.singleUse  && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>1 USO</span>}
                        {coupon.unlimited  && <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>ILIMITADO</span>}
                        {isExpired         && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>VENCIDO</span>}
                        {coupon.fraudFlags?.length > 0 && <span title={coupon.fraudFlags.map(f=>f.reason).join(', ')} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, cursor: 'help' }}><ShieldAlert size={10} style={{ display: 'inline', marginRight: 3 }}/>FRAUDE</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 4 }}>
                        Dueño: <strong style={{ color: 'white' }}>{coupon.ownerName}</strong>
                        {coupon.applicableProductName && <span style={{ marginLeft: 8, color: '#818cf8' }}><Tag size={11} style={{ marginRight: 3 }}/>Solo: <strong>{coupon.applicableProductName}</strong></span>}
                        {coupon.expiresAt && <span style={{ marginLeft: 8, color: isExpired ? '#ef4444' : 'var(--gray)' }}>· Vence: {new Date(coupon.expiresAt).toLocaleDateString('es-AR')}</span>}
                        {coupon.ownerAvgTicket > 0 && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>· Tope: {fmt(coupon.ownerAvgTicket)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)' }}>{coupon.discountForUser}%</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>{coupon.validatedUses || coupon.totalUses} uso{(coupon.validatedUses || coupon.totalUses) !== 1 ? 's' : ''} validados</div>
                      </div>
                      <button onClick={() => handleToggle(coupon)}
                        style={{ width: 42, height: 24, borderRadius: 12, background: coupon.active ? 'var(--gold)' : 'var(--dark)', border: 'none', cursor: 'pointer', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 3, left: coupon.active ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: coupon.active ? '#000' : '#555', transition: 'all 0.2s' }}/>
                      </button>
                      <button onClick={() => handleDelete(coupon)} className="btn-icon" style={{ color: '#ef4444' }}>✕</button>
                    </div>
                  </div>

                  {/* Recompensa acumulada (solo referidos) */}
                  {coupon.type === 'referral' && accum > 0 && (
                    <div style={{ background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>🎁 {coupon.ownerName} tiene <strong style={{ color: 'var(--gold)' }}>{accum}%</strong> acumulado para canjear</span>
                        <button className="btn btn-primary btn-sm" disabled={redeemingId === coupon._id}
                          onClick={() => handleRedeem(coupon)}>
                          {redeemingId === coupon._id ? '...' : 'Generar cupón'}
                        </button>
                      </div>
                      <AccumBar percent={accum} />
                    </div>
                  )}

                  {/* Historial de usos */}
                  {coupon.uses?.length > 0 && (
                    <div>
                      <button onClick={() => setSelectedCoupon(selectedCoupon?._id === coupon._id ? null : coupon)}
                        style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                        {selectedCoupon?._id === coupon._id ? '▲ Ocultar' : `▼ Ver ${coupon.uses.length} uso${coupon.uses.length !== 1 ? 's' : ''}`}
                      </button>
                      {selectedCoupon?._id === coupon._id && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {coupon.uses.map((use, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--dark)', borderRadius: 6 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: use.status === 'validated' ? '#22c55e' : '#f59e0b', display: 'inline-block', flexShrink: 0 }}/>
                                {use.clientName} · {use.orderNumber}
                                <span style={{ color: 'var(--gray)', fontSize: '0.72rem' }}>{use.status === 'validated' ? 'Entregado ✓' : 'Pendiente'}</span>
                              </span>
                              <span style={{ color: 'var(--gold)' }}>-{fmt(use.discountApplied || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: REFERIDOS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'referral' && (
          <>
            {/* Explicación del sistema */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={16} color="#22c55e"/> Cómo funciona el sistema de referidos
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray)', lineHeight: 1.7 }}>
                1. Creás un cupón para un cliente → el código es exclusivo de él para compartir.<br/>
                2. Cuando un <strong>nuevo cliente</strong> usa el cupón y su pedido es <strong>entregado</strong>, el dueño acumula el % configurado.<br/>
                3. El dueño recibe un WA avisándole. Puede seguir acumulando o pedir canjear.<br/>
                4. Al canjear, se genera un cupón con el % acumulado y un tope igual a su ticket promedio.<br/>
                5. El contador vuelve a 0 y se empieza de nuevo.<br/>
                <strong style={{ color: '#22c55e' }}>Anti-fraude:</strong> el dueño del cupón no puede usarlo en su propia cuenta.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={() => setShowReferralModal(true)}>
                <Plus size={15}/> Nuevo cupón de referido
              </button>
              <button className="btn btn-secondary" onClick={() => setShowInviteModal('invite')}>
                <Send size={15}/> Enviar invitaciones por WA
              </button>
            </div>

            {referralCoupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌟</div>
                <div>No hay cupones de referido creados.</div>
              </div>
            ) : referralCoupons.map(coupon => {
              const accum = coupon.ownerAccumulatedPercent || 0;
              const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
              return (
                <div key={coupon._id} style={{ background: 'var(--card)', border: `1px solid ${accum > 0 ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--gold)' }}>{coupon.code}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{coupon.ownerName}</span>
                        {!coupon.active && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 20 }}>INACTIVO</span>}
                        {isExpired       && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 20 }}>VENCIDO</span>}
                        {coupon.fraudFlags?.length > 0 && (
                          <span title={coupon.fraudFlags.map(f=>f.reason).join('\n')} style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 20, cursor: 'help' }}>
                            <ShieldAlert size={10} style={{ display: 'inline', marginRight: 3 }}/>INTENTO FRAUDE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 4, display: 'flex', gap: 16 }}>
                        <span>Descuento al nuevo: <strong style={{ color: 'white' }}>{coupon.discountForUser}%</strong></span>
                        <span>Recompensa/uso: <strong style={{ color: 'var(--gold)' }}>+{coupon.rewardPerUse}%</strong></span>
                        <span>Usos validados: <strong>{coupon.validatedUses || 0}</strong></span>
                        {coupon.ownerAvgTicket > 0 && <span>Tope: <strong style={{ color: 'var(--gold)' }}>{fmt(coupon.ownerAvgTicket)}</strong></span>}
                        {coupon.ownerRedemptions > 0 && <span>Canjes: <strong>{coupon.ownerRedemptions}</strong></span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleToggle(coupon)}
                        style={{ width: 42, height: 24, borderRadius: 12, background: coupon.active ? 'var(--gold)' : 'var(--dark)', border: 'none', cursor: 'pointer', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 3, left: coupon.active ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: coupon.active ? '#000' : '#555', transition: 'all 0.2s' }}/>
                      </button>
                      <button onClick={() => handleDelete(coupon)} className="btn-icon" style={{ color: '#ef4444' }}>✕</button>
                    </div>
                  </div>

                  {/* Barra de acumulación */}
                  <div style={{ marginBottom: accum > 0 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>% acumulado</span>
                      {accum > 0 && (
                        <button className="btn btn-primary btn-sm" disabled={redeemingId === coupon._id}
                          onClick={() => handleRedeem(coupon)}>
                          <Award size={13}/> {redeemingId === coupon._id ? 'Generando...' : `Canjear ${accum}%`}
                        </button>
                      )}
                    </div>
                    <AccumBar percent={accum} />
                    {accum === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Sin usos validados todavía</div>}
                  </div>

                  {/* Usos con estado */}
                  {coupon.uses?.length > 0 && (
                    <div>
                      <button onClick={() => setSelectedCoupon(selectedCoupon?._id === coupon._id ? null : coupon)}
                        style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}>
                        {selectedCoupon?._id === coupon._id ? '▲ Ocultar' : `▼ Ver historial (${coupon.uses.length})`}
                      </button>
                      {selectedCoupon?._id === coupon._id && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {coupon.uses.map((use, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '7px 12px', background: 'var(--dark)', borderRadius: 6 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                  background: use.status === 'validated' ? '#22c55e' : '#f59e0b' }}/>
                                <strong>{use.clientName}</strong>
                                <span style={{ color: 'var(--gray)' }}>· {use.orderNumber} · {fmt(use.orderTotal || 0)}</span>
                              </span>
                              <span style={{ color: use.status === 'validated' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                                {use.status === 'validated' ? '✓ Entregado' : '⏳ Pendiente'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: FIDELIZACIÓN
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'loyalty' && (
          <>
            {loyaltyConfig && (
              <div style={{ background: loyaltyConfig.enabled ? 'rgba(232,184,75,0.06)' : 'var(--card)', border: `1px solid ${loyaltyConfig.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{loyaltyConfig.enabled ? '🟢' : '⚪'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{loyaltyConfig.enabled ? 'Sistema de puntos activo' : 'Sistema de puntos inactivo'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                    {loyaltyConfig.enabled
                      ? `1 punto cada $${loyaltyConfig.pointsPerPeso} · Cupón al llegar a ${loyaltyConfig.redeemThreshold} pts · ${loyaltyConfig.couponPercent}% de descuento`
                      : 'Activalo desde Configuración → Fidelización'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontWeight: 700, marginBottom: 12 }}>Clientes cerca del umbral de canje</div>
            {nearThreshold.length === 0 ? (
              <div style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Ningún cliente cerca del umbral todavía.</div>
            ) : nearThreshold.map(c => (
              <div key={c._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{c.whatsapp}</div>
                  <div style={{ height: 4, width: 120, background: 'var(--dark)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100,((c.loyaltyPoints||0)/pointsThreshold)*100)}%`, background: 'var(--gold)', borderRadius: 2 }}/>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--gold)' }}>{c.loyaltyPoints} pts</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>
                      {c.loyaltyPoints >= pointsThreshold ? '🎉 ¡Puede canjear!' : `Falta: ${pointsThreshold - c.loyaltyPoints} pts`}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setAwardModal(c); setAwardPoints(''); }}>
                    <Gift size={13}/> Acreditar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Crear cupón de referido
      ══════════════════════════════════════════════════════════════════ */}
      {showReferralModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReferralModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>🌟 Nuevo cupón de referido</h2>
              <button className="btn-icon" onClick={() => setShowReferralModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>
                El código se genera automáticamente. El <strong>tope de descuento</strong> se calcula dinámicamente según el ticket promedio del cliente.
              </p>
              <div className="form-group">
                <label>Cliente dueño del cupón *</label>
                <select value={referralForm.ownerId} onChange={e => setReferralForm(f => ({ ...f, ownerId: e.target.value }))}>
                  <option value="">Seleccioná un cliente...</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name} {c.whatsapp ? `· ${c.whatsapp}` : ''}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Descuento para el nuevo cliente (%)</label>
                  <input type="number" min={1} max={100} value={referralForm.discountForUser}
                    onChange={e => setReferralForm(f => ({ ...f, discountForUser: Number(e.target.value) }))} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>% que recibe quien usa el cupón</div>
                </div>
                <div className="form-group">
                  <label>Recompensa por uso validado (%)</label>
                  <input type="number" min={1} max={50} value={referralForm.rewardPerUse}
                    onChange={e => setReferralForm(f => ({ ...f, rewardPerUse: Number(e.target.value) }))} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>% que acumula el dueño por cada pedido entregado</div>
                </div>
              </div>
              <div className="form-group">
                <label>Vencimiento (opcional)</label>
                <input type="date" value={referralForm.expiresAt}
                  onChange={e => setReferralForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', marginTop: 8 }}>
                <strong>🛡️ Anti-fraude activado:</strong> el dueño no podrá usar su propio cupón. Los usos solo se validan cuando el pedido del nuevo cliente es entregado.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowReferralModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateReferral}>Crear cupón</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Enviar invitaciones por WA
      ══════════════════════════════════════════════════════════════════ */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInviteModal(null)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2><Send size={18}/> Enviar invitaciones de referido</h2>
              <button className="btn-icon" onClick={() => setShowInviteModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>
                Seleccioná los clientes a invitar. Usá <strong>{'{nombre}'}</strong> en el mensaje para personalizarlo.
              </p>

              {/* Selector de clientes */}
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.85rem' }}>
                <Users size={14} style={{ display: 'inline', marginRight: 6 }}/>
                Clientes ({selectedClients.size} seleccionados)
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                {clients.filter(c => c.whatsapp && !c.isTestClient).map(c => (
                  <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedClients.has(c._id) ? 'rgba(232,184,75,0.06)' : 'transparent' }}>
                    <input type="checkbox" checked={selectedClients.has(c._id)}
                      onChange={e => {
                        setSelectedClients(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(c._id) : next.delete(c._id);
                          return next;
                        });
                      }} style={{ accentColor: 'var(--gold)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{c.whatsapp} · {c.totalOrders} pedidos · {fmt(c.totalSpent)}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClients(new Set(clients.filter(c => c.whatsapp && !c.isTestClient).map(c => c._id)))}>Seleccionar todos</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClients(new Set())}>Limpiar</button>
              </div>

              {/* Mensaje */}
              <div className="form-group">
                <label>Mensaje de WhatsApp</label>
                <textarea rows={7} value={inviteMsg} onChange={e => setInviteMsg(e.target.value)}
                  placeholder={`Hola {nombre}! 🍔\n\nQueremos invitarte a nuestro programa de referidos.\n\nCompartí tu código exclusivo con tus amigos y ganás descuentos cada vez que alguien hace su primer pedido con tu código.\n\nPedinos tu código respondiendo este mensaje. ¡Te esperamos!\n\n_Janz Burgers_ 🔥`}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Variables: <code>{'{nombre}'}</code></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInviteModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={sending || !selectedClients.size || !inviteMsg.trim()} onClick={handleSendInvitations}>
                <Send size={14}/> {sending ? 'Enviando...' : `Enviar a ${selectedClients.size} cliente(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cupón admin */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdminModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>🔑 Cupón Admin</h2><button className="btn-icon" onClick={() => setShowAdminModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Código *</label><input value={adminForm.code} onChange={e => setAdminForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="JANZ10"/></div>
                <div className="form-group"><label>Descuento (%)</label><input type="number" value={adminForm.discountForUser} onChange={e => setAdminForm(f=>({...f,discountForUser:Number(e.target.value)}))}/></div>
              </div>
              <div className="form-group"><label>Restricción de producto (opcional)</label><ProductSelector value={adminForm.applicableProduct} onChange={v=>setAdminForm(f=>({...f,applicableProduct:v}))}/></div>
              <div className="form-group"><label>Vencimiento</label><input type="date" value={adminForm.expiresAt} onChange={e=>setAdminForm(f=>({...f,expiresAt:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdminModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateAdmin}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cupón uso único */}
      {showSingleModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSingleModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>🎯 Cupón Uso Único</h2><button className="btn-icon" onClick={() => setShowSingleModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Código *</label><input value={singleForm.code} onChange={e => setSingleForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="PROMO10"/></div>
                <div className="form-group"><label>Descuento (%)</label><input type="number" value={singleForm.discountForUser} onChange={e => setSingleForm(f=>({...f,discountForUser:Number(e.target.value)}))}/></div>
              </div>
              <div className="form-group"><label>Restricción de producto (opcional)</label><ProductSelector value={singleForm.applicableProduct} onChange={v=>setSingleForm(f=>({...f,applicableProduct:v}))}/></div>
              <div className="form-group"><label>Vencimiento</label><input type="date" value={singleForm.expiresAt} onChange={e=>setSingleForm(f=>({...f,expiresAt:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSingleModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateSingle}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal acreditar puntos */}
      {awardModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAwardModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h2>🎁 Acreditar puntos</h2><button className="btn-icon" onClick={() => setAwardModal(null)}>✕</button></div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>Acreditar puntos manualmente a <strong>{awardModal.name}</strong></p>
              <input type="number" value={awardPoints} onChange={e => setAwardPoints(e.target.value)} placeholder="Ej: 100" min={1}/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAwardModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAwardPoints} disabled={!awardPoints}>Acreditar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
