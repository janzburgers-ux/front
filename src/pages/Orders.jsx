import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const STATUS_LABELS = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado'
};

// ── Modal de confirmación para eliminar pedido ────────────────────────────────
function DeleteOrderModal({ order, onClose, onDeleted }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!password.trim()) return toast.error('Ingresá la contraseña');
    setLoading(true);
    try {
      await API.delete(`/orders/${order._id}`, { data: { password } });
      toast.success(`Pedido #${order.orderNumber} eliminado`);
      onDeleted(order._id);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al eliminar');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: 28, width: 400, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ef4444' }}>Eliminar pedido</h2>
        </div>
        <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: 6 }}>
          Vas a eliminar permanentemente el pedido <strong style={{ color: 'var(--text)' }}>#{order.orderNumber}</strong> de <strong style={{ color: 'var(--text)' }}>{order.client?.name}</strong>.
        </p>
        <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 18 }}>
          Esta acción no se puede deshacer. El stock descontado será devuelto.
        </p>
        <label style={{ fontSize: '0.78rem', color: 'var(--gray)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Contraseña de seguridad
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDelete()}
          placeholder="Ingresá la contraseña..."
          autoFocus
          style={{ width: '100%', marginBottom: 18, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{ background: loading ? '#333' : '#ef4444', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={14} /> {loading ? 'Eliminando...' : 'Eliminar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewOrderModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ client: '', items: [], notes: '', paymentMethod: 'efectivo', additionals: 0 });
  const [clientSearch, setClientSearch] = useState('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', whatsapp: '' });
  const [creatingClient, setCreatingClient] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/clients').then(r => setClients(r.data));
    API.get('/products').then(r => setProducts(r.data));
  }, []);

  const addItem = (product) => {
    const existing = form.items.find(i => i.product === product._id);
    if (existing) {
      setForm(f => ({ ...f, items: f.items.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i) }));
    } else {
      setForm(f => ({ ...f, items: [...f.items, { product: product._id, productName: product.name, variant: product.variant, quantity: 1, unitPrice: product.salePrice, notes: '' }] }));
    }
  };

  const removeItem = (productId) => {
    setForm(f => ({ ...f, items: f.items.filter(i => i.product !== productId) }));
  };

  const total = form.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + Number(form.additionals || 0);

  const handleCreateClient = async () => {
    try {
      const res = await API.post('/clients', newClient);
      setClients(c => [...c, res.data]);
      setForm(f => ({ ...f, client: res.data._id }));
      setCreatingClient(false);
      setNewClient({ name: '', phone: '', whatsapp: '' });
      toast.success('Cliente creado');
    } catch { toast.error('Error al crear cliente'); }
  };

  const handleSubmit = async () => {
    if (!form.client) return toast.error('Seleccioná un cliente');
    if (form.items.length === 0) return toast.error('Agregá al menos un producto');
    setLoading(true);
    try {
      const res = await API.post('/orders', form);
      toast.success(`Pedido ${res.data.orderNumber} creado`);
      onCreated(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear pedido');
    } finally { setLoading(false); }
  };

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.name]) acc[p.name] = [];
    acc[p.name].push(p);
    return acc;
  }, {});

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h2>Nuevo Pedido</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Client */}
          <div className="form-group">
            <label>Cliente</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-sm" onClick={() => setCreatingClient(true)}>+ Nuevo</button>
            </div>
            {clientSearch && (
              <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {filteredClients.map(c => (
                  <div key={c._id} onClick={() => { setForm(f => ({ ...f, client: c._id })); setClientSearch(c.name); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    className={form.client === c._id ? 'text-gold' : ''}>
                    {c.name} {c.phone && <span className="text-gray text-xs">· {c.phone}</span>}
                  </div>
                ))}
                {filteredClients.length === 0 && <div style={{ padding: '10px 14px', color: 'var(--gray)' }}>Sin resultados</div>}
              </div>
            )}
            {creatingClient && (
              <div style={{ background: 'var(--dark)', padding: 16, borderRadius: 8, marginTop: 8, border: '1px solid var(--gold)' }}>
                <div className="grid-3" style={{ marginBottom: 10 }}>
                  <input placeholder="Nombre *" value={newClient.name} onChange={e => setNewClient(n => ({ ...n, name: e.target.value }))} />
                  <input placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient(n => ({ ...n, phone: e.target.value }))} />
                  <input placeholder="WhatsApp" value={newClient.whatsapp} onChange={e => setNewClient(n => ({ ...n, whatsapp: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateClient}>Crear</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCreatingClient(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="form-group">
            <label>Productos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(grouped).map(([name, variants]) => (
                <div key={name}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--gold)' }}>{name}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {variants.sort((a,b) => a.variant.localeCompare(b.variant)).map(p => {
                      const inOrder = form.items.find(i => i.product === p._id);
                      return (
                        <button key={p._id} onClick={() => addItem(p)}
                          className={`btn btn-sm ${inOrder ? 'btn-primary' : 'btn-secondary'}`}>
                          {p.variant} {inOrder ? `(×${inOrder.quantity})` : ''} — {fmt(p.salePrice)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order items */}
          {form.items.length > 0 && (
            <div style={{ background: 'var(--dark)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Resumen del Pedido</div>
              {form.items.map(item => (
                <div key={item.product} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span>{item.productName} {item.variant} ×{item.quantity}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="text-gold">{fmt(item.unitPrice * item.quantity)}</span>
                    <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => removeItem(item.product)}>✕</button>
                  </div>
                </div>
              ))}
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>TOTAL</span>
                <span className="text-gold" style={{ fontSize: '1.1rem' }}>{fmt(total)}</span>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label>Método de Pago</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="form-group">
              <label>Adicionales ($)</label>
              <input type="number" value={form.additionals} onChange={e => setForm(f => ({ ...f, additionals: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Notas</label>
            <input placeholder="ej: sin cheddar, extra picante..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : `Crear Pedido ${total > 0 ? `— ${fmt(total)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(null); // order to delete
  const { isAdmin } = useAuth();

  const fetchOrders = () => {
    const params = filter !== 'all' ? { status: filter } : {};
    API.get('/orders', { params }).then(r => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const statusOptions = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

  return (
    <>
      <div className="page-header">
        <h1>Pedidos</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/>Nuevo Pedido</button>}
      </div>
      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {statusOptions.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
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
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: 32, color: 'var(--gray)' }}>Sin pedidos</td></tr>
                ) : orders.map(o => (
                  <tr key={o._id}>
                    <td><strong className="text-gold">{o.orderNumber}</strong></td>
                    <td>
                      <div>{o.client?.name}</div>
                      {o.client?.phone && <div className="text-xs text-gray">{o.client.phone}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {o.items?.map(i => `${i.productName} ${i.variant} ×${i.quantity}`).join(', ')}
                      </div>
                    </td>
                    <td><strong>{fmt(o.total)}</strong></td>
                    <td className="capitalize text-sm text-gray">{o.paymentMethod}</td>
                    <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                    <td className="text-sm text-gray">{new Date(o.createdAt).toLocaleDateString('es-AR')}</td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => setDeleteModal(o)}
                          title="Eliminar pedido"
                          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', opacity: 0.7, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <NewOrderModal onClose={() => setShowModal(false)} onCreated={o => setOrders(prev => [o, ...prev])} />}
      {deleteModal && (
        <DeleteOrderModal
          order={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={id => setOrders(prev => prev.filter(o => o._id !== id))}
        />
      )}
    </>
  );
}
