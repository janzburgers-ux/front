import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, ChefHat, Wifi, WifiOff, Flame, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const STATUS_FLOW = {
  pending:   { next: 'confirmed',  label: '✓ Confirmar',           color: 'btn-primary' },
  confirmed: { next: 'preparing',  label: '🔥 Iniciar Cocción',     color: 'btn-primary' },
  preparing: { next: 'ready',      label: '🔔 Listo para Entregar', color: 'btn-primary' },
  ready:     { next: 'delivered',  label: '✅ Entregado',           color: 'btn-secondary' }
};

const STATUS_LABELS = {
  pending: 'Pendiente', confirmed: 'Confirmado',
  preparing: 'En Cocina', ready: 'Listo'
};

const TARGET_MINUTES = 30;

function useTimer(startDate) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(startDate)) / 1000));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return elapsed;
}

function TimerDisplay({ startDate }) {
  const elapsed = useTimer(startDate);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const over = mins >= TARGET_MINUTES;
  return (
    <span style={{
      fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem',
      color: over ? '#ef4444' : mins >= TARGET_MINUTES * 0.8 ? '#f59e0b' : 'var(--gold)',
      background: over ? 'rgba(239,68,68,0.1)' : 'transparent',
      padding: over ? '2px 6px' : 0, borderRadius: 4
    }}>
      {over && '⚠️ '}{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

function OrderCard({ order, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState(order.deliveryType || 'delivery');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [cancelReason, setCancelReason] = useState('sin_stock');
  const [cancelNotes, setCancelNotes] = useState('');
  const flow = STATUS_FLOW[order.status];
  const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

  const handleDeliveryTypeChange = async (newType) => {
    setDeliveryType(newType);
    try { await API.put(`/orders/${order._id}`, { deliveryType: newType }); }
    catch { toast.error('Error al actualizar tipo de entrega'); setDeliveryType(deliveryType); }
  };

  const handleChange = async () => {
    if (!flow) return;
    setLoading(true);
    try {
      const res = await API.put(`/orders/${order._id}/status`, { status: flow.next });
      if (flow.next === 'confirmed') {
        toast.success(`✅ ${order.orderNumber} confirmado — stock descontado`);
        if (res.data.whatsappSent?.success) toast.success(`📱 WA enviado a ${order.client?.name}`);
        else if (res.data.whatsappSent) toast(`📵 Sin WhatsApp: ${res.data.whatsappSent.reason}`, { icon: '⚠️' });
        setShowTicket(true);
      } else if (flow.next === 'ready') {
        toast.success(`🔔 ${order.orderNumber} listo — WA en camino enviado`);
      } else {
        toast.success(`${order.orderNumber} → ${STATUS_LABELS[flow.next] || flow.next}`);
      }
      onStatusChange(order._id, flow.next, res.data.order);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al actualizar pedido');
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await API.put(`/orders/${order._id}/status`, { status: 'cancelled', reason: cancelReason, notes: cancelNotes });
      toast.success(`❌ ${order.publicCode || order.orderNumber} cancelado — WA enviado al cliente`);
      setShowCancelModal(false);
      onStatusChange(order._id, 'cancelled', null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cancelar');
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Modal Ticket de Cocina */}
      {showTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowTicket(false)}>
          <div style={{ background: '#1a1a1a', border: '2px solid var(--gold)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--gray)', letterSpacing: 2 }}>TICKET DE COCINA</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: 'var(--gold)' }}>{order.publicCode || order.orderNumber}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.client?.name}</div>
              <div style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>{order.deliveryType === 'delivery' ? '🛵 Delivery' : '🥡 Take Away'}</div>
            </div>
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.2)', borderBottom: '1px dashed rgba(255,255,255,0.2)', padding: '14px 0', marginBottom: 14 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
                    <span>
                      <span style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>×{item.quantity}</span>
                      {' '}{item.productName} <span style={{ color: 'var(--gold)' }}>{item.variant}</span>
                    </span>
                    <span style={{ color: 'var(--gold)' }}>{fmt(item.unitPrice * item.quantity)}</span>
                  </div>
                  {item.additionals?.length > 0 && (
                    <div style={{ paddingLeft: 16, marginTop: 4 }}>
                      {item.additionals.map((a, ai) => (
                        <div key={ai} style={{ fontSize: '0.82rem', color: '#aaa' }}>+ {a.name} {a.quantity > 1 ? `×${a.quantity}` : ''}</div>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div style={{ marginTop: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(232,184,75,0.15)', fontSize: '0.8rem', color: '#f5d06a' }}>📝 {item.notes}</div>
                  )}
                </div>
              ))}
            </div>
            {order.notes && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 14, fontSize: '0.85rem', color: '#fca5a5' }}>
                ⚠️ {order.notes}
              </div>
            )}
            {order.deliveryAddress && (
              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 14 }}>📍 {order.deliveryAddress}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>
              <span>TOTAL</span>
              <span style={{ color: 'var(--gold)' }}>{fmt(order.total)}</span>
            </div>
            <button onClick={() => setShowTicket(false)} className="btn btn-primary" style={{ width: '100%' }}>
              ✓ Entendido
            </button>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className={`kitchen-card ${order.status}`}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--gold)', lineHeight: 1 }}>
              {order.publicCode || order.orderNumber}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gray)', marginTop: 1 }}>{order.orderNumber}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{order.client?.name}</div>
            {order.client?.phone && <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{order.client.phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <Clock size={11} color="var(--gray)" />
              <TimerDisplay startDate={order.receivedAt || order.createdAt} />
            </div>
          </div>
        </div>

        {/* Delivery type */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['delivery', '🛵 Delivery', 'var(--gold)', 'rgba(232,184,75,0.2)'],
            ['takeaway', '🥡 Take Away', '#818cf8', 'rgba(129,140,248,0.15)']].map(([val, label, color, bg]) => (
            <button key={val} onClick={() => handleDeliveryTypeChange(val)}
              style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                background: deliveryType === val ? bg : 'var(--dark)',
                color: deliveryType === val ? color : 'var(--gray)',
                outline: deliveryType === val ? `1px solid ${color}` : '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Items */}
        <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
          {order.items?.map((item, idx) => (
            <div key={idx} style={{
              paddingBottom: idx < order.items.length - 1 ? 10 : 0,
              marginBottom: idx < order.items.length - 1 ? 10 : 0,
              borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                <span style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>×{item.quantity}</span>
                {' '}{item.productName} <span style={{ color: 'var(--gold)' }}>{item.variant}</span>
              </div>
              {item.additionals?.length > 0 && (
                <div style={{ marginTop: 4, paddingLeft: 12 }}>
                  {item.additionals.map((a, ai) => (
                    <div key={ai} style={{ fontSize: '0.82rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--gold)' }}>+</span>
                      {a.name} {a.quantity > 1 ? `×${a.quantity}` : ''}
                    </div>
                  ))}
                </div>
              )}
              {item.notes && (
                <div style={{
                  marginTop: 6, padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(232,184,75,0.15)', border: '1px solid rgba(232,184,75,0.4)',
                  fontSize: '0.8rem', color: '#f5d06a', fontWeight: 600
                }}>
                  📝 {item.notes}
                </div>
              )}
            </div>
          ))}
          {order.notes && (
            <div style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600
            }}>
              ⚠️ {order.notes}
            </div>
          )}
        </div>

        {/* Acción */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
            {order.paymentMethod === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
            {order.deliveryType === 'delivery' && (
              <div style={{ marginTop: 4 }}>
                {order.zone && <span>📍 {order.zone}</span>}
                {order.deliveryAddress && (
                  <span style={{ display: 'block', color: 'white', fontWeight: 600, marginTop: 2 }}>
                    🏠 {order.deliveryAddress}
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {order.status === 'pending' && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowCancelModal(true)} disabled={loading} title="Cancelar pedido">
                ✕ Cancelar
              </button>
            )}
            {flow ? (
              <button className={`btn ${flow.color}`} onClick={handleChange} disabled={loading}>
                {loading ? '...' : flow.label}
              </button>
            ) : (
              <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✅ Entregado</span>
            )}
          </div>
        </div>

        {/* Modal cancelar */}
        {showCancelModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setShowCancelModal(false)}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', marginBottom: 4 }}>Cancelar pedido</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 20 }}>
                Se enviará un WA al cliente avisando la cancelación.
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-light)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Motivo</label>
                <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--white)', padding: '10px 14px', fontSize: '0.875rem', outline: 'none' }}>
                  <option value="sin_stock">Sin stock de ingredientes</option>
                  <option value="cocina_cerrada">Cocina cerrada</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-light)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
                <textarea value={cancelNotes} onChange={e => setCancelNotes(e.target.value)}
                  placeholder="Ej: falta carne, no hay papas..."
                  rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--white)', padding: '10px 14px', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowCancelModal(false)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleCancel} disabled={loading}>
                  {loading ? '...' : '✕ Confirmar cancelación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Página principal de Cocina ────────────────────────────────────────────────
export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      beep(880, ctx.currentTime, 0.15);
      beep(1100, ctx.currentTime + 0.2, 0.15);
      beep(1320, ctx.currentTime + 0.4, 0.25);
    } catch {}
  }

  const fetchOrders = useCallback(() => {
    API.get('/orders', { params: { status: 'pending,confirmed,preparing,ready', limit: 30 } })
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
    const apiUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(apiUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('new_order', (order) => {
      setOrders(prev => {
        if (prev.some(o => o._id === order._id)) return prev;
        return [order, ...prev];
      });
      playSound();
      toast.success(`🆕 Nuevo pedido: ${order.orderNumber} — ${order.client?.name}`, { duration: 6000 });
    });
    socket.on('order_updated', ({ orderId, status, order: updatedOrder }) => {
      if (status === 'delivered' || status === 'cancelled') {
        setOrders(prev => prev.filter(o => o._id !== orderId));
      } else {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updatedOrder, status } : o));
      }
    });
    return () => socket.disconnect();
  }, [fetchOrders]);

  const handleStatusChange = (orderId, newStatus, updatedOrder) => {
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } else {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...(updatedOrder || {}), status: newStatus } : o));
    }
  };

  const columns = {
    pending:   orders.filter(o => o.status === 'pending'),
    confirmed: orders.filter(o => o.status === 'confirmed'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready:     orders.filter(o => o.status === 'ready')
  };

  const colConfig = [
    { key: 'pending',   label: 'Pendientes',  icon: '🕐', color: '#f59e0b' },
    { key: 'confirmed', label: 'Confirmados', icon: '✅', color: '#22c55e' },
    { key: 'preparing', label: 'En Cocina',   icon: '🔥', color: 'var(--gold)' },
    { key: 'ready',     label: 'Listos',      icon: '🔔', color: '#818cf8' }
  ];

  const [activeTab, setActiveTab] = useState('pending');
  const isMobile = window.innerWidth < 768;

  return (
    <>
      <div className="page-header">
        <h1><ChefHat size={24} style={{ display: 'inline', marginRight: 10 }} />Panel de Cocina</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: connected ? '#22c55e' : '#ef4444' }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'En vivo' : 'Sin conexión'}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>↻ Actualizar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : isMobile ? (
        <div style={{ padding: '0 16px 32px' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--card)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
            {colConfig.map(col => (
              <button key={col.key} onClick={() => setActiveTab(col.key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: activeTab === col.key ? `${col.color}20` : 'transparent',
                  outline: activeTab === col.key ? `1.5px solid ${col.color}` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.2s' }}>
                <span style={{ fontSize: '1rem' }}>{col.icon}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: activeTab === col.key ? col.color : 'var(--gray)', lineHeight: 1.2, textAlign: 'center' }}>
                  {col.label}
                </span>
                {columns[col.key].length > 0 && (
                  <span style={{ background: col.color, color: '#000', borderRadius: 100, fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', lineHeight: 1.4 }}>
                    {columns[col.key].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {columns[activeTab].length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)', border: '1px dashed var(--border)', borderRadius: 12, fontSize: '0.85rem' }}>
                Sin pedidos
              </div>
            ) : columns[activeTab].map(order => (
              <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '0 20px 32px' }}>
          {colConfig.map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 0', borderBottom: `2px solid ${col.color}` }}>
                <span>{col.icon}</span>
                <span style={{ fontWeight: 700, color: col.color }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', background: col.color, color: '#000', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                  {columns[col.key].length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {columns[col.key].length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray)', border: '1px dashed var(--border)', borderRadius: 8, fontSize: '0.85rem' }}>
                    Sin pedidos
                  </div>
                ) : columns[col.key].map(order => (
                  <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}