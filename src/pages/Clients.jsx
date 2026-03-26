import { useState, useEffect } from 'react';
import { Search, Plus, Star, Trophy, Gift } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'En cocina', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado' };
const STATUS_COLORS = { delivered: '#22c55e', cancelled: '#ef4444', pending: '#f59e0b' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });

  const fetchClients = (q = '') => {
    API.get('/clients', { params: q ? { search: q } : {} })
      .then(r => setClients(r.data)).finally(() => setLoading(false));
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
      setForm({ name: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
      toast.success('Cliente creado');
    } catch { toast.error('Error al crear cliente'); }
  };

  const viewClient = async (client) => {
    setSelected(client);
    const res = await API.get(`/clients/${client._id}`);
    setClientDetail(res.data);
  };

  const pointsThreshold = loyaltyConfig?.redeemThreshold || 500;

  return (
    <>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/> Nuevo Cliente</button>
      </div>
      <div className="page-body">
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
          <input value={search} onChange={handleSearch} placeholder="Buscar por nombre o teléfono..." style={{ paddingLeft: 40 }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Pedidos</th>
                  <th>Total gastado</th>
                  {loyaltyConfig?.enabled && <th>Puntos 🏆</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--gray)' }}>Sin clientes</td></tr>
                ) : clients.map(c => {
                  const isStarClient = c.totalOrders >= 5;
                  const nearThreshold = loyaltyConfig?.enabled && c.loyaltyPoints >= pointsThreshold * 0.7;
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isStarClient && <Star size={14} color="var(--gold)" fill="var(--gold)" />}
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            {c.email && <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{c.phone || '—'}</div>
                        {c.whatsapp && <div style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>WA: {c.whatsapp}</div>}
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.totalOrders}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmt(c.totalSpent)}</td>
                      {loyaltyConfig?.enabled && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: nearThreshold ? 'var(--gold)' : 'white' }}>
                                {c.loyaltyPoints || 0} pts
                              </div>
                              {nearThreshold && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>
                                  {c.loyaltyPoints >= pointsThreshold ? '🎉 Puede canjear' : `⭐ ${pointsThreshold - c.loyaltyPoints} para canjear`}
                                </div>
                              )}
                            </div>
                            {/* Mini barra */}
                            <div style={{ width: 40, height: 4, background: 'var(--dark)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, ((c.loyaltyPoints || 0) / pointsThreshold) * 100)}%`, background: 'var(--gold)', borderRadius: 2 }} />
                            </div>
                          </div>
                        </td>
                      )}
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => viewClient(c)}>Ver</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle cliente */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2>{selected.name}</h2>
                {selected.totalOrders >= 5 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gold)', marginTop: 4 }}>
                    <Star size={12} fill="var(--gold)"/> Cliente estrella
                  </span>
                )}
              </div>
              <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: loyaltyConfig?.enabled ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>PEDIDOS</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'var(--gold)' }}>{selected.totalOrders}</div>
                </div>
                <div className="card" style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>TOTAL GASTADO</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem' }}>{fmt(selected.totalSpent)}</div>
                </div>
                {loyaltyConfig?.enabled && (
                  <div className="card" style={{ padding: '12px 16px', borderColor: 'rgba(232,184,75,0.3)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>🏆 PUNTOS</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'var(--gold)' }}>
                      {selected.loyaltyPoints || 0}
                    </div>
                    <div style={{ height: 4, background: 'var(--dark)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, ((selected.loyaltyPoints || 0) / pointsThreshold) * 100)}%`, background: 'var(--gold)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', marginTop: 4 }}>
                      {selected.loyaltyPoints >= pointsThreshold ? '🎉 ¡Puede canjear!' : `Falta: ${pointsThreshold - (selected.loyaltyPoints || 0)} pts`}
                    </div>
                  </div>
                )}
              </div>

              {/* Info de contacto */}
              {(selected.whatsapp || selected.phone || selected.address) && (
                <div style={{ background: 'var(--dark)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem' }}>
                  {selected.phone && <div style={{ color: 'var(--gray)' }}>📞 {selected.phone}</div>}
                  {selected.whatsapp && <div style={{ color: 'var(--gray)', marginTop: 4 }}>💬 WA: {selected.whatsapp}</div>}
                  {selected.address && <div style={{ color: 'var(--gray)', marginTop: 4 }}>📍 {selected.address}</div>}
                  {selected.notes && <div style={{ color: 'var(--gold)', marginTop: 4 }}>📝 {selected.notes}</div>}
                </div>
              )}

              {/* Historial de pedidos */}
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Historial de pedidos</div>
              {!clientDetail ? (
                <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
              ) : clientDetail.orders?.length === 0 ? (
                <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>Sin pedidos registrados</div>
              ) : clientDetail.orders.map(o => (
                <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, marginRight: 10 }}>{o.orderNumber}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                      {o.items?.map(i => `${i.productName} ${i.variant} ×${i.quantity}`).join(', ')}
                    </span>
                    {o.couponCode && (
                      <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '1px 6px', borderRadius: 100 }}>
                        🎟️ {o.couponCode}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontWeight: 700 }}>{fmt(o.total)}</div>
                    <div style={{ fontSize: '0.7rem', color: STATUS_COLORS[o.status] || 'var(--gray)' }}>
                      {STATUS_LABELS[o.status] || o.status}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>
                      {new Date(o.createdAt).toLocaleDateString('es-AR')}
                    </div>
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
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="11-1234-5678" />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="1141609741" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notas</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ej: sin picante, alergia a..." />
              </div>
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
