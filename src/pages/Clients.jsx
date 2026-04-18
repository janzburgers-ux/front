import { useState, useEffect } from 'react';
import { Search, Plus, Star, FlaskConical, MapPin, Phone, MessageCircle, TrendingUp, ShoppingBag, Clock, BarChart2 } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt  = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'En cocina', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado' };
const STATUS_COLORS = { delivered: '#22c55e', cancelled: '#ef4444', pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#a855f7' };

function calcClientStats(orders) {
  const delivered = orders.filter(o => o.status === 'delivered');
  const totalSpent = delivered.reduce((s, o) => s + o.total, 0);
  const avgTicket  = delivered.length ? Math.round(totalSpent / delivered.length) : 0;
  const productCount = {};
  delivered.forEach(o => (o.items || []).forEach(i => {
    const key = `${i.productName} ${i.variant}`.trim();
    productCount[key] = (productCount[key] || 0) + i.quantity;
  }));
  const topProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const sorted = [...delivered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const firstOrder = sorted[0]?.createdAt;
  const lastOrder  = sorted[sorted.length - 1]?.createdAt;
  const daysSinceFirst = firstOrder ? Math.floor((Date.now() - new Date(firstOrder)) / 86400000) : 0;
  const freqDays = daysSinceFirst > 0 && delivered.length > 1 ? Math.round(daysSinceFirst / (delivered.length - 1)) : null;
  const payMethods = {}; delivered.forEach(o => { payMethods[o.paymentMethod] = (payMethods[o.paymentMethod] || 0) + 1; });
  const prefPayment = Object.entries(payMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const delivTypes = {}; delivered.forEach(o => { delivTypes[o.deliveryType] = (delivTypes[o.deliveryType] || 0) + 1; });
  const prefDelivery = Object.entries(delivTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { totalSpent, avgTicket, topProducts, firstOrder, lastOrder, freqDays, prefPayment, prefDelivery };
}

function TestBadge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.65rem', fontWeight:700,
      background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', borderRadius:99, padding:'1px 8px' }}>
      <FlaskConical size={10}/> TEST
    </span>
  );
}

export default function Clients() {
  const [clients, setClients]           = useState([]);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [selected, setSelected]         = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailStats, setDetailStats]   = useState(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [togglingTest, setTogglingTest] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', whatsapp:'', email:'', address:'', notes:'' });

  const fetchClients = (q = '') => {
    API.get('/clients', { params: q ? { search: q } : {} }).then(r => setClients(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
    API.get('/config').then(r => setLoyaltyConfig(r.data?.loyalty)).catch(() => {});
  }, []);

  const handleSearch = (e) => { setSearch(e.target.value); fetchClients(e.target.value); };

  const handleCreate = async () => {
    try {
      const res = await API.post('/clients', form);
      setClients(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ name:'', phone:'', whatsapp:'', email:'', address:'', notes:'' });
      toast.success('Cliente creado');
    } catch { toast.error('Error al crear cliente'); }
  };

  const viewClient = async (client) => {
    setSelected(client); setClientDetail(null); setDetailStats(null);
    const res = await API.get(`/clients/${client._id}`);
    setClientDetail(res.data);
    setDetailStats(calcClientStats(res.data.orders || []));
  };

  const toggleTestClient = async (client) => {
    setTogglingTest(true);
    try {
      const newVal = !client.isTestClient;
      await API.put(`/clients/${client._id}`, { isTestClient: newVal });
      const updated = { ...client, isTestClient: newVal };
      setClients(prev => prev.map(c => c._id === client._id ? updated : c));
      setSelected(updated);
      toast.success(newVal ? '🧪 Marcado como TEST — no cuenta en reportes' : '✅ Restaurado como cliente real');
    } catch { toast.error('Error'); }
    finally { setTogglingTest(false); }
  };

  const pointsThreshold  = loyaltyConfig?.redeemThreshold || 500;
  const PAYMENT_LABELS   = { efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia' };
  const DELIVERY_LABELS  = { delivery: '🛵 Delivery', takeaway: '🥡 Retiro', local: '🏠 Local' };

  return (
    <>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/> Nuevo Cliente</button>
      </div>
      <div className="page-body">
        <div style={{ position:'relative', marginBottom:20 }}>
          <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--gray)' }} />
          <input value={search} onChange={handleSearch} placeholder="Buscar por nombre o teléfono..." style={{ paddingLeft:40 }} />
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Contacto</th><th>Pedidos</th><th>Total gastado</th>
                  {loyaltyConfig?.enabled && <th>Puntos 🏆</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'var(--gray)' }}>Sin clientes</td></tr>
                ) : clients.map(c => {
                  const isStarClient = c.totalOrders >= 5;
                  const nearThreshold = loyaltyConfig?.enabled && c.loyaltyPoints >= pointsThreshold * 0.7;
                  return (
                    <tr key={c._id} style={{ opacity: c.isTestClient ? 0.65 : 1 }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {isStarClient && !c.isTestClient && <Star size={14} color="var(--gold)" fill="var(--gold)" />}
                          <div>
                            <div style={{ fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                              {c.name}{c.isTestClient && <TestBadge />}
                            </div>
                            {c.email && <div style={{ fontSize:'0.72rem', color:'var(--gray)' }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:'0.85rem' }}>
                        <div>{c.phone || '—'}</div>
                        {c.whatsapp && <div style={{ color:'var(--gray)', fontSize:'0.75rem' }}>WA: {c.whatsapp}</div>}
                      </td>
                      <td style={{ fontWeight:700 }}>{c.totalOrders}</td>
                      <td style={{ fontWeight:700, color: c.isTestClient ? 'var(--gray)' : 'var(--gold)' }}>{fmt(c.totalSpent)}</td>
                      {loyaltyConfig?.enabled && (
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div>
                              <div style={{ fontWeight:700, color: nearThreshold ? 'var(--gold)' : 'white' }}>{c.loyaltyPoints || 0} pts</div>
                              {nearThreshold && !c.isTestClient && (
                                <div style={{ fontSize:'0.65rem', color:'var(--gold)' }}>
                                  {c.loyaltyPoints >= pointsThreshold ? '🎉 Puede canjear' : `⭐ ${pointsThreshold - c.loyaltyPoints} para canjear`}
                                </div>
                              )}
                            </div>
                            <div style={{ width:40, height:4, background:'var(--dark)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${Math.min(100,((c.loyaltyPoints||0)/pointsThreshold)*100)}%`, background:'var(--gold)', borderRadius:2 }}/>
                            </div>
                          </div>
                        </td>
                      )}
                      <td><button className="btn btn-secondary btn-sm" onClick={() => viewClient(c)}>Ver perfil</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal perfil completo */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth:720 }}>
            <div className="modal-header">
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <h2 style={{ margin:0 }}>{selected.name}</h2>
                  {selected.isTestClient && <TestBadge />}
                  {selected.totalOrders >= 5 && !selected.isTestClient && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.75rem', color:'var(--gold)' }}>
                      <Star size={12} fill="var(--gold)"/> Cliente estrella
                    </span>
                  )}
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--gray)', marginTop:4 }}>
                  Cliente desde {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('es-AR') : '—'}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={() => toggleTestClient(selected)} disabled={togglingTest}
                  title={selected.isTestClient ? 'Marcar como cliente real' : 'Marcar como cliente de prueba'}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.75rem', fontWeight:700,
                    background: selected.isTestClient ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
                    color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>
                  <FlaskConical size={13}/>
                  {selected.isTestClient ? 'Quitar modo test' : 'Modo test'}
                </button>
                <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight:'75vh', overflowY:'auto' }}>

              {/* Contacto */}
              <div style={{ background:'var(--dark)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:'0.82rem', display:'flex', flexWrap:'wrap', gap:'8px 24px' }}>
                {selected.phone    && <span><Phone size={12} style={{ display:'inline', marginRight:5 }}/>{selected.phone}</span>}
                {selected.whatsapp && <span><MessageCircle size={12} style={{ display:'inline', marginRight:5 }}/>{selected.whatsapp}</span>}
                {selected.address  && <span><MapPin size={12} style={{ display:'inline', marginRight:5 }}/>{[selected.address, selected.floor, selected.neighborhood].filter(Boolean).join(', ')}</span>}
                {selected.notes    && <span style={{ color:'var(--gold)' }}>📝 {selected.notes}</span>}
              </div>

              {/* KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:16 }}>
                {[
                  { icon:<ShoppingBag size={15}/>, label:'Pedidos',        value: selected.totalOrders },
                  { icon:<TrendingUp size={15}/>,  label:'Total gastado',  value: fmt(selected.totalSpent) },
                  { icon:<BarChart2 size={15}/>,   label:'Ticket promedio',value: detailStats ? fmt(detailStats.avgTicket) : '…' },
                  { icon:<Clock size={15}/>,       label:'Frecuencia',     value: detailStats?.freqDays ? `c/${detailStats.freqDays}d` : (detailStats ? '1er pedido' : '…') },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ color:'var(--gold)', marginBottom:4 }}>{s.icon}</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--gray)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'1.25rem' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Preferencias + Puntos */}
              {detailStats && (
                <div style={{ display:'grid', gridTemplateColumns: loyaltyConfig?.enabled ? '1fr 1fr' : '1fr', gap:10, marginBottom:16 }}>
                  <div className="card" style={{ padding:'12px 16px' }}>
                    <div style={{ fontSize:'0.72rem', color:'var(--gray)', fontWeight:700, marginBottom:8, textTransform:'uppercase' }}>Preferencias</div>
                    {detailStats.prefPayment  && <div style={{ fontSize:'0.82rem', marginBottom:4 }}>{PAYMENT_LABELS[detailStats.prefPayment]  || detailStats.prefPayment}</div>}
                    {detailStats.prefDelivery && <div style={{ fontSize:'0.82rem', marginBottom:4 }}>{DELIVERY_LABELS[detailStats.prefDelivery] || detailStats.prefDelivery}</div>}
                    {detailStats.firstOrder && (
                      <div style={{ fontSize:'0.75rem', color:'var(--gray)', marginTop:6 }}>
                        Primer pedido: {new Date(detailStats.firstOrder).toLocaleDateString('es-AR')}<br/>
                        Último pedido: {new Date(detailStats.lastOrder).toLocaleDateString('es-AR')}
                      </div>
                    )}
                  </div>
                  {loyaltyConfig?.enabled && (
                    <div className="card" style={{ padding:'12px 16px', borderColor:'rgba(232,184,75,0.25)' }}>
                      <div style={{ fontSize:'0.72rem', color:'var(--gray)', fontWeight:700, marginBottom:8, textTransform:'uppercase' }}>🏆 Fidelización</div>
                      <div style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'var(--gold)' }}>{selected.loyaltyPoints || 0} pts</div>
                      <div style={{ height:5, background:'var(--dark)', borderRadius:3, margin:'6px 0', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.min(100,((selected.loyaltyPoints||0)/pointsThreshold)*100)}%`, background:'var(--gold)', borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'var(--gray)' }}>
                        Total acumulado: {selected.totalPointsEarned || 0} pts<br/>
                        {selected.loyaltyPoints >= pointsThreshold ? '🎉 ¡Puede canjear ahora!' : `Falta: ${pointsThreshold-(selected.loyaltyPoints||0)} pts`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top hamburguesas */}
              {detailStats?.topProducts?.length > 0 && (
                <div className="card" style={{ padding:'12px 16px', marginBottom:16 }}>
                  <div style={{ fontSize:'0.72rem', color:'var(--gray)', fontWeight:700, marginBottom:10, textTransform:'uppercase' }}>🍔 Top hamburguesas (histórico)</div>
                  {detailStats.topProducts.map((p, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                        <span style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem', color: i===0 ? 'var(--gold)' : 'var(--gray)', minWidth:18 }}>#{i+1}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'0.85rem', fontWeight: i===0 ? 700 : 400 }}>{p.name}</div>
                          <div style={{ height:3, background:'var(--dark)', borderRadius:2, marginTop:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(p.count/detailStats.topProducts[0].count)*100}%`, background: i===0 ? 'var(--gold)' : 'var(--border)', borderRadius:2 }}/>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gold)', marginLeft:12 }}>×{p.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Historial */}
              <div style={{ fontWeight:700, marginBottom:10, fontSize:'0.82rem', textTransform:'uppercase', color:'var(--gray)' }}>Historial de pedidos</div>
              {!clientDetail ? (
                <div style={{ textAlign:'center', padding:20 }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
              ) : clientDetail.orders?.length === 0 ? (
                <div style={{ color:'var(--gray)', textAlign:'center', padding:20, fontSize:'0.85rem' }}>Sin pedidos registrados</div>
              ) : clientDetail.orders.map(o => (
                <div key={o._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <span style={{ color:'var(--gold)', fontWeight:700, marginRight:10 }}>{o.orderNumber}</span>
                    <span style={{ fontSize:'0.8rem', color:'var(--gray)' }}>
                      {o.items?.map(i => `${i.productName} ${i.variant} ×${i.quantity}`).join(', ')}
                    </span>
                    {o.couponCode && (
                      <span style={{ marginLeft:8, fontSize:'0.7rem', color:'#22c55e', background:'rgba(34,197,94,0.1)', padding:'1px 6px', borderRadius:100 }}>
                        🎟️ {o.couponCode}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontWeight:700 }}>{fmt(o.total)}</div>
                    <div style={{ fontSize:'0.7rem', color: STATUS_COLORS[o.status] || 'var(--gray)' }}>{STATUS_LABELS[o.status] || o.status}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--gray)' }}>{new Date(o.createdAt).toLocaleDateString('es-AR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal crear cliente */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nuevo Cliente</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Nombre *</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Nombre completo" /></div>
                <div className="form-group"><label>Teléfono</label><input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="11-1234-5678" /></div>
                <div className="form-group"><label>WhatsApp</label><input value={form.whatsapp} onChange={e => setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="1141609741" /></div>
                <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@ejemplo.com" /></div>
              </div>
              <div className="form-group"><label>Dirección</label><input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
              <div className="form-group"><label>Notas</label><input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="ej: sin picante, alergia a..." /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name}>Crear Cliente</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
