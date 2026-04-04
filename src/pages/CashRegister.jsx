import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'En Cocina', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado' };
const STATUS_COLORS = { delivered: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444' };

function DayCard({ summary, isToday, onClick }) {
  const date = new Date(summary.date + 'T12:00:00');
  const dayName = DAYS[date.getDay()];
  const dayNum = date.getDate();
  const hasOrders = summary.orders.total > 0;

  return (
    <div onClick={onClick} style={{ background: isToday ? 'rgba(232,184,75,0.08)' : 'var(--card)', border: `1px solid ${isToday ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>{dayName}</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: isToday ? 'var(--gold)' : 'white', lineHeight: 1 }}>{dayNum}</div>
        </div>
        {isToday && <span style={{ background: 'var(--gold)', color: '#000', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>HOY</span>}
      </div>
      {hasOrders ? (
        <>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: 4 }}>{fmt(summary.revenue.total)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{summary.orders.delivered} entregados / {summary.orders.total} total</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {summary.revenue.efectivo > 0 && (
              <span style={{ fontSize: '0.68rem', background: 'rgba(232,184,75,0.15)', color: '#E8B84B', padding: '2px 6px', borderRadius: 100 }}>
                💵 {fmt(summary.revenue.efectivo)}
              </span>
            )}
            {summary.revenue.transferencia > 0 && (
              <span style={{ fontSize: '0.68rem', background: 'rgba(129,140,248,0.15)', color: '#818cf8', padding: '2px 6px', borderRadius: 100 }}>
                🏦 {fmt(summary.revenue.transferencia)}
              </span>
            )}
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>Sin pedidos</div>
      )}
    </div>
  );
}

function DayDetail({ summary, onClose, onSendClose }) {
  const [ownerPhone, setOwnerPhone] = useState('');
  const [sending, setSending] = useState(false);
  const date = new Date(summary.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleClose = async () => {
    if (!ownerPhone.trim()) { toast.error('Ingresá el número del dueño'); return; }
    setSending(true);
    try {
      await onSendClose(ownerPhone, summary.date);
      toast.success('Cierre enviado por WhatsApp ✓');
    } catch {
      toast.error('Error al enviar el cierre');
    } finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'white' }}>{date}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{summary.orders.total} pedidos totales</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        {/* Resumen de caja */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--gold)' }}>Resumen de caja</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>💵 Efectivo</span>
            <strong style={{ color: '#E8B84B' }}>{fmt(summary.revenue.efectivo)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span>🏦 Transferencia</span>
            <strong style={{ color: '#818cf8' }}>{fmt(summary.revenue.transferencia)}</strong>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <strong>TOTAL</strong>
            <strong style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--gold)' }}>{fmt(summary.revenue.total)}</strong>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Entregados', value: summary.orders.delivered, color: '#22c55e' },
            { label: 'Pendientes', value: summary.orders.pending, color: '#f59e0b' },
            { label: 'Tiempo prom.', value: summary.avgDeliveryTime ? `${summary.avgDeliveryTime}m` : '—', color: 'var(--gold)' }
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Detalle pedidos */}
        {summary.ordersDetail?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.85rem', color: 'var(--gray)', textTransform: 'uppercase' }}>Pedidos</div>
            {summary.ordersDetail.map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e1e', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, marginRight: 8 }}>{o.orderNumber}</span>
                  <span>{o.client}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--gray)' }}>{o.paymentMethod === 'efectivo' ? '💵' : '🏦'}</span>
                  <span style={{ fontWeight: 700 }}>{fmt(o.total)}</span>
                  <span style={{ fontSize: '0.72rem', color: STATUS_COLORS[o.status] || 'var(--gray)' }}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cierre por WhatsApp */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>📲 Enviar cierre por WhatsApp</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 12 }}>
            El resumen completo se envía al número que ingresés.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
              placeholder="Número del dueño (ej: 1141609741)"
              style={{ flex: 1, background: '#111', border: '1px solid var(--border)', borderRadius: 8, color: 'white', padding: '10px 14px', fontSize: '0.875rem', outline: 'none' }} />
            <button onClick={handleClose} disabled={sending}
              style={{ background: '#22c55e', color: '#000', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {sending ? '...' : '📤 Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashRegister() {
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

  const fetchWeekly = () => {
    setLoading(true);
    API.get('/dashboard/cash/week')
      .then(r => setWeekly(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWeekly(); }, []);

  const handleSendClose = async (ownerPhone, date) => {
    await API.post('/dashboard/cash/close', { ownerPhone, date });
    fetchWeekly();
  };

  const totals = weekly.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue.total,
    efectivo: acc.efectivo + d.revenue.efectivo,
    transferencia: acc.transferencia + d.revenue.transferencia,
    orders: acc.orders + d.orders.delivered
  }), { revenue: 0, efectivo: 0, transferencia: 0, orders: 0 });

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1>💰 Caja</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchWeekly}>↻ Actualizar</button>
      </div>
      <div className="page-body">

        {/* Resumen semanal */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Últimos 7 días</div>
          <div className="stat-grid">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--gold)' }}>{fmt(totals.revenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>💵 EFECTIVO</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#E8B84B' }}>{fmt(totals.efectivo)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>🏦 TRANSFERENCIA</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#818cf8' }}>{fmt(totals.transferencia)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>PEDIDOS ENTREGADOS</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem' }}>{totals.orders}</div>
            </div>
          </div>
        </div>

        {/* Tarjetas por día */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 24 }}>
          {weekly.map(day => (
            <DayCard
              key={day.date}
              summary={day}
              isToday={day.date === todayStr}
              onClick={() => setSelected(day)}
            />
          ))}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--gray)', textAlign: 'center' }}>
          Hacé clic en cualquier día para ver el detalle y enviar el cierre por WhatsApp.
        </div>
      </div>

      {selected && (
        <DayDetail
          summary={selected}
          onClose={() => setSelected(null)}
          onSendClose={handleSendClose}
        />
      )}
    </>
  );
}
