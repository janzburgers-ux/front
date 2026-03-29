import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Instagram } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import logoJanz from '../assets/logo-janz.png';
import heroBurger from '../assets/hero-burger.png';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const labelStyle = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: 'rgba(255,255,255,0.35)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.1em'
};
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  color: 'white', padding: '12px 14px', fontSize: '0.9rem',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
};

function itemTotal(item) {
  const base   = item.unitPrice * item.quantity;
  const extras = (item.additionals || []).reduce((s, a) => s + a.unitPrice * (a.quantity || 1), 0);
  return base + extras;
}

// ── Barra de seguimiento ──────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',   label: 'Recibido',   icon: '📥' },
  { key: 'confirmed', label: 'Confirmado', icon: '✅' },
  { key: 'preparing', label: 'En cocina',  icon: '🔥' },
  { key: 'ready',     label: 'En camino',  icon: '🛵' },
  { key: 'delivered', label: 'Entregado',  icon: '🎉' },
];

function TrackingBar({ status }) {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ padding: '24px 0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 17, left: 20, right: 20, height: 2, background: 'rgba(255,255,255,0.08)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 17, left: 20, height: 2, background: '#E8B84B', zIndex: 1,
          width: idx <= 0 ? '0%' : `${(idx / (STATUS_STEPS.length - 1)) * 90}%`, transition: 'width 0.7s ease' }} />
        {STATUS_STEPS.map((step, i) => {
          const done = i <= idx;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2, flex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: done ? '#E8B84B' : '#111', border: `2px solid ${done ? '#E8B84B' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.4s ease', boxShadow: done ? '0 0 16px rgba(232,184,75,0.4)' : 'none' }}>
                {done ? step.icon : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'block' }} />}
              </div>
              <span style={{ fontSize: '0.58rem', color: done ? '#E8B84B' : 'rgba(255,255,255,0.2)', fontWeight: done ? 700 : 400, textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal de adicionales ──────────────────────────────────────────────────────
function AdditionalsModal({ product, availableAdditionals, onConfirm, onClose }) {
  const [selected,  setSelected]  = useState({});
  const [collapsed, setCollapsed] = useState({});

  const toggle    = (add) => setSelected(prev => prev[add._id] ? (({ [add._id]: _, ...rest }) => rest)(prev) : { ...prev, [add._id]: 1 });
  const changeQty = (addId, delta) => setSelected(prev => {
    const newQty = (prev[addId] || 1) + delta;
    if (newQty <= 0) return (({ [addId]: _, ...rest }) => rest)(prev);
    return { ...prev, [addId]: newQty };
  });
  const toggleSalsa  = (add) => setSelected(prev => prev[add._id] ? (({ [add._id]: _, ...rest }) => rest)(prev) : { ...prev, [add._id]: 1 });
  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const extraTotal = availableAdditionals.reduce((s, a) => selected[a._id] ? s + a.price * selected[a._id] : s, 0);

  const handleConfirm = () => {
    const additionals = availableAdditionals
      .filter(a => selected[a._id])
      .map(a => ({ additional: a._id, name: a.name, unitPrice: a.price, quantity: selected[a._id] }));
    onConfirm(additionals);
  };

  // ── Filtrar adicionales según el tipo de producto ──────────────────────────
  // burger → muestra adicionales de burger + papas (combo) + salsas
  // papas  → muestra solo adicionales de papas + salsas
  // otro   → muestra todos los adicionales + salsas
  //
  // Si un adicional no tiene appliesTo definido, se deduce de su categoría:
  //   hamburguesa/adicional → 'burger'
  //   papas                 → 'papas'
  //   salsa                 → siempre disponible (se filtra aparte)
  const resolveAppliesTo = (a) => {
    if (a.appliesTo) return a.appliesTo;
    if (a.category === 'hamburguesa' || a.category === 'adicional') return 'burger';
    if (a.category === 'papas') return 'papas';
    return 'todos';
  };

  const pType = product.productType || 'burger';

  const burgerAdds = pType === 'burger'
    ? availableAdditionals.filter(a =>
        (a.category === 'hamburguesa' || a.category === 'adicional') &&
        ['burger', 'todos'].includes(resolveAppliesTo(a))
      )
    : [];

  const papasAdds = (pType === 'burger' || pType === 'papas')
    ? availableAdditionals.filter(a =>
        a.category === 'papas' &&
        ['papas', 'todos'].includes(resolveAppliesTo(a))
      )
    : availableAdditionals.filter(a => a.category === 'papas'); // 'otro' → muestra todo

  const salsaAdds = pType === 'papas'
  ? []
  : availableAdditionals.filter(a => a.category === 'salsa');

  // ── Subcomponentes ─────────────────────────────────────────────────────────
  const AdditionalItem = ({ add }) => {
    const qty = selected[add._id] || 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: qty > 0 ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${qty > 0 ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, transition: 'all 0.2s' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{add.emoji} {add.name}</div>
          {add.description && <div style={{ color: '#555', fontSize: '0.73rem', marginTop: 2 }}>{add.description}</div>}
          <div style={{ color: '#E8B84B', fontWeight: 700, fontSize: '0.88rem', marginTop: 4 }}>{fmt(add.price)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {qty > 0 ? (
            <>
              <button onClick={() => changeQty(add._id, -1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button>
              <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center', color: 'white' }}>{qty}</span>
              <button onClick={() => changeQty(add._id, 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8B84B', border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}>+</button>
            </>
          ) : (
            <button onClick={() => toggle(add)} style={{ background: 'rgba(232,184,75,0.1)', color: '#E8B84B', border: '1px solid rgba(232,184,75,0.3)', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Agregar</button>
          )}
        </div>
      </div>
    );
  };

  const SalsaItem = ({ add }) => {
    const active = !!selected[add._id];
    return (
      <button onClick={() => toggleSalsa(add)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: active ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{add.emoji} {add.name}</div>
          {add.description && <div style={{ color: '#555', fontSize: '0.73rem', marginTop: 2 }}>{add.description}</div>}
          {add.price > 0 && <div style={{ color: '#E8B84B', fontWeight: 700, fontSize: '0.88rem', marginTop: 4 }}>{fmt(add.price)}</div>}
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${active ? '#E8B84B' : 'rgba(255,255,255,0.15)'}`, background: active ? '#E8B84B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          {active && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
        </div>
      </button>
    );
  };

  const Group = ({ groupKey, emoji, label, children, count }) => {
    const isCollapsed = collapsed[groupKey];
    return (
      <div style={{ marginBottom: 4 }}>
        <button onClick={() => toggleCollapse(groupKey)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', marginBottom: isCollapsed ? 0 : 6 }}>
          <span style={{ fontSize: '0.9rem' }}>{emoji}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
          {count > 0 && <span style={{ background: '#E8B84B', color: '#000', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px' }}>{count}</span>}
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
          <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 4 }}>{isCollapsed ? '▸' : '▾'}</span>
        </button>
        {!isCollapsed && children}
      </div>
    );
  };

  const burgerCount = burgerAdds.filter(a => selected[a._id]).length;
  const papasCount  = papasAdds.filter(a => selected[a._id]).length;
  const salsaCount  = salsaAdds.filter(a => selected[a._id]).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0f0f0f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 24, maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' }}>{product.name} <span style={{ color: '#E8B84B' }}>{product.variant}</span></div>
        <div style={{ color: '#444', fontSize: '0.82rem', marginBottom: 20 }}>Personalizá tu pedido</div>

        {burgerAdds.length > 0 && (
          <Group groupKey="burger" emoji="🍔" label="Para la hamburguesa" count={burgerCount}>
            {burgerAdds.map(add => <AdditionalItem key={add._id} add={add} />)}
          </Group>
        )}
        {papasAdds.length > 0 && (
          <Group groupKey="papas" emoji="🍟" label="Para las papas" count={papasCount}>
            {papasAdds.map(add => <AdditionalItem key={add._id} add={add} />)}
          </Group>
        )}
        {salsaAdds.length > 0 && (
          <Group groupKey="salsas" emoji="🫙" label="Salsas" count={salsaCount}>
            {salsaAdds.map(add => <SalsaItem key={add._id} add={add} />)}
          </Group>
        )}

        {burgerAdds.length === 0 && papasAdds.length === 0 && salsaAdds.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#444', fontSize: '0.85rem' }}>
            No hay adicionales disponibles para este producto.
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleConfirm} style={{ flex: 2, background: '#E8B84B', color: '#000', border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>
            Confirmar {extraTotal > 0 ? `(+ ${fmt(extraTotal)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PublicOrder() {
  const [menu, setMenu]                         = useState({});
  const [availableAdditionals, setAvailableAdditionals] = useState([]);
  const [zones, setZones]                       = useState([]);
  const [open, setOpen]                         = useState(false);
  const [cart, setCart]                         = useState([]);
  const [step, setStep]                         = useState('menu');
  const [loading, setLoading]                   = useState(true);
  const [systemDown, setSystemDown]             = useState(false);
  const [showWelcome, setShowWelcome]           = useState(() => {
    try { return !localStorage.getItem('janz_visited'); } catch { return false; }
  });
  const [limits, setLimits]         = useState({ enabled: false, limitReached: false, dailyMax: 50, todayCount: 0 });
  const [businessWhatsapp, setBusinessWhatsapp] = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [orderResult, setOrderResult]           = useState(null);
  const [orderStatus, setOrderStatus]           = useState(null);
  const [additionalsModal, setAdditionalsModal] = useState(null);
  const [deliveryType, setDeliveryType]         = useState('delivery');
  const [selectedZone, setSelectedZone]         = useState('');
  const [deliveryCost, setDeliveryCost]         = useState(0);
  const [couponCode, setCouponCode]             = useState('');
  const [couponStatus, setCouponStatus]         = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [transferAlias, setTransferAlias]       = useState('');
  const [notesPlaceholder, setNotesPlaceholder] = useState('Aclaraciones, alergias...');
  const [paymentMethod, setPaymentMethod]       = useState('');
  const [client, setClient]                     = useState(() => {
    try {
      const saved = localStorage.getItem('janz_client_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { name: parsed.name || '', whatsapp: parsed.whatsapp || '', address: parsed.address || '', floor: parsed.floor || '', references: parsed.references || '', notes: '' };
      }
    } catch {}
    return { name: '', whatsapp: '', address: '', floor: '', references: '', notes: '' };
  });
  const [scheduledFor, setScheduledFor]         = useState('asap');
  const [hourlyDiscount, setHourlyDiscount]     = useState(null);
  const [prodeEnabled, setProdeEnabled]         = useState(false);
  const [clientId, setClientId]                 = useState(null);
  const [schedule, setSchedule]                 = useState({ openHour: 19, closeHour: 23 });
  const [currentTime, setCurrentTime]           = useState('');
  const [inDiscountWindow, setInDiscountWindow] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    API.get('/public/menu').then(r => {
      setMenu(r.data.menu || {}); setOpen(r.data.open);
      setAvailableAdditionals(r.data.additionals || []); setZones(r.data.zones || []);
      if (r.data.limits) setLimits(r.data.limits);
      if (r.data.businessWhatsapp) setBusinessWhatsapp(r.data.businessWhatsapp);
    }).catch(() => setSystemDown(true)).finally(() => setLoading(false));
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('clientId');
    if (cid) setClientId(cid);
    API.get('/prode/config').then(r => setProdeEnabled(r.data?.enabled || false)).catch(() => {});
    API.get('/config/public').then(r => {
      setTransferAlias(r.data.transferAlias || '');
      if (r.data.notesPlaceholder) setNotesPlaceholder(r.data.notesPlaceholder);
      if (r.data.hourlyDiscount?.enabled) setHourlyDiscount(r.data.hourlyDiscount);
      if (r.data.schedule) setSchedule(r.data.schedule);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      const ar = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const timeStr = `${String(ar.getHours()).padStart(2,'0')}:${String(ar.getMinutes()).padStart(2,'0')}`;
      setCurrentTime(timeStr);
      if (hourlyDiscount?.enabled && hourlyDiscount.fromHour && hourlyDiscount.toHour)
        setInDiscountWindow(timeStr >= hourlyDiscount.fromHour && timeStr <= hourlyDiscount.toHour);
    };
    tick(); const id = setInterval(tick, 10000); return () => clearInterval(id);
  }, [hourlyDiscount]);

  useEffect(() => {
    if (step !== 'tracking' || !orderResult?.orderNumber) return;
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(apiUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('track_order', orderResult.orderNumber);
    socket.on('order_status', ({ status }) => {
      setOrderStatus(status);
      if (status === 'delivered') toast.success('🎉 ¡Tu pedido fue entregado!');
      else if (status === 'ready') toast.success('🛵 Tu pedido está en camino');
    });
    return () => socket.disconnect();
  }, [step, orderResult?.orderNumber]);

  // ── Cálculos de totales ────────────────────────────────────────────────────
  const subtotalBruto = cart.reduce((s, i) => s + itemTotal(i), 0);

  // Descuento: se aplica sobre el subtotal bruto (sin delivery)
  const activeDiscountPercent = couponStatus?.valid
    ? couponStatus.discountPercent
    : (inDiscountWindow && hourlyDiscount?.enabled ? hourlyDiscount.discountPercent : 0);
  const discount = activeDiscountPercent > 0 ? Math.round(subtotalBruto * activeDiscountPercent / 100) : 0;

  // Total de productos ya con descuento aplicado
  const subtotalConDescuento = subtotalBruto - discount;

  // ── Costo de delivery ──────────────────────────────────────────────────────
  // IMPORTANTE: el umbral de envío gratis (freeFrom) se compara contra el precio
  // FINAL de los productos (ya descontado con cupón o descuento horario).
  // Esto evita el bug donde un cliente con cupón recibía envío gratis
  // aunque el total final fuera menor al mínimo, o pagaba envío aunque
  // el precio descontado superara el umbral.
  useEffect(() => {
    if (!selectedZone || deliveryType !== 'delivery') { setDeliveryCost(0); return; }
    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) return;

    // Recalcular usando subtotal YA descontado
    const subtotal = cart.reduce((s, i) => s + itemTotal(i), 0);
    const disc = activeDiscountPercent > 0 ? Math.round(subtotal * activeDiscountPercent / 100) : 0;
    const finalSubtotal = subtotal - disc;

    const isFree = zone.freeFrom > 0 && finalSubtotal >= zone.freeFrom;
    setDeliveryCost(isFree ? 0 : zone.cost || 0);
  // eslint-disable-next-line
  }, [selectedZone, cart, deliveryType, zones, couponStatus, inDiscountWindow, hourlyDiscount]);

  const totalFinal = subtotalConDescuento + (deliveryType === 'delivery' ? deliveryCost : 0);

  // ── Carrito ────────────────────────────────────────────────────────────────
  const handleAddToCart = (product) => {
    const existing = cart.find(i => i.product === product._id);
    if (existing) setCart(c => c.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i));
    else if (availableAdditionals.length > 0) { setAdditionalsModal(product); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else addProductToCart(product, []);
  };
  const addProductToCart = (product, additionals) =>
    setCart(c => [...c, { product: product._id, productName: product.name, variant: product.variant, productType: product.productType || 'burger', quantity: 1, unitPrice: product.salePrice, additionals }]);
  const handleAdditionalsConfirm = (additionals) => { addProductToCart(additionalsModal, additionals); setAdditionalsModal(null); };
  const removeFromCart = (productId) => {
    const existing = cart.find(i => i.product === productId);
    if (existing?.quantity === 1) setCart(c => c.filter(i => i.product !== productId));
    else setCart(c => c.map(i => i.product === productId ? { ...i, quantity: i.quantity - 1 } : i));
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!client.whatsapp) { setCouponStatus({ valid: false, message: 'Ingresá tu WhatsApp primero' }); return; }
    setValidatingCoupon(true);
    try {
      const res = await API.post('/coupons/validate', { code: couponCode.trim(), whatsapp: client.whatsapp });
      setCouponStatus({ valid: true, discountPercent: res.data.discountPercent, message: res.data.message });
    } catch (e) { setCouponStatus({ valid: false, message: e.response?.data?.message || 'Cupón inválido' }); }
    finally { setValidatingCoupon(false); }
  };

  const handleSubmit = async () => {
    if (!client.name || !client.whatsapp) { toast.error('Nombre y WhatsApp son obligatorios'); return; }
    if (!paymentMethod) { toast.error('Seleccioná un método de pago'); return; }
    if (deliveryType === 'delivery' && zones.length > 0 && !selectedZone) { toast.error('Seleccioná tu zona de delivery'); return; }
    if (scheduledFor !== 'asap') {
      const openStr  = `${String(schedule.openHour  || 19).padStart(2,'0')}:00`;
      const closeStr = `${String(schedule.closeHour || 23).padStart(2,'0')}:00`;
      if (scheduledFor < openStr || scheduledFor > closeStr) { toast.error(`Horario fuera del comercial (${openStr} a ${closeStr}hs).`); return; }
    }
    setSubmitting(true);
    try {
      const res = await API.post('/public/order', {
        client, items: cart.map(i => ({
          product: i.product, quantity: i.quantity,
          additionals: (i.additionals || []).map(a => ({ additional: a.additional, quantity: a.quantity }))
        })),
        deliveryType, paymentMethod, notes: client.notes, zone: selectedZone,
        scheduledFor: scheduledFor === 'asap' ? null : scheduledFor, isScheduled: scheduledFor !== 'asap',
        deliveryAddress: deliveryType === 'delivery' ? [client.address, client.floor, client.references].filter(Boolean).join(' — ') : '',
        couponCode: couponStatus?.valid ? couponCode.trim() : null
      });
      try { localStorage.setItem('janz_client_data', JSON.stringify({ name: client.name, whatsapp: client.whatsapp, address: client.address, floor: client.floor, references: client.references })); } catch {}
      setOrderResult(res.data); setOrderStatus('pending'); setStep('tracking');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al enviar pedido'); }
    finally { setSubmitting(false); }
  };

  const closeWelcome = () => {
    try { localStorage.setItem('janz_visited', '1'); } catch {}
    setShowWelcome(false);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  if (systemDown) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔧</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E8B84B', marginBottom: 12 }}>Sistema temporalmente fuera de servicio</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.7 }}>Por favor realizá tu pedido por WhatsApp.</div>
        {businessWhatsapp && <a href={`https://wa.me/54${businessWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#25D366', color: 'white', padding: '14px 24px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>💬 Pedido por WhatsApp</a>}
      </div>
    </div>
  );

  if (limits.enabled && limits.limitReached) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎯</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E8B84B', marginBottom: 12 }}>¡Cupo completo por hoy!</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: 1.7 }}>Alcanzamos el límite de {limits.dailyMax} pedidos. Volvé mañana 🍔</div>
      </div>
    </div>
  );

  if (step === 'tracking') return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <img src={logoJanz} alt="Janz" style={{ height: 48, objectFit: 'contain', marginBottom: 20, opacity: 0.9 }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.5px', marginBottom: 12 }}>¡Pedido recibido!</div>
          <div style={{ color: '#E8B84B', fontSize: '1.8rem', fontWeight: 900, background: 'rgba(232,184,75,0.08)', borderRadius: 14, padding: '10px 28px', marginBottom: 6, border: '1px solid rgba(232,184,75,0.2)', display: 'inline-block', letterSpacing: 2 }}>
            {orderResult?.publicCode || orderResult?.orderNumber}
          </div>
          <div style={{ color: '#444', fontSize: '0.8rem', marginTop: 6 }}>Te avisamos por WhatsApp en cada paso</div>
        </div>
        <TrackingBar status={orderStatus || 'pending'} />
        <div style={{ background: '#0f0f0f', borderRadius: 14, padding: 20, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#E8B84B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumen</div>
          {orderResult?.items?.length > 0 && (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {orderResult.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span style={{ color: '#666' }}>×{item.quantity} {item.productName} {item.variant}</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{fmt(item.subtotal || item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}
          {orderResult?.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span style={{ color: '#22c55e' }}>🎉 Descuento {orderResult.couponCode ? `(${orderResult.couponCode})` : ''}</span><span style={{ color: '#22c55e', fontWeight: 700 }}>-{fmt(orderResult.discountAmount)}</span></div>}
          {orderResult?.deliveryCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span style={{ color: '#555' }}>🛵 Delivery</span><span style={{ color: '#888' }}>{fmt(orderResult.deliveryCost)}</span></div>}
          {orderResult?.deliveryCost === 0 && orderResult?.deliveryType === 'delivery' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
              <span style={{ color: '#22c55e' }}>🛵 Delivery</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>¡Gratis! 🎉</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 8 }}>
            <span style={{ fontWeight: 700, color: '#E8B84B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total a pagar</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{fmt(orderResult?.total)}</span>
          </div>
          {paymentMethod === 'efectivo' && <div style={{ color: '#444', fontSize: '0.78rem', marginTop: 10 }}>💵 Tené listo el efectivo</div>}
          {paymentMethod === 'transferencia' && <div style={{ color: '#444', fontSize: '0.78rem', marginTop: 10 }}>🏦 Enviá el comprobante por WhatsApp{transferAlias && <span style={{ color: '#E8B84B', fontWeight: 700 }}> · Alias: {transferAlias}</span>}</div>}
        </div>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.75rem', color: '#ef4444' }}>
          ⚠️ Si necesitás cancelar, contactanos por WhatsApp.
        </div>
        <button onClick={() => { setCart([]); setStep('menu'); setOrderResult(null); setOrderStatus(null); setPaymentMethod(''); setCouponCode(''); setCouponStatus(null); setSelectedZone(''); }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: '#555', border: '1px solid rgba(255,255,255,0.07)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
          Hacer otro pedido
        </button>
      </div>
    </div>
  );

  // ── Helpers para la sección de zonas ──────────────────────────────────────
  // Obtiene el costo de delivery para una zona dado el precio final (ya descontado)
  const getZoneCost = (zone) => {
    const isFree = zone.freeFrom > 0 && subtotalConDescuento >= zone.freeFrom;
    return isFree ? 0 : zone.cost || 0;
  };

  // Cuánto le falta al cliente para envío gratis en una zona dada
  const amountLeftForFree = (zone) => {
    if (!zone.freeFrom || zone.freeFrom === 0) return null;
    const diff = zone.freeFrom - subtotalConDescuento;
    return diff > 0 ? diff : null;
  };

  return (
    <>
    {showWelcome && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍔</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#E8B84B', marginBottom: 4 }}>Bienvenido a Janz Burgers!</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Así funciona el sistema de pedidos</div>
          </div>
          {[
            { icon: '🍔', title: 'Elegí tus hamburguesas', desc: 'Navegá el menú y tocá "Agregar". Podés elegir Simple, Doble o Triple.' },
            { icon: '➕', title: 'Sumá adicionales', desc: 'Agregá extras como panceta, huevo, queso y más.' },
            { icon: '🛒', title: 'Revisá tu pedido', desc: 'Tocá el carrito para ver el resumen, elegir zona y método de pago.' },
            { icon: '📱', title: 'Confirmá y listo', desc: 'Completá tus datos y enviá. Te avisamos por WhatsApp en cada paso.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>{s.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
          <button onClick={closeWelcome} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #c49b35, #E8B84B)', color: '#000', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>
            Empezar a pedir!
          </button>
        </div>
      </div>
    )}
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <style>{`
        .janz-hero { position: relative; height: 300px; overflow: hidden; }
        .janz-hero-content { position: absolute; bottom: 24px; left: 20px; right: 20px; }
        .janz-hero-prode { display: none; }
        .janz-prode-mobile { display: block; }
        .janz-menu-wrap { max-width: 560px; width: 100%; margin: 0 auto; padding: 16px 16px 120px; }
        .janz-desktop-layout { display: block; }
        .janz-sidebar { display: none; }
        .janz-cart-float { display: block; }
        .janz-product-card { flex-direction: column; height: auto; }
        .janz-product-img-wrap { width: 100%; height: 180px; flex-shrink: 0; overflow: hidden; position: relative; }
        .janz-product-card { display: flex; flex-direction: column; }
        @media (min-width: 900px) {
          .janz-hero { height: 360px; }
          .janz-hero-content { bottom: 40px; left: 48px; right: 48px; display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
          .janz-hero-left { flex: 1; }
          .janz-hero-prode { display: block; width: 300px; flex-shrink: 0; }
          .janz-prode-mobile { display: none; }
          .janz-menu-wrap { max-width: 1100px; padding: 24px 24px 60px; }
          .janz-desktop-layout { display: grid; grid-template-columns: 1fr 320px; gap: 0; }
          .janz-menu-col { padding-right: 24px; }
          .janz-sidebar { display: block; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 24px; }
          .janz-cart-float { display: none; }
          .janz-product-card { flex-direction: row; min-height: 130px; align-items: stretch; }
          .janz-product-img-wrap { width: 140px; align-self: stretch; flex-shrink: 0; height: auto; position: relative; }
          .janz-product-img-wrap img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        }
      `}</style>

      {/* Hero */}
      <div className="janz-hero">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroBurger})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.55) 55%, #080808 100%)' }} />
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <img src={logoJanz} alt="Janz" style={{ height: 64, objectFit: 'contain', opacity: 0.95 }} />
        </div>
        <div className="janz-hero-content">
          <div className="janz-hero-left">
            <div style={{ fontSize: 'clamp(2rem, 7vw, 3.8rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-2px', color: 'white' }}>
              PEDÍ. DISFRUTÁ.<br /><span style={{ color: '#E8B84B' }}>REPETÍ.</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', lineHeight: 1.6, marginTop: 10, marginBottom: 10, maxWidth: 420 }}>
              Emprendimos y crecimos para romper el molde. <br /> Pan artesanal sin conservantes hecho por nosotros, ingredientes de calidad para un excelente producto y un sabor con identidad.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href="https://www.instagram.com/janz.burgers" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.78rem' }}>
                <Instagram size={12} /> @janz.burgers
              </a>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '0.75rem', color: open ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{open ? '● Abierto' : '● Cerrado'}</span>
            </div>
          </div>
          <div className="janz-hero-prode">
            {prodeEnabled && step === 'menu' && (
              <div style={{ background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(232,184,75,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E8B84B' }}>Prode Mundial 2026</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Pronosticá y ganá premios</div>
                  </div>
                </div>
                <a href={`/prode-publico${clientId ? `?clientId=${clientId}` : ''}`} style={{ background: '#E8B84B', color: '#000', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>Jugar →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {prodeEnabled && step === 'menu' && (
        <div className="janz-prode-mobile" style={{ padding: '12px 16px 0' }}>
          <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(232,184,75,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏆</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8B84B', lineHeight: 1 }}>Prode Mundial 2026</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Pronosticá y ganá premios</div>
              </div>
            </div>
            <a href={`/prode-publico${clientId ? `?clientId=${clientId}` : ''}`} style={{ background: '#E8B84B', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Jugar →</a>
          </div>
        </div>
      )}

      {additionalsModal && (
        <AdditionalsModal
          product={additionalsModal}
          availableAdditionals={availableAdditionals}
          onConfirm={handleAdditionalsConfirm}
          onClose={() => setAdditionalsModal(null)}
        />
      )}

      {step === 'form' ? (
        <div style={{ maxWidth: 520, width: '100%', margin: '0 auto', padding: '20px 16px 100px' }}>
          <button onClick={() => setStep('menu')} style={{ background: 'none', border: 'none', color: '#E8B84B', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', marginBottom: 20, padding: 0 }}>
            ← Volver al menú
          </button>
          <div style={{ background: '#0f0f0f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 24 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: 20, letterSpacing: '-0.5px' }}>Tus datos</div>

            {hourlyDiscount?.enabled && (
              <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 12, background: inDiscountWindow ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${inDiscountWindow ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {inDiscountWindow ? (<><div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>🎉 ¡Estás en horario de descuento!</div><div style={{ fontSize: '0.76rem', color: '#86efac', marginTop: 3 }}>{hourlyDiscount.discountPercent}% off aplicado</div></>) : (<><div style={{ fontWeight: 600, color: '#aaa', fontSize: '0.85rem' }}>⏰ {hourlyDiscount.discountPercent}% off entre {hourlyDiscount.fromHour} y {hourlyDiscount.toHour}hs</div><div style={{ fontSize: '0.73rem', color: '#444', marginTop: 3 }}>Pedí en ese horario para obtenerlo</div></>)}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', color: inDiscountWindow ? '#22c55e' : '#333', fontWeight: 700, marginLeft: 12 }}>{currentTime}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Tipo de entrega *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 'delivery', l: '🛵 Delivery' }, { v: 'takeaway', l: '🥡 Take Away' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setDeliveryType(v)} style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontSize: '0.88rem', transition: 'all 0.2s', background: deliveryType === v ? '#E8B84B' : 'rgba(255,255,255,0.05)', color: deliveryType === v ? '#000' : '#555' }}>{l}</button>
                ))}
              </div>
            </div>

            {deliveryType === 'delivery' && zones.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Zona de delivery *</div>
                {zones.map(zone => {
                  const cost   = getZoneCost(zone);
                  const left   = amountLeftForFree(zone);
                  const isFree = cost === 0 && zone.freeFrom > 0;
                  return (
                    <div key={zone.id}>
                      <button onClick={() => setSelectedZone(zone.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: left ? 4 : 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s', background: selectedZone === zone.id ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)', color: selectedZone === zone.id ? '#E8B84B' : '#666', outline: selectedZone === zone.id ? '1.5px solid rgba(232,184,75,0.4)' : 'none' }}>
                        <span>📍 {zone.name}</span>
                        <span style={{ fontSize: '0.82rem', color: cost === 0 ? '#22c55e' : '#555' }}>
                          {cost === 0 ? (isFree ? '¡Gratis! 🎉' : 'Gratis') : fmt(cost)}
                        </span>
                      </button>
                      {/* Banner "te falta $X para envío gratis" */}
                      {left !== null && selectedZone === zone.id && (
                        <div style={{ marginBottom: 8, padding: '7px 14px', borderRadius: 8, background: 'rgba(232,184,75,0.05)', border: '1px solid rgba(232,184,75,0.15)', fontSize: '0.76rem', color: '#9a7d30', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🛵</span>
                          <span>Te faltan <strong style={{ color: '#E8B84B' }}>{fmt(left)}</strong> para envío gratis en esta zona</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginBottom: 14 }}><label style={labelStyle}>Nombre y apellido *</label><input value={client.name} onChange={e => setClient(c => ({ ...c, name: e.target.value }))} placeholder="Tu nombre completo" style={inputStyle} /></div>
            <div style={{ marginBottom: 14 }}><label style={labelStyle}>WhatsApp *</label><input value={client.whatsapp} onChange={e => setClient(c => ({ ...c, whatsapp: e.target.value }))} placeholder="Ej: 1123456789" type="tel" style={inputStyle} /></div>

            {deliveryType === 'delivery' && (
              <>
                <div style={{ marginBottom: 14 }}><label style={labelStyle}>Dirección *</label><input value={client.address} onChange={e => setClient(c => ({ ...c, address: e.target.value }))} placeholder="Calle y número" style={inputStyle} /></div>
                <div style={{ marginBottom: 14 }}><label style={labelStyle}>Piso / Depto</label><input value={client.floor} onChange={e => setClient(c => ({ ...c, floor: e.target.value }))} placeholder="Ej: 3° B" style={inputStyle} /></div>
                <div style={{ marginBottom: 14 }}><label style={labelStyle}>Referencias</label><input value={client.references} onChange={e => setClient(c => ({ ...c, references: e.target.value }))} placeholder="Portón verde, timbre 2B..." style={inputStyle} /></div>
              </>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Método de pago *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ value: 'efectivo', label: '💵 Efectivo' }, { value: 'transferencia', label: '🏦 Transferencia' }].map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)} style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', border: 'none', transition: 'all 0.2s', background: paymentMethod === m.value ? '#E8B84B' : 'rgba(255,255,255,0.05)', color: paymentMethod === m.value ? '#000' : '#555' }}>{m.label}</button>
                ))}
              </div>
              {paymentMethod === 'transferencia' && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(232,184,75,0.06)', borderRadius: 10, fontSize: '0.8rem', color: '#666', border: '1px solid rgba(232,184,75,0.12)' }}>
                  📲 Enviá el comprobante por WhatsApp.{transferAlias && <span style={{ color: '#E8B84B', fontWeight: 700, display: 'block', marginTop: 4 }}>Alias: {transferAlias}</span>}
                </div>
              )}
            </div>

            {(() => {
              const openStr  = `${String(schedule.openHour  || 19).padStart(2,'0')}:00`;
              const closeStr = `${String(schedule.closeHour || 23).padStart(2,'0')}:00`;
              const isOutsideHours = scheduledFor !== 'asap' && (scheduledFor < openStr || scheduledFor > closeStr);
              return (
                <div style={{ marginBottom: 18 }}>
                  <div style={labelStyle}>⏰ ¿Cuándo lo querés?</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={() => setScheduledFor('asap')} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s', background: scheduledFor === 'asap' ? '#E8B84B' : 'rgba(255,255,255,0.05)', color: scheduledFor === 'asap' ? '#000' : '#555' }}>🚀 Lo antes posible</button>
                    <button onClick={() => setScheduledFor(scheduledFor === 'asap' ? openStr : scheduledFor)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s', background: scheduledFor !== 'asap' ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.05)', color: scheduledFor !== 'asap' ? '#E8B84B' : '#555', outline: scheduledFor !== 'asap' ? '1.5px solid rgba(232,184,75,0.3)' : 'none' }}>🕐 Programar</button>
                  </div>
                  {scheduledFor !== 'asap' && (
                    <div>
                      <input type="time" value={scheduledFor} min={openStr} max={closeStr} onChange={e => setScheduledFor(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, borderColor: isOutsideHours ? '#ef4444' : 'rgba(255,255,255,0.1)' }} />
                      {isOutsideHours
                        ? <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#fca5a5' }}>⚠️ Fuera del horario comercial ({openStr} a {closeStr}hs)</div>
                        : <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: '0.76rem', color: '#444' }}>✓ Programado para las {scheduledFor}hs</div>
                      }
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginBottom: 18 }}><label style={labelStyle}>Notas del pedido</label><textarea value={client.notes} onChange={e => setClient(c => ({ ...c, notes: e.target.value }))} placeholder={notesPlaceholder} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} /></div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>🎟️ Cupón de descuento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }} placeholder="Ej: JANZ10" style={{ ...inputStyle, border: `1px solid ${couponStatus?.valid ? 'rgba(34,197,94,0.4)' : couponStatus?.valid === false ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}` }} />
                <button onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()} style={{ background: 'rgba(232,184,75,0.1)', color: '#E8B84B', border: '1px solid rgba(232,184,75,0.3)', padding: '10px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {validatingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
              {couponStatus && <div style={{ marginTop: 6, fontSize: '0.8rem', color: couponStatus.valid ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{couponStatus.valid ? '✅' : '❌'} {couponStatus.message}</div>}
            </div>

            {/* Resumen del pedido */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: '#E8B84B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumen del pedido</div>
              {cart.map((i, idx) => (
                <div key={idx} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#777' }}>{i.productName} {i.variant} ×{i.quantity}</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{fmt(i.unitPrice * i.quantity)}</span>
                  </div>
                  {(i.additionals || []).map((a, ai) => (
                    <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#444', paddingLeft: 12, marginTop: 2 }}>
                      <span>+ {a.name} ×{a.quantity}</span><span>+ {fmt(a.unitPrice * a.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 10, paddingTop: 10 }}>
                {/* Subtotal solo si hay descuento o delivery */}
                {(discount > 0 || deliveryCost > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4, color: '#444' }}>
                    <span>Subtotal</span><span>{fmt(subtotalBruto)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4, color: '#22c55e' }}>
                    <span>{couponStatus?.valid ? `🎟️ Cupón ${couponStatus.discountPercent}%` : `🎉 Descuento ${activeDiscountPercent}%`}</span>
                    <span>- {fmt(discount)}</span>
                  </div>
                )}
                {/* Delivery — siempre mostrar cuando es delivery */}
                {deliveryType === 'delivery' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ color: deliveryCost === 0 ? '#22c55e' : '#444' }}>🛵 Delivery</span>
                    <span style={{ color: deliveryCost === 0 ? '#22c55e' : '#444', fontWeight: deliveryCost === 0 ? 700 : 400 }}>
                      {deliveryCost === 0 ? '¡Gratis! 🎉' : fmt(deliveryCost)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontWeight: 700, color: '#E8B84B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span>
                  <span style={{ color: 'white', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.5px' }}>{fmt(totalFinal)}</span>
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', background: submitting ? '#222' : '#E8B84B', color: submitting ? '#555' : '#000', border: 'none', padding: '15px', borderRadius: 12, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '1rem', letterSpacing: '0.02em', transition: 'all 0.2s' }}>
              {submitting ? 'Enviando...' : `Confirmar pedido — ${fmt(totalFinal)}`}
            </button>
          </div>
        </div>

      ) : (
        <div className="janz-menu-wrap">
          {!open && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '13px 16px', marginBottom: 16, color: '#ef4444', textAlign: 'center', fontWeight: 600, fontSize: '0.88rem' }}>
              🔴 En este momento no estamos tomando pedidos
            </div>
          )}

          <div className="janz-desktop-layout">
            {/* Columna menú */}
            <div className="janz-menu-col">
              {Object.entries(menu).map(([name, variants]) => {
                const order = { Simple: 0, Doble: 1, Triple: 2 };
                const sortedVariants = [...variants].sort((a, b) => (order[a.variant] ?? 99) - (order[b.variant] ?? 99));
                const description = sortedVariants[0]?.description;
                const image = variants.find(v => v.image)?.image;
                return (
                  <div key={name} className="janz-product-card" style={{ marginBottom: 14, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', display: 'flex' }}>
                    <div className="janz-product-img-wrap">
                      {image ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', minHeight: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍔</div>}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ padding: '14px 16px 6px' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#E8B84B', lineHeight: 1, letterSpacing: '-0.3px' }}>{name}</div>
                        {description && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 600, marginTop: 5, lineHeight: 1.5 }}>{description}</div>}
                      </div>
                      <div style={{ padding: '4px 0 8px' }}>
                        {sortedVariants.map((p, idx) => {
                          const inCart = cart.find(i => i.product === p._id);
                          const unavailable = !p.available;
                          return (
                            <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: unavailable ? 0.4 : 1 }}>
                              <div>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{p.variant}{unavailable && <span style={{ color: '#ef4444', fontSize: '0.65rem', marginLeft: 8, fontWeight: 500 }}>NO DISPONIBLE</span>}</div>
                                <div style={{ color: '#E8B84B', fontWeight: 800, fontSize: '0.95rem', marginTop: 2 }}>{fmt(p.salePrice)}</div>
                              </div>
                              {!unavailable && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {inCart ? (
                                    <>
                                      <button onClick={() => removeFromCart(p._id)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button>
                                      <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center', color: 'white', fontSize: '0.95rem' }}>{inCart.quantity}</span>
                                      <button onClick={() => handleAddToCart(p)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8B84B', border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 800 }}>+</button>
                                    </>
                                  ) : (
                                    <button onClick={() => handleAddToCart(p)} style={{ background: '#E8B84B', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 9, fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Agregar</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {availableAdditionals.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Adicionales</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableAdditionals.map(add => (
                      <div key={add._id} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><span style={{ color: '#888', fontWeight: 600, fontSize: '0.88rem' }}>{add.emoji} {add.name}</span>{add.description && <span style={{ color: '#2a2a2a', fontSize: '0.75rem', marginLeft: 8 }}>{add.description}</span>}</div>
                        <span style={{ color: '#E8B84B', fontWeight: 700, fontSize: '0.9rem' }}>{fmt(add.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '20px 0 8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <img src={logoJanz} alt="Janz" style={{ height: 28, opacity: 0.15, display: 'block', margin: '0 auto 6px' }} />
                <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Janz Burgers · Pedí, Mordé, Repetí.</div>
              </div>
            </div>

            {/* Sidebar carrito — solo desktop */}
            <div className="janz-sidebar">
              <div style={{ position: 'sticky', top: 20 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Tu pedido</div>
                <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 }}>
                  {cart.length === 0 ? (
                    <div style={{ color: '#2a2a2a', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Agregá productos para empezar</div>
                  ) : (
                    <>
                      {cart.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{item.productName} {item.variant}</div>
                            <div style={{ fontSize: '0.75rem', color: '#444', marginTop: 2 }}>×{item.quantity}</div>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{fmt(itemTotal(item))}</div>
                        </div>
                      ))}
                      {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#22c55e', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span>Descuento {activeDiscountPercent}%</span>
                          <span>- {fmt(discount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
                        <span style={{ fontWeight: 700, color: '#E8B84B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{fmt(subtotalConDescuento)}</span>
                      </div>
                      <button onClick={() => setStep('form')} style={{ width: '100%', background: '#E8B84B', color: '#000', border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', marginTop: 14 }}>
                        Confirmar pedido →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante carrito — solo móvil */}
      {cart.length > 0 && step === 'menu' && (
        <div className="janz-cart-float" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <button onClick={() => setStep('form')} style={{ background: '#E8B84B', color: '#000', border: 'none', padding: '14px 28px', borderRadius: 100, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 8px 32px rgba(232,184,75,0.3)', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
            🛒 Ver pedido ({cart.reduce((s, i) => s + i.quantity, 0)}) — {fmt(subtotalConDescuento)}
          </button>
        </div>
      )}
    </div>
    </>
  );
}
