import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, ChefHat, Wifi, WifiOff } from 'lucide-react';
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

// Formatea hora en AR
function fmtHora(date) {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
}

// Calcula readyAt y deliveryAt a partir de los datos del pedido
function calcDeadlines(order) {
  const confirmedMins = order.confirmedMinutes || order.estimatedMinutes || TARGET_MINUTES;
  const deliveryMins  = order.deliveryMinutes || 15;
  const cookMins      = Math.max(1, confirmedMins - deliveryMins);

  // Pedidos programados: si ya comenzó la cocción, contar desde cookingStartedAt
  // Si todavía no empezó, mostrar cuenta regresiva hasta scheduledFor
  if (order.isScheduled && order.scheduledFor) {
    if (order.cookingStartedAt) {
      // Ya inició cocción → contar desde cookingStartedAt
      const cookStart  = new Date(order.cookingStartedAt);
      const readyAt    = new Date(cookStart.getTime() + cookMins * 60000);
      const deliveryAt = new Date(cookStart.getTime() + confirmedMins * 60000);
      return { readyAt, deliveryAt, cookMins, deliveryMins, mode: 'cooking' };
    }
    // Aún no inició → mostrar hora programada
    const deliveryAt = new Date(order.scheduledFor);
    const readyAt    = new Date(deliveryAt.getTime() - deliveryMins * 60000);
    return { readyAt, deliveryAt, cookMins, deliveryMins, mode: 'scheduled' };
  }

  // Pedido normal: contar desde confirmedAt si existe, sino desde createdAt
  const base       = new Date(order.confirmedAt || order.receivedAt || order.createdAt);
  const readyAt    = new Date(base.getTime() + cookMins * 60000);
  const deliveryAt = new Date(base.getTime() + confirmedMins * 60000);
  return { readyAt, deliveryAt, cookMins, deliveryMins, mode: 'normal' };
}

function CountdownDisplay({ order }) {
  const { readyAt, deliveryAt, cookMins, deliveryMins } = calcDeadlines(order);
  const readyAtMs = readyAt.getTime();
  const [secsLeft, setSecsLeft] = useState(Math.floor((readyAtMs - Date.now()) / 1000));

  useEffect(() => {
    const id = setInterval(() => setSecsLeft(Math.floor((readyAtMs - Date.now()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [readyAtMs]);

  const absSeconds = Math.abs(secsLeft);
  const hours = Math.floor(absSeconds / 3600);
  const mins  = Math.floor((absSeconds % 3600) / 60);
  const secs  = absSeconds % 60;

  const overdue  = secsLeft < 0;
  const urgent   = !overdue && secsLeft < 10 * 60;
  const warning  = !overdue && !urgent && secsLeft < 20 * 60;

  const color = overdue ? '#f04444' : urgent ? '#f04444' : warning ? '#eab308' : '#22c55e';
  const bg    = overdue ? 'rgba(240,68,68,0.12)' : urgent ? 'rgba(240,68,68,0.08)' : warning ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.06)';
  const label = overdue ? 'Demorado' : urgent ? 'Muy urgente' : warning ? 'Atención' : 'En tiempo';

  const timeStr = hours > 0
    ? `${hours}h ${String(mins).padStart(2, '0')}m`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.3rem', color, minWidth: 58 }}>
        {overdue ? '-' : ''}{timeStr}
      </div>
      <div style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, color }}>{label}</div>
        <div style={{ color: 'var(--gray-light)' }}>
          Listo: <span style={{ color: '#f0f0f8', fontWeight: 600 }}>{fmtHora(readyAt)}</span>
          {' · '}
          Entrega: <span style={{ color: '#f0f0f8', fontWeight: 600 }}>{fmtHora(deliveryAt)}</span>
        </div>
        <div style={{ color: 'var(--gray)', fontSize: '0.68rem' }}>
          cocina {cookMins}min + delivery {deliveryMins}min
        </div>
      </div>
    </div>
  );
}

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

// ── Badge de horario programado ────────────────────────────────────────────────
function ScheduleBadge({ order }) {
  if (!order.isScheduled || !order.scheduledFor) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.2)',
        fontSize: '0.72rem', fontWeight: 700, color: '#22c55e',
      }}>
        🚀 Lo antes posible
      </div>
    );
  }

  let horaStr = order.scheduledFor;
  if (typeof horaStr !== 'string' || horaStr.length > 5) {
    try {
      horaStr = new Date(horaStr).toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
    } catch {
      horaStr = order.scheduledFor;
    }
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 8,
      background: 'rgba(232,184,75,0.1)',
      border: '1px solid rgba(232,184,75,0.35)',
      fontSize: '0.72rem', fontWeight: 700, color: '#E8B84B',
    }}>
      🕐 Programado — {horaStr}hs
    </div>
  );
}

function OrderCard({ order, onStatusChange }) {
  const [loading, setLoading]               = useState(false);
  const [deliveryType, setDeliveryType]     = useState(order.deliveryType || 'delivery');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedMinutes, setConfirmedMinutes] = useState(order.estimatedMinutes || 20);
  const [showTicket, setShowTicket]         = useState(false);
  const [cancelReason, setCancelReason]     = useState('sin_stock');
  const [cancelNotes, setCancelNotes]       = useState('');
  const flow = STATUS_FLOW[order.status];
  const fmt  = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

  const handleDeliveryTypeChange = async (newType) => {
    setDeliveryType(newType);
    try { await API.put(`/orders/${order._id}`, { deliveryType: newType }); }
    catch { toast.error('Error al actualizar tipo de entrega'); setDeliveryType(deliveryType); }
  };

  const handleChange = async () => {
    if (!flow) return;
    if (flow.next === 'confirmed') {
      if (order.isScheduled && order.scheduledFor) {
        const minsUntil = Math.round((new Date(order.scheduledFor) - Date.now()) / 60000);
        setConfirmedMinutes(Math.max(minsUntil, 10));
      } else {
        setConfirmedMinutes(order.estimatedMinutes || 20);
      }
      setShowConfirmModal(true);
      return;
    }
    doStatusChange(flow.next, null);
  };

  const doStatusChange = async (nextStatus, minutes) => {
    setLoading(true);
    try {
      const body = { status: nextStatus };
      if (minutes) body.confirmedMinutes = minutes;
      const res = await API.put(`/orders/${order._id}/status`, body);
      if (nextStatus === 'confirmed') {
        toast.success(`✅ ${order.orderNumber} confirmado — stock descontado`);
        if (res.data.whatsappSent?.success) toast.success(`📱 WA enviado a ${order.client?.name}`);
        else if (res.data.whatsappSent) toast(`📵 Sin WhatsApp: ${res.data.whatsappSent.reason}`, { icon: '⚠️' });
        setShowTicket(true);
      } else if (nextStatus === 'ready') {
        toast.success(`🔔 ${order.orderNumber} listo — WA en camino enviado`);
      } else {
        toast.success(`${order.orderNumber} → ${STATUS_LABELS[nextStatus] || nextStatus}`);
      }
      onStatusChange(order._id, nextStatus, res.data.order);
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
              <div style={{ marginTop: 8 }}>
                <ScheduleBadge order={order} />
              </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
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

        {/* Badge horario */}
        <div style={{ marginBottom: 10 }}>
          <ScheduleBadge order={order} />
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

        {/* Cuenta regresiva */}
        <CountdownDisplay order={order} />

        {/* Acción */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
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

        {/* Modal confirmar tiempo */}
        {showConfirmModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setShowConfirmModal(false)}>
            <div style={{ background: 'var(--card)', border: '2px solid var(--gold)', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--gold)', marginBottom: 4 }}>⏱️ Confirmar tiempo</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 20 }}>
                {order.isScheduled && order.scheduledFor
                  ? <>Pedido programado. Pre-cargado con el tiempo hasta la entrega. Ajustá si hace falta.</>
                  : <>El sistema estimó <strong style={{ color: 'var(--gold)' }}>{order.estimatedMinutes || 20} min</strong>. Ajustá si hace falta — el cliente recibe este tiempo por WhatsApp.</>
                }
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-light)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                  Tiempo estimado (minutos)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[15, 20, 25, 30, 40, 45].map(m => (
                    <button key={m} onClick={() => setConfirmedMinutes(m)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        background: confirmedMinutes === m ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                        color: confirmedMinutes === m ? '#000' : 'var(--gray-light)' }}>
                      {m}′
                    </button>
                  ))}
                </div>
                <input
                  type="number" min="5" max="120"
                  value={confirmedMinutes}
                  onChange={e => setConfirmedMinutes(Number(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--white)', padding: '10px 14px', fontSize: '1rem', outline: 'none', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={loading} onClick={() => {
                  setShowConfirmModal(false);
                  doStatusChange('confirmed', confirmedMinutes);
                }}>
                  {loading ? '...' : '✓ Confirmar y avisar'}
                </button>
              </div>
            </div>
          </div>
        )}

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
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [connected, setConnected] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null); // { orderNumber, clientName }
  const socketRef = useRef(null);
  const alertTimerRef = useRef(null);

  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (freq, startTime, duration, vol = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime); osc.stop(startTime + duration);
      };
      // Triple beep más notorio
      beep(880,  ctx.currentTime,       0.18);
      beep(1100, ctx.currentTime + 0.22, 0.18);
      beep(1320, ctx.currentTime + 0.44, 0.28);
      beep(880,  ctx.currentTime + 0.8,  0.18);
      beep(1100, ctx.currentTime + 1.02, 0.18);
      beep(1320, ctx.currentTime + 1.24, 0.28);
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
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('new_order', (order) => {
      setOrders(prev => {
        if (prev.some(o => o._id === order._id)) return prev;
        return [order, ...prev];
      });
      playSound();
      // Banner visual persistente (10 segundos)
      setNewOrderAlert({ orderNumber: order.orderNumber, clientName: order.client?.name });
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewOrderAlert(null), 10000);
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

  const sortByUrgency = (orders) => [...orders].sort((a, b) => {
    const getReadyAt = (o) => {
      const confirmedMins = o.confirmedMinutes || o.estimatedMinutes || 30;
      const deliveryMins  = o.deliveryMinutes || 15;
      if (o.isScheduled && o.scheduledFor) {
        return new Date(o.scheduledFor).getTime() - deliveryMins * 60000;
      }
      const cookMins = confirmedMins - deliveryMins;
      return new Date(o.receivedAt || o.createdAt).getTime() + cookMins * 60000;
    };
    return getReadyAt(a) - getReadyAt(b);
  });

  const columns = {
    pending:   sortByUrgency(orders.filter(o => o.status === 'pending')),
    confirmed: sortByUrgency(orders.filter(o => o.status === 'confirmed')),
    preparing: sortByUrgency(orders.filter(o => o.status === 'preparing')),
    ready:     orders.filter(o => o.status === 'ready'),
  };

  const colConfig = [
    { key: 'pending',   label: 'Pendientes',  icon: '🕐', color: '#f59e0b' },
    { key: 'confirmed', label: 'Confirmados', icon: '✅', color: '#22c55e' },
    { key: 'preparing', label: 'En Cocina',   icon: '🔥', color: 'var(--gold)' },
    { key: 'ready',     label: 'Listos',      icon: '🔔', color: '#818cf8' },
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

      {/* Banner de alerta nuevo pedido */}
      {newOrderAlert && (
        <div onClick={() => setNewOrderAlert(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #e8b84b, #f59e0b)',
          color: '#000', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(232,184,75,0.5)',
          animation: 'pulse 0.8s infinite alternate',
        }}>
          <span>🆕 NUEVO PEDIDO — {newOrderAlert.orderNumber} · {newOrderAlert.clientName}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Toca para cerrar</span>
        </div>
      )}
      <style>{`@keyframes pulse { from { opacity: 1; } to { opacity: 0.85; } }`}</style>

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