import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Instagram } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';
import toast from 'react-hot-toast';
import logoJanz from '../assets/logo-janz.png';
import heroBurger from '../assets/hero-burger.png';

const GOLD = '#E8B84B';
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
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  fontFamily: 'inherit'
};

function itemTotal(item) {
  const base = item.unitPrice * item.quantity;
  const extras = (item.additionals || []).reduce((s, a) => s + a.unitPrice * (a.quantity || 1), 0);
  return base + extras;
}

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
        <div style={{ position: 'absolute', top: 17, left: 20, height: 2, background: GOLD, zIndex: 1, width: idx <= 0 ? '0%' : `${(idx / (STATUS_STEPS.length - 1)) * 90}%`, transition: 'width 0.7s ease' }} />
        {STATUS_STEPS.map((step, i) => {
          const done = i <= idx;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2, flex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: done ? GOLD : '#111', border: `2px solid ${done ? GOLD : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.4s ease' }}>
                {done ? step.icon : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'block' }} />}
              </div>
              <span style={{ fontSize: '0.58rem', color: done ? GOLD : 'rgba(255,255,255,0.2)', fontWeight: done ? 700 : 400, textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdditionalsModal({ product, availableAdditionals, onConfirm, onClose }) {
  const [selected, setSelected] = useState({});
  const [collapsed, setCollapsed] = useState({});

  const toggle = (add) => setSelected(prev => prev[add._id] ? (({ [add._id]: _, ...rest }) => rest)(prev) : { ...prev, [add._id]: 1 });
  const changeQty = (addId, delta) => setSelected(prev => {
    const newQty = (prev[addId] || 1) + delta;
    if (newQty <= 0) return (({ [addId]: _, ...rest }) => rest)(prev);
    return { ...prev, [addId]: newQty };
  });
  const toggleSalsa = (add) => setSelected(prev => prev[add._id] ? (({ [add._id]: _, ...rest }) => rest)(prev) : { ...prev, [add._id]: 1 });
  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  const extraTotal = availableAdditionals.reduce((s, a) => selected[a._id] ? s + a.price * selected[a._id] : s, 0);

  const handleConfirm = () => {
    const additionals = availableAdditionals.filter(a => selected[a._id]).map(a => ({ additional: a._id, name: a.name, unitPrice: a.price, quantity: selected[a._id] }));
    onConfirm(additionals);
  };

  const resolveAppliesTo = (a) => {
    if (a.appliesTo) return a.appliesTo;
    if (a.category === 'hamburguesa' || a.category === 'adicional') return 'burger';
    if (a.category === 'papas') return 'papas';
    return 'todos';
  };

  const pType = product.productType || 'burger';
  const burgerAdds = pType === 'burger' ? availableAdditionals.filter(a => (a.category === 'hamburguesa' || a.category === 'adicional') && ['burger', 'todos'].includes(resolveAppliesTo(a))) : [];
  const papasAdds = (pType === 'burger' || pType === 'papas') ? availableAdditionals.filter(a => a.category === 'papas' && ['papas', 'todos'].includes(resolveAppliesTo(a))) : availableAdditionals.filter(a => a.category === 'papas');
  const salsaAdds = pType === 'papas' ? [] : availableAdditionals.filter(a => a.category === 'salsa');

  const AdditionalItem = ({ add }) => {
    const qty = selected[add._id] || 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: qty > 0 ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${qty > 0 ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, transition: 'all 0.2s' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{add.emoji} {add.name}</div>
          {add.description && <div style={{ color: '#555', fontSize: '0.73rem', marginTop: 2 }}>{add.description}</div>}
          <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.88rem', marginTop: 4 }}>{fmt(add.price)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {qty > 0 ? (<><button onClick={() => changeQty(add._id, -1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button><span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center', color: 'white' }}>{qty}</span><button onClick={() => changeQty(add._id, 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}>+</button></>) : (<button onClick={() => toggle(add)} style={{ background: 'rgba(232,184,75,0.1)', color: GOLD, border: '1px solid rgba(232,184,75,0.3)', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>+ Agregar</button>)}
        </div>
      </div>
    );
  };

  const SalsaItem = ({ add }) => {
    const active = !!selected[add._id];
    return (
      <button onClick={() => toggleSalsa(add)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: active ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{add.emoji} {add.name}</div>
          {add.description && <div style={{ color: '#555', fontSize: '0.73rem', marginTop: 2 }}>{add.description}</div>}
          {add.price > 0 && <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.88rem', marginTop: 4 }}>{fmt(add.price)}</div>}
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${active ? GOLD : 'rgba(255,255,255,0.15)'}`, background: active ? GOLD : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          {active && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
        </div>
      </button>
    );
  };

  const Group = ({ groupKey, emoji, label, children, count }) => {
    const isCollapsed = collapsed[groupKey];
    return (
      <div style={{ marginBottom: 4 }}>
        <button onClick={() => toggleCollapse(groupKey)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', marginBottom: isCollapsed ? 0 : 6 }}>
          <span style={{ fontSize: '0.9rem' }}>{emoji}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
          {count > 0 && <span style={{ background: GOLD, color: '#000', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px' }}>{count}</span>}
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
          <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 4 }}>{isCollapsed ? '▸' : '▾'}</span>
        </button>
        {!isCollapsed && children}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0f0f0f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 24, maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' }}>{product.name} <span style={{ color: GOLD }}>{product.variant}</span></div>
        <div style={{ color: '#444', fontSize: '0.82rem', marginBottom: 20 }}>Personalizá tu pedido</div>
        {burgerAdds.length > 0 && <Group groupKey="burger" emoji="🍔" label="Para la hamburguesa" count={burgerAdds.filter(a => selected[a._id]).length}>{burgerAdds.map(add => <AdditionalItem key={add._id} add={add} />)}</Group>}
        {papasAdds.length > 0 && <Group groupKey="papas" emoji="🍟" label="Para las papas" count={papasAdds.filter(a => selected[a._id]).length}>{papasAdds.map(add => <AdditionalItem key={add._id} add={add} />)}</Group>}
        {salsaAdds.length > 0 && <Group groupKey="salsas" emoji="🫙" label="Salsas" count={salsaAdds.filter(a => selected[a._id]).length}>{salsaAdds.map(add => <SalsaItem key={add._id} add={add} />)}</Group>}
        {burgerAdds.length === 0 && papasAdds.length === 0 && salsaAdds.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: '#444', fontSize: '0.85rem' }}>No hay adicionales disponibles.</div>}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleConfirm} style={{ flex: 2, background: GOLD, color: '#000', border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>Confirmar {extraTotal > 0 ? `(+ ${fmt(extraTotal)})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

function StepperBar({ currentStep, onBack }) {
  const steps = [{ key: 'entrega', label: 'Entrega', num: 1 }, { key: 'datos', label: 'Datos', num: 2 }, { key: 'pago', label: 'Pago', num: 3 }];
  const currentIdx = steps.findIndex(s => s.key === currentStep);
  return (
    <div style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: 0, flexShrink: 0 }}>← Volver</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', maxWidth: 320, margin: '0 auto' }}>
        {steps.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? GOLD : active ? GOLD : 'rgba(255,255,255,0.08)', border: `2px solid ${done || active ? GOLD : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: done || active ? '#000' : '#555', transition: 'all 0.3s' }}>
                  {done ? '✓' : step.num}
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: active ? 700 : 400, color: active ? GOLD : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < currentIdx ? GOLD : 'rgba(255,255,255,0.1)', margin: '0 6px', marginBottom: 16, transition: 'background 0.3s' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PublicOrder() {
  const [menu, setMenu]                                 = useState({});
  const [availableAdditionals, setAvailableAdditionals] = useState([]);
  const [zones, setZones]                               = useState([]);
  const [open, setOpen]                                 = useState(false);
  const [cart, setCart]                                 = useState([]);
  const [step, setStep]                                 = useState('menu');
  const [loading, setLoading]                           = useState(true);
  const [systemDown, setSystemDown]                     = useState(false);
  const [showWelcome, setShowWelcome]                   = useState(() => { try { return !localStorage.getItem('janz_visited'); } catch { return false; } });
  const [limits, setLimits]         = useState({ enabled: false, limitReached: false, dailyMax: 50, todayCount: 0 });
  const [businessWhatsapp, setBusinessWhatsapp]         = useState('1140495908');
  const [submitting, setSubmitting]                     = useState(false);
  const [orderResult, setOrderResult]                   = useState(null);
  const [orderStatus, setOrderStatus]                   = useState(null);
  const [additionalsModal, setAdditionalsModal]         = useState(null);
  const [deliveryType, setDeliveryType]                 = useState('delivery');
  const [selectedZone, setSelectedZone]                 = useState('');
  const [deliveryCost, setDeliveryCost]                 = useState(0);
  const [couponCode, setCouponCode]                     = useState('');
  const [couponStatus, setCouponStatus]                 = useState(null);
  const [validatingCoupon, setValidatingCoupon]         = useState(false);
  const [transferAlias, setTransferAlias]               = useState('');
  const [notesPlaceholder, setNotesPlaceholder]         = useState('Aclaraciones, alergias...');
  const [paymentMethod, setPaymentMethod]               = useState('');

  // ── Auth state ──────────────────────────────────────────────────────────────
  // 'phone' | 'verify-pin' | 'update' | 'returning' | 'new'
  const [authStep, setAuthStep]                         = useState(() => {
    try {
      const saved = localStorage.getItem('janz_client_data');
      if (saved) { const p = JSON.parse(saved); if (p.whatsapp) return 'returning'; }
    } catch {}
    return 'phone';
  });
  const [waInput, setWaInput]                           = useState('');
  const [waLooking, setWaLooking]                       = useState(false);
  const [pinInput, setPinInput]                         = useState('');
  const [pinSending, setPinSending]                     = useState(false);
  const [pinVerifying, setPinVerifying]                 = useState(false);
  const [pinCountdown, setPinCountdown]                 = useState(0);
  const pinTimerRef                                     = useRef(null);
  // Datos de migración (cliente existente sin nickname)
  const [updateForm, setUpdateForm]                     = useState({ nickname: '', birthDay: '', birthMonth: '', birthSkipped: false });

  const [client, setClient]                             = useState(() => {
    try {
      const saved = localStorage.getItem('janz_client_data');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          name: p.name || '', nickname: p.nickname || '', whatsapp: p.whatsapp || '',
          address: p.address || '', floor: p.floor || '', references: p.references || '',
          notes: '', birthDay: '', birthMonth: '', birthSkipped: false,
          useAltAddress: false
        };
      }
    } catch {}
    return { name: '', nickname: '', whatsapp: '', address: '', floor: '', references: '', notes: '', birthDay: '', birthMonth: '', birthSkipped: false, useAltAddress: false };
  });
  const [scheduledFor, setScheduledFor]                 = useState('asap');
  const [hourlyDiscount, setHourlyDiscount]             = useState(null);
  const [showConfirmModal, setShowConfirmModal]         = useState(false);
  const [submitSuccess, setSubmitSuccess]               = useState(false);
  const [pendingOrderCode, setPendingOrderCode]         = useState(() => { try { return localStorage.getItem('janz_pending_order') || null; } catch { return null; } });
  const [prodeEnabled, setProdeEnabled]                 = useState(false);
  const [clientId, setClientId]                         = useState(null);
  const [schedule, setSchedule]                         = useState({ openHour: '19:00', closeHour: '23:00', days: [] });
  const [currentTime, setCurrentTime]                   = useState('');
  const [inDiscountWindow, setInDiscountWindow]         = useState(false);
  const [dailyDeal, setDailyDeal]                       = useState(null);
  const [monthlyBurger, setMonthlyBurger]               = useState(null);
  const [pushGranted, setPushGranted]                   = useState(false);
  const [showPushBanner, setShowPushBanner]             = useState(() => {
    try {
      // No mostrar si ya aceptó o si ya lo rechazó antes
      return !localStorage.getItem('janz_push_granted') && !localStorage.getItem('janz_push_dismissed');
    } catch { return false; }
  });
  const [countdown, setCountdown]                       = useState('');
  const [activeSection, setActiveSection]               = useState('burgers');
  const [slotOccupancy, setSlotOccupancy]               = useState({});
  const [maxOrdersPerSlot, setMaxOrdersPerSlot]         = useState(5);
  const sectionRefs = useRef({});
  const socketRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // ── useEffect 1: carga inicial del menú y config ──────────────────────────
  useEffect(() => {
    API.get('/public/menu').then(r => {
      setMenu(r.data.menu || {}); setOpen(r.data.open);
      setAvailableAdditionals(r.data.additionals || []); setZones(r.data.zones || []);
      if (r.data.limits) setLimits(r.data.limits);
      if (r.data.businessWhatsapp) setBusinessWhatsapp(r.data.businessWhatsapp);
      if (r.data.dailyDeal) setDailyDeal(r.data.dailyDeal);
      if (r.data.monthlyBurger) setMonthlyBurger(r.data.monthlyBurger);
    }).catch(() => setSystemDown(true)).finally(() => setLoading(false));
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('clientId');
    if (cid) setClientId(cid);
    API.get('/prode/config').then(r => setProdeEnabled(r.data?.enabled || false)).catch(() => {});
    API.get('/config/public').then(r => {
      setTransferAlias(r.data.transferAlias || '');
      if (r.data.notesPlaceholder) setNotesPlaceholder(r.data.notesPlaceholder);
      if (r.data.hourlyDiscount?.enabled) setHourlyDiscount(r.data.hourlyDiscount);
      if (r.data.schedule) setSchedule({ ...r.data.schedule, days: r.data.schedule.days || [] });
      if (r.data.maxOrdersPerSlot) setMaxOrdersPerSlot(r.data.maxOrdersPerSlot);
    }).catch(() => {});
    API.get('/public/slots-availability').then(r => {
      setSlotOccupancy(r.data.occupancy || {});
      if (r.data.maxOrdersPerSlot) setMaxOrdersPerSlot(r.data.maxOrdersPerSlot);
    }).catch(() => {});
  }, []);

  // ── useEffect 2: reloj / ventana de descuento ─────────────────────────────
  useEffect(() => {
    const tick = () => {
      const ar = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const timeStr = `${String(ar.getHours()).padStart(2, '0')}:${String(ar.getMinutes()).padStart(2, '0')}`;
      setCurrentTime(timeStr);
      if (hourlyDiscount?.enabled && hourlyDiscount.fromHour && hourlyDiscount.toHour)
        setInDiscountWindow(timeStr >= hourlyDiscount.fromHour && timeStr <= hourlyDiscount.toHour);
    };
    tick(); const id = setInterval(tick, 10000); return () => clearInterval(id);
  }, [hourlyDiscount]);

  // ── useEffect 3: socket tracking ─────────────────────────────────────────
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

  // ── useEffect 4: intersection observer para nav ───────────────────────────
  useEffect(() => {
    if (step !== 'menu') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.dataset.section); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [step, menu]);

  // ── useEffect 4b: refrescar datos stale de localStorage (nickname vacío) ──
  // Pasa cuando el cliente ya estaba en localStorage (sin nickname) pero ahora
  // ya tiene uno en la BD. Se actualiza silenciosamente sin mostrar nada raro.
  useEffect(() => {
    if (authStep !== 'returning' || !client.whatsapp || client.nickname) return;
    API.get(`/public/client?wa=${client.whatsapp.replace(/\D/g, '')}`).then(r => {
      if (!r.data.found) return;
      if (r.data.hasNickname) {
        // Tiene nickname en DB → actualizar estado y localStorage
        setClient(c => ({ ...c, nickname: r.data.nickname, name: r.data.name || c.name }));
        try {
          const saved = JSON.parse(localStorage.getItem('janz_client_data') || '{}');
          localStorage.setItem('janz_client_data', JSON.stringify({
            ...saved, nickname: r.data.nickname, name: r.data.name || saved.name
          }));
        } catch {}
      } else {
        // Todavía no tiene nickname en DB → llevar al form de actualización
        setUpdateForm({ nickname: r.data.name?.split(' ')[0] || '', birthDay: '', birthMonth: '', birthSkipped: false });
        setAuthStep('update');
      }
    }).catch(() => {});
  // eslint-disable-next-line
  }, [authStep, client.whatsapp, client.nickname]);

  // ── useEffect 5: costo de delivery ───────────────────────────────────────
  useEffect(() => {
    if (!selectedZone || deliveryType !== 'delivery') { setDeliveryCost(0); return; }
    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) return;
    const sub = cart.reduce((s, i) => s + itemTotal(i), 0);
    const disc = activeDiscountPercent > 0 ? Math.round(sub * activeDiscountPercent / 100) : 0;
    setDeliveryCost(zone.freeFrom > 0 && (sub - disc) >= zone.freeFrom ? 0 : zone.cost || 0);
  // eslint-disable-next-line
  }, [selectedZone, cart, deliveryType, zones, couponStatus, inDiscountWindow, hourlyDiscount]);

  // ── useEffect 6: countdown promo del día ─────────────────────────────────
  // ✅ MOVIDO AQUÍ — antes estaba DEBAJO del return condicional del stepper,
  //    lo que causaba "Rendered more hooks than during the previous render"
  useEffect(() => {
    if (!dailyDeal?.toHour) return;
    const tick = () => {
      const ar = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const [h, m] = dailyDeal.toHour.split(':').map(Number);
      const end = new Date(ar); end.setHours(h, m, 0, 0);
      const diff = end - ar;
      if (diff <= 0) { setCountdown(''); return; }
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hh > 0 ? hh + 'h ' : ''}${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [dailyDeal]);

  // ── Cálculos derivados ────────────────────────────────────────────────────
  const subtotalBruto = cart.reduce((s, i) => s + itemTotal(i), 0);
  const activeDiscountPercent = couponStatus?.valid ? couponStatus.discountPercent : (inDiscountWindow && hourlyDiscount?.enabled ? hourlyDiscount.discountPercent : 0);

  // Si el cupón es para un producto específico, el descuento aplica solo a ese ítem
  const discount = (() => {
    if (!activeDiscountPercent) return 0;
    if (couponStatus?.valid && couponStatus.applicableProduct) {
      // Buscar el ítem en el carrito que coincide con el producto del cupón
      const targetItem = cart.find(i =>
        i.product === couponStatus.applicableProduct._id ||
        i.product?._id === couponStatus.applicableProduct._id ||
        i._id === couponStatus.applicableProduct._id
      );
      if (!targetItem) return 0;
      const itemSubtotal = (targetItem.salePrice || targetItem.unitPrice || 0) * (targetItem.quantity || 1);
      return Math.round(itemSubtotal * activeDiscountPercent / 100);
    }
    return Math.round(subtotalBruto * activeDiscountPercent / 100);
  })();
  const subtotalConDescuento = subtotalBruto - discount;
  const totalFinal = subtotalConDescuento + (deliveryType === 'delivery' ? deliveryCost : 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToSection = (section) => {
    const el = sectionRefs.current[section];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToCart = (product) => {
    const existing = cart.find(i => i.product === product._id);
    if (existing) setCart(c => c.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i));
    else if (availableAdditionals.length > 0) { setAdditionalsModal(product); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else addProductToCart(product, []);
  };
  const addProductToCart = (product, additionals) => setCart(c => [...c, { product: product._id, productName: product.name, variant: product.variant, productType: product.productType || 'burger', quantity: 1, unitPrice: product.salePrice, additionals }]);
  const handleAdditionalsConfirm = (additionals) => { addProductToCart(additionalsModal, additionals); setAdditionalsModal(null); };
  const removeFromCart = (productId) => {
    const existing = cart.find(i => i.product === productId);
    if (existing?.quantity === 1) setCart(c => c.filter(i => i.product !== productId));
    else setCart(c => c.map(i => i.product === productId ? { ...i, quantity: i.quantity - 1 } : i));
  };

  // ── Funciones de autenticación ────────────────────────────────────────────
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const startPinCountdown = () => {
    setPinCountdown(600); // 10 min en segundos
    if (pinTimerRef.current) clearInterval(pinTimerRef.current);
    pinTimerRef.current = setInterval(() => {
      setPinCountdown(c => { if (c <= 1) { clearInterval(pinTimerRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const handleWaLookup = async () => {
    const wa = waInput.replace(/\D/g, '');
    if (wa.length < 8) { toast.error('Ingresá un número válido'); return; }
    setWaLooking(true);
    try {
      // Verificar si el WA guardado en localStorage coincide → cliente known sin PIN
      const saved = localStorage.getItem('janz_client_data');
      const savedWa = saved ? JSON.parse(saved)?.whatsapp?.replace(/\D/g, '') : null;

      const res = await API.get(`/public/client?wa=${wa}`);

      if (res.data.found) {
        // Cliente existe en DB
        const d = res.data;
        setClient(c => ({
          ...c, whatsapp: wa, name: d.name, nickname: d.nickname,
          address: d.address, floor: d.floor,
          neighborhood: d.neighborhood, references: d.references,
        }));

        if (!d.hasNickname) {
          // Cliente viejo sin apodo → pantalla de migración (no requiere PIN)
          localStorage.setItem('janz_client_data', JSON.stringify({ whatsapp: wa, name: d.name, nickname: d.nickname, address: d.address, floor: d.floor, references: d.references }));
          setUpdateForm({ nickname: d.name?.split(' ')[0] || '', birthDay: '', birthMonth: '', birthSkipped: false });
          setAuthStep('update');
        } else if (savedWa && savedWa === wa) {
          // Dispositivo reconocido (localStorage coincide) → sin PIN
          localStorage.setItem('janz_client_data', JSON.stringify({ whatsapp: wa, name: d.name, nickname: d.nickname, address: d.address, floor: d.floor, references: d.references }));
          setAuthStep('returning');
        } else {
          // Dispositivo no reconocido (incógnito u otro equipo) → pedir PIN
          setPinSending(true);
          try {
            await API.post('/public/send-pin', { wa });
            setAuthStep('verify-pin');
            startPinCountdown();
            toast.success('Por seguridad, verificamos que el número sea tuyo 🔐');
          } finally { setPinSending(false); }
        }
      } else {
        // Cliente nuevo → mandar PIN
        setPinSending(true);
        try {
          await API.post('/public/send-pin', { wa });
          setClient(c => ({ ...c, whatsapp: wa }));
          setAuthStep('verify-pin');
          startPinCountdown();
          toast.success('Te mandamos un código por WhatsApp 📲');
        } finally { setPinSending(false); }
      }
    } catch (e) {
      toast.error('Error al verificar. Intentá de nuevo.');
    } finally { setWaLooking(false); }
  };

  const handleVerifyPin = async () => {
    if (pinInput.length !== 4) { toast.error('El código tiene 4 dígitos'); return; }
    setPinVerifying(true);
    try {
      const res = await API.post('/public/verify-pin', { wa: client.whatsapp, pin: pinInput });
      if (res.data.valid) {
        // Si el cliente ya existía en DB (tiene nombre cargado) → va a returning
        // Si es cliente nuevo (sin nombre aún) → va a new para completar datos
        if (client.name) {
          // Cliente existente verificado desde dispositivo no reconocido
          localStorage.setItem('janz_client_data', JSON.stringify({
            whatsapp: client.whatsapp, name: client.name, nickname: client.nickname,
            address: client.address, floor: client.floor, references: client.references
          }));
          setAuthStep('returning');
          toast.success(`¡Verificado! Bienvenido de vuelta ${client.nickname || client.name?.split(' ')[0]} 🎉`);
        } else {
          setAuthStep('new');
          toast.success('¡Verificado! Completá tus datos 🎉');
        }
      } else {
        toast.error(res.data.message || 'Código incorrecto');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Código incorrecto o expirado');
    } finally { setPinVerifying(false); }
  };

  const handleResendPin = async () => {
    setPinSending(true);
    try {
      await API.post('/public/send-pin', { wa: client.whatsapp });
      startPinCountdown();
      toast.success('Código reenviado 📲');
    } catch { toast.error('Error al reenviar'); }
    finally { setPinSending(false); }
  };

  const handleSaveUpdate = async () => {
    if (!updateForm.nickname.trim()) { toast.error('¿Cómo queres que te llamemos? 😊'); return; }
    try {
      await API.patch('/public/client-update', {
        wa:           client.whatsapp,
        nickname:     updateForm.nickname.trim(),
        birthDay:     updateForm.birthDay   || undefined,
        birthMonth:   updateForm.birthMonth || undefined,
        birthSkipped: updateForm.birthSkipped,
      });
      setClient(c => ({ ...c, nickname: updateForm.nickname.trim(), birthDay: updateForm.birthDay, birthMonth: updateForm.birthMonth }));
      localStorage.setItem('janz_client_data', JSON.stringify({ ...JSON.parse(localStorage.getItem('janz_client_data') || '{}'), nickname: updateForm.nickname.trim() }));
      setAuthStep('returning');
      toast.success(`¡Listo ${updateForm.nickname}! 🎉`);
    } catch { toast.error('Error al guardar'); }
  };

  const handleResetAuth = () => {
    localStorage.removeItem('janz_client_data');
    setClient({ name: '', nickname: '', whatsapp: '', address: '', floor: '', references: '', notes: '', birthDay: '', birthMonth: '', birthSkipped: false, useAltAddress: false });
    setWaInput(''); setPinInput(''); setAuthStep('phone');
  };

  // ── Editar perfil desde el flujo returning ──────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', address: '', floor: '', references: '' });

  const openEditProfile = () => {
    setEditForm({
      nickname:   client.nickname || '',
      address:    client.address  || '',
      floor:      client.floor    || '',
      references: client.references || '',
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.nickname.trim()) { toast.error('El apodo es obligatorio 😊'); return; }
    try {
      await API.patch('/public/client-update', {
        wa:         client.whatsapp,
        nickname:   editForm.nickname.trim(),
      });
      // Actualizar state y localStorage
      const updated = {
        ...client,
        nickname:   editForm.nickname.trim(),
        address:    editForm.address   || client.address,
        floor:      editForm.floor     || client.floor,
        references: editForm.references || client.references,
      };
      setClient(updated);
      try {
        const saved = JSON.parse(localStorage.getItem('janz_client_data') || '{}');
        localStorage.setItem('janz_client_data', JSON.stringify({
          ...saved,
          nickname:   updated.nickname,
          address:    updated.address,
          floor:      updated.floor,
          references: updated.references,
        }));
      } catch {}
      setEditingProfile(false);
      toast.success(`¡Datos actualizados! 🎉`);
    } catch { toast.error('Error al guardar. Intentá de nuevo.'); }
  };

  const validateEntrega = () => {
    if (deliveryType === 'delivery' && zones.length > 0 && !selectedZone) { toast.error('Seleccioná tu zona de delivery'); return false; }
    return true;
  };
  const validateDatos = () => {
    if (!client.nickname?.trim()) { toast.error('¿Cómo queremos llamarte? 😊'); return false; }
    if (!client.name?.trim()) { toast.error('Ingresá tu nombre completo'); return false; }
    if (!client.whatsapp) { toast.error('WhatsApp es obligatorio'); return false; }
    if (deliveryType === 'delivery' && !client.address && !client.useAltAddress) { toast.error('Ingresá tu dirección'); return false; }
    return true;
  };
  const validatePago = () => {
    if (!paymentMethod) { toast.error('Seleccioná un método de pago'); return false; }
    if (scheduledFor !== 'asap') {
      const toHHMM = v => (typeof v === 'string' && v.includes(':')) ? v : `${String(Number(v) || 0).padStart(2, '0')}:00`;
      const openStr = toHHMM(schedule.openHour) || '19:00';
      const closeStr = toHHMM(schedule.closeHour) || '23:00';
      if (scheduledFor < openStr || scheduledFor > closeStr) { toast.error(`Horario fuera del comercial (${openStr} a ${closeStr}hs).`); return false; }
    }
    return true;
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!client.whatsapp) { setCouponStatus({ valid: false, message: 'Ingresá tu WhatsApp primero' }); return; }
    setValidatingCoupon(true);
    try {
      const res = await API.post('/coupons/validate', { code: couponCode.trim(), whatsapp: client.whatsapp });
      setCouponStatus({
        valid: true,
        discountPercent: res.data.discountPercent,
        message: res.data.message,
        applicableProduct: res.data.applicableProduct || null,
        applicableProductName: res.data.applicableProductName || null,
      });
    } catch (e) { setCouponStatus({ valid: false, message: e.response?.data?.message || 'Cupón inválido' }); }
    finally { setValidatingCoupon(false); }
  };

  const handleNextStep = () => {
    if (step === 'entrega' && validateEntrega()) setStep('datos');
    else if (step === 'datos') {
      // Solo avanzar si el auth está completo (returning o new)
      if (authStep === 'phone' || authStep === 'verify-pin' || authStep === 'update') {
        toast.error('Completá tu identificación primero');
        return;
      }
      if (validateDatos()) setStep('pago');
    }
    else if (step === 'pago' && validatePago()) setShowConfirmModal(true);
  };

  const handleBack = () => {
    if (step === 'entrega') setStep('menu');
    else if (step === 'datos') setStep('entrega');
    else if (step === 'pago') setStep('datos');
  };

  const doSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setShowConfirmModal(false);
    setSubmitting(true);        // ← el modal aparece acá, antes de la llamada al backend
    try {
      const finalAddr    = client.useAltAddress ? (client.altAddress    || client.address)    : client.address;
      const finalFloor   = client.useAltAddress ? (client.altFloor      || client.floor)      : client.floor;
      const finalRefs    = client.useAltAddress ? (client.altReferences || client.references) : client.references;
      const clientPayload = { ...client, address: finalAddr, floor: finalFloor, references: finalRefs };

      // ── Anti-duplicados: generar o reutilizar el key de esta sesión de checkout ──
      // sessionStorage se limpia al cerrar la tab, así que es seguro reutilizarlo
      // en reintentos de la misma sesión (corte de internet) pero no entre sesiones.
      let idempotencyKey = null;
      try {
        idempotencyKey = sessionStorage.getItem('janz_idempotency_key');
        if (!idempotencyKey) {
          idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          sessionStorage.setItem('janz_idempotency_key', idempotencyKey);
        }
      } catch { /* sessionStorage no disponible — continúa sin el key */ }

      const res = await API.post('/public/order', {
        client: clientPayload, items: cart.map(i => ({ product: i.product, quantity: i.quantity, additionals: (i.additionals || []).map(a => ({ additional: a.additional, quantity: a.quantity })) })),
        deliveryType, paymentMethod, notes: client.notes, zone: selectedZone,
        scheduledFor: scheduledFor === 'asap' ? null : scheduledFor, isScheduled: scheduledFor !== 'asap',
        deliveryAddress: deliveryType === 'delivery' ? [finalAddr, finalFloor, finalRefs].filter(Boolean).join(' — ') : '',
        couponCode: couponStatus?.valid ? couponCode.trim() : null,
        idempotencyKey
      });

      // Pedido creado (o recuperado idempotentemente) con éxito → limpiar el key
      try { sessionStorage.removeItem('janz_idempotency_key'); } catch {}

      try { localStorage.setItem('janz_client_data', JSON.stringify({ name: client.name, nickname: client.nickname, whatsapp: client.whatsapp, address: finalAddr, floor: finalFloor, references: finalRefs })); } catch {}
      try { localStorage.setItem('janz_pending_order', res.data.publicCode || res.data.orderNumber); } catch {}
      setPendingOrderCode(res.data.publicCode || res.data.orderNumber);
      setOrderResult(res.data); setOrderStatus('pending');
      setSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setStep('tracking');
        // Mostrar modal de notificaciones 1s después del tracking si aún no decidió
        try {
          if (!localStorage.getItem('janz_push_granted') && !localStorage.getItem('janz_push_dismissed')) {
            setTimeout(() => setShowPushBanner(true), 1000);
          }
        } catch {}
      }, 2500);
    } catch (e) {
      setSubmitting(false);
      // NO limpiar el idempotencyKey en caso de error → si el cliente reintenta,
      // reutiliza el mismo key y el backend detecta si el pedido ya se creó.
      toast.error(e.response?.data?.message || 'Error al enviar pedido');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const closeWelcome = () => { try { localStorage.setItem('janz_visited', '1'); } catch {} setShowWelcome(false); };

  const requestPushPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        try { localStorage.setItem('janz_push_dismissed', '1'); } catch {}
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      await API.post('/push/subscribe', { subscription: sub, userAgent: navigator.userAgent });
      try { localStorage.setItem('janz_push_granted', '1'); } catch {}
      setPushGranted(true);
    } catch (e) { console.warn('Push subscription failed:', e); }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  const getZoneCost = (zone) => { const isFree = zone.freeFrom > 0 && subtotalConDescuento >= zone.freeFrom; return isFree ? 0 : zone.cost || 0; };
  const amountLeftForFree = (zone) => { if (!zone.freeFrom || zone.freeFrom === 0) return null; const diff = zone.freeFrom - subtotalConDescuento; return diff > 0 ? diff : null; };

  const parseTime = v => { if (typeof v === 'string' && v.includes(':')) { const [h, m] = v.split(':').map(Number); return { h: h || 0, m: m || 0 }; } return { h: Number(v) || 0, m: 0 }; };

  const getSlots = () => {
    const op = parseTime(schedule.openHour);
    const cl = parseTime(schedule.closeHour);
    const openMins = (op.h || 19) * 60 + op.m;
    const closeMins = (cl.h || 23) * 60 + cl.m;
    let nowMins = 0;
    if (currentTime) {
      const [hh, mm] = currentTime.split(':').map(Number);
      nowMins = hh * 60 + mm;
    }
    const slots = [];
    for (let mins = openMins; mins < closeMins; mins += 30) {
      if (mins <= nowMins + 15) continue;
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      const slotKey = `${hh}:${mm}`;
      const occupancy = slotOccupancy[slotKey] || 0;
      const isFull = maxOrdersPerSlot > 0 && occupancy >= maxOrdersPerSlot;
      slots.push({ key: slotKey, full: isFull, occupancy });
    }
    return slots;
  };

  // ── Returns condicionales — TODOS los hooks ya fueron llamados arriba ──────

  if (loading) return <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  if (pendingOrderCode && step !== 'tracking') return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <img src={logoJanz} alt="Janz" style={{ height: 52, objectFit: 'contain', marginBottom: 24, opacity: 0.9 }} />
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: GOLD, marginBottom: 8 }}>Ya tenés un pedido en curso</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.7 }}>Tu pedido <strong style={{ color: GOLD, letterSpacing: 1 }}>{pendingOrderCode}</strong> ya fue enviado.<br />Esperá a recibirlo antes de hacer otro.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {businessWhatsapp && <a href={`https://wa.me/54${businessWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', padding: '13px 24px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}><FaWhatsapp size={20} /> Consultar mi pedido</a>}
          <button onClick={() => { try { localStorage.removeItem('janz_pending_order'); } catch {} setPendingOrderCode(null); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', padding: '11px 20px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>Ya lo recibí — hacer nuevo pedido</button>
        </div>
      </div>
    </div>
  );

  if (systemDown) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔧</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: GOLD, marginBottom: 12 }}>Sistema temporalmente fuera de servicio</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.7 }}>Por favor realizá tu pedido por WhatsApp.</div>
        {businessWhatsapp && <a href={`https://wa.me/54${businessWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#25D366', color: 'white', padding: '14px 24px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}><FaWhatsapp size={20} /> Pedido por WhatsApp</a>}
      </div>
    </div>
  );

  if (limits.enabled && limits.limitReached) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎯</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: GOLD, marginBottom: 12 }}>¡Cupo completo por hoy!</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: 1.7 }}>Alcanzamos el límite de {limits.dailyMax} pedidos. Volvé mañana 🍔</div>
      </div>
    </div>
  );

  if (step === 'tracking') return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {showPushBanner && !pushGranted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
          <div style={{ background: '#0f0f0f', borderRadius: 20, width: '100%', maxWidth: 360, padding: '36px 28px', border: '1px solid rgba(232,184,75,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: GOLD, marginBottom: 8, lineHeight: 1.2 }}>¿Querés recibir notificaciones?</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 28 }}>
              Enterate de promos exclusivas, descuentos y novedades de Janz Burgers antes que nadie 🍔
            </div>
            <button
              onClick={() => { setShowPushBanner(false); requestPushPermission(); }}
              style={{ width: '100%', background: GOLD, color: '#000', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', marginBottom: 10 }}>
              🔔 Sí, activar notificaciones
            </button>
            <button
              onClick={() => { setShowPushBanner(false); try { localStorage.setItem('janz_push_dismissed', '1'); } catch {} }}
              style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', padding: '12px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
              Ahora no
            </button>
          </div>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <img src={logoJanz} alt="Janz" style={{ height: 48, objectFit: 'contain', marginBottom: 20, opacity: 0.9 }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.5px', marginBottom: 12 }}>¡Pedido recibido!</div>
          <div style={{ color: GOLD, fontSize: '1.8rem', fontWeight: 900, background: 'rgba(232,184,75,0.08)', borderRadius: 14, padding: '10px 28px', marginBottom: 6, border: '1px solid rgba(232,184,75,0.2)', display: 'inline-block', letterSpacing: 2 }}>{orderResult?.publicCode || orderResult?.orderNumber}</div>
          <div style={{ color: '#444', fontSize: '0.8rem', marginTop: 6 }}>Te avisamos por WhatsApp en cada paso</div>
        </div>
        <TrackingBar status={orderStatus || 'pending'} />
        <div style={{ background: '#0f0f0f', borderRadius: 14, padding: 20, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: GOLD, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumen</div>
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
          {orderResult?.deliveryCost === 0 && orderResult?.deliveryType === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span style={{ color: '#22c55e' }}>🛵 Delivery</span><span style={{ color: '#22c55e', fontWeight: 700 }}>¡Gratis! 🎉</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 8 }}>
            <span style={{ fontWeight: 700, color: GOLD, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total a pagar</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{fmt(orderResult?.total)}</span>
          </div>
          {paymentMethod === 'efectivo' && <div style={{ color: '#444', fontSize: '0.78rem', marginTop: 10 }}>💵 Tené listo el efectivo</div>}
          {paymentMethod === 'transferencia' && <div style={{ color: '#444', fontSize: '0.78rem', marginTop: 10 }}>🏦 Enviá el comprobante por WhatsApp{transferAlias && <span style={{ color: GOLD, fontWeight: 700 }}> · Alias: {transferAlias}</span>}</div>}
        </div>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.75rem', color: '#ef4444' }}>⚠️ Si necesitás cancelar, contactanos por WhatsApp.</div>
        <button onClick={() => { setCart([]); setStep('menu'); setOrderResult(null); setOrderStatus(null); setPaymentMethod(''); setCouponCode(''); setCouponStatus(null); setSelectedZone(''); setScheduledFor('asap'); try { localStorage.removeItem('janz_pending_order'); } catch {} setPendingOrderCode(null); }} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: '#555', border: '1px solid rgba(255,255,255,0.07)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Hacer otro pedido</button>
      </div>
    </div>
  );

  const css = `
    .janz-hero { position: relative; height: 280px; overflow: hidden; }
    .janz-hero-content { position: absolute; bottom: 20px; left: 20px; right: 20px; }
    .janz-menu-wrap { max-width: 560px; width: 100%; margin: 0 auto; padding: 0 0 140px; }
    .janz-desktop-layout { display: block; }
    .janz-sidebar { display: none; }
    .janz-cart-float { display: block; }
    .janz-product-card { display: flex; flex-direction: row; min-height: 110px; }
    .janz-product-img-wrap { width: 110px; flex-shrink: 0; overflow: hidden; position: relative; }
    .janz-product-img-wrap img { position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; }
    .sticky-nav { position: sticky; top: 0; z-index: 50; background: rgba(8,8,8,0.97); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 10px 16px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -ms-overflow-style: none; }
    .sticky-nav::-webkit-scrollbar { display: none; }
    .nav-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); margin-right: 8px; transition: all 0.2s; background: transparent; color: rgba(255,255,255,0.5); }
    .nav-pill.active { background: #E8B84B; color: #000; border-color: #E8B84B; }
    .slot-btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.82rem; transition: all 0.2s; font-family: inherit; }
    .slot-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.6 } }
    @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    .deal-badge { animation: pulse 2s ease-in-out infinite; }
    .step-wrap { max-width: 480px; width: 100%; margin: 0 auto; padding: 28px 20px 140px; }
    @media (min-width: 900px) {
      .janz-hero { height: 340px; }
      .janz-hero-content { bottom: 36px; left: 48px; right: 48px; display: flex; align-items: flex-end; gap: 40px; }
      .janz-menu-wrap { max-width: 1100px; padding: 0 24px 80px; }
      .janz-desktop-layout { display: grid; grid-template-columns: 1fr 300px; gap: 0; }
      .janz-menu-col { padding-right: 24px; }
      .janz-sidebar { display: block; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 24px; }
      .janz-cart-float { display: none; }
    }
  `;

  const menuGroups = Object.entries(menu).map(([name, variants]) => ({
    name,
    // Filtrar variantes que son destacadas del día o del mes — ya aparecen en su card especial
    variants: variants.filter(v => !v.isDailyBurger && !v.isMonthlyBurger),
    productType: variants[0]?.productType || 'burger'
  })).filter(g => g.variants.length > 0);
  // Lista plana de TODOS los productos (sin filtrar) para las cards de destacados
  const allMenuProducts = Object.values(menu).flat();
  const hasBurgers = menuGroups.some(g => g.productType === 'burger');
  const hasPapas   = menuGroups.some(g => g.productType === 'papas');
  const hasOtros   = menuGroups.some(g => g.productType !== 'burger' && g.productType !== 'papas');
  const hasAdds    = availableAdditionals.length > 0;

  const navItems = [
    hasBurgers && { key: 'burgers', label: '🍔 Burgers' },
    hasPapas   && { key: 'papas',   label: '🍟 Papas' },
    hasOtros   && { key: 'otros',   label: '🍽️ Otros' },
    hasAdds    && { key: 'adicionales', label: '➕ Adicionales' },
  ].filter(Boolean);

  const ProductCard = ({ name, variants }) => {
    const order = { Simple: 0, Doble: 1, Triple: 2 };
    const sorted = [...variants].sort((a, b) => (order[a.variant] ?? 99) - (order[b.variant] ?? 99));
    const description = sorted[0]?.description;
    const image = variants.find(v => v.image)?.image;
    return (
      <div className="janz-product-card" style={{ marginBottom: 12, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <div className="janz-product-img-wrap">
          {image ? <img src={image} alt={name} /> : <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, minHeight: 110 }}>🍔</div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div style={{ padding: '12px 14px 4px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: GOLD, lineHeight: 1.2, letterSpacing: '-0.3px' }}>{name}</div>
            {description && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 500, marginTop: 4, lineHeight: 1.4 }}>{description}</div>}
          </div>
          <div style={{ paddingBottom: 6 }}>
            {sorted.map((p, idx) => {
              const inCart = cart.find(i => i.product === p._id);
              const unavailable = !p.available;
              return (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: unavailable ? 0.4 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>{p.variant}{unavailable && <span style={{ color: '#ef4444', fontSize: '0.6rem', marginLeft: 8 }}>NO DISPONIBLE</span>}</div>
                    <div style={{ color: GOLD, fontWeight: 800, fontSize: '0.9rem', marginTop: 1 }}>{fmt(p.salePrice)}</div>
                  </div>
                  {!unavailable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {inCart ? (<><button onClick={() => removeFromCart(p._id)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button><span style={{ fontWeight: 800, minWidth: 16, textAlign: 'center', color: 'white', fontSize: '0.9rem' }}>{inCart.quantity}</span><button onClick={() => handleAddToCart(p)} style={{ width: 30, height: 30, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 800 }}>+</button></>) : (<button onClick={() => handleAddToCart(p)} style={{ background: GOLD, color: '#000', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}>Agregar</button>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ label }) => (
    <div style={{ padding: '20px 16px 10px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</div>
    </div>
  );

  // ── Render stepper steps ───────────────────────────────────────────────────
  if (step === 'entrega' || step === 'datos' || step === 'pago') {
    const slots = getSlots();
    return (
      <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <style>{css}</style>
        <StepperBar currentStep={step} onBack={handleBack} />

        {(submitting || submitSuccess) && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 24 }}>
            <div style={{ background: '#0f0f0f', borderRadius: 20, width: '100%', maxWidth: 360, padding: '40px 32px', border: `1px solid ${submitSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(232,184,75,0.15)'}`, textAlign: 'center' }}>
              {submitSuccess ? (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🍔</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e', marginBottom: 10, lineHeight: 1.3 }}>¡Pedido recibido!</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Muchas gracias. En breve<br />te confirmamos por WhatsApp 📱
                  </div>
                </>
              ) : (
                <>
                  <img src={logoJanz} alt="Janz" style={{ height: 44, objectFit: 'contain', marginBottom: 24, opacity: 0.9 }} />
                  <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                  <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Enviando tu pedido...</div>
                </>
              )}
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300 }}>
            <div style={{ background: '#0f0f0f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', marginBottom: 4 }}>¿Confirmás tu pedido?</div>
              <div style={{ color: '#444', fontSize: '0.82rem', marginBottom: 20 }}>Una vez enviado no podés modificarlo.</div>
              {cart.map((item, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}><span style={{ color: '#aaa' }}>{item.productName} {item.variant} ×{item.quantity}</span><span style={{ color: 'white', fontWeight: 600 }}>{fmt(item.unitPrice * item.quantity)}</span></div>
                  {(item.additionals || []).map((a, ai) => (<div key={ai} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#444', paddingLeft: 10, marginTop: 2 }}><span>+ {a.name} ×{a.quantity}</span><span>+ {fmt(a.unitPrice * a.quantity)}</span></div>))}
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 12 }}>
                {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#22c55e', marginBottom: 6 }}><span>{couponStatus?.valid ? `🎟️ Cupón ${couponCode}` : `🎉 Descuento ${activeDiscountPercent}%`}</span><span>- {fmt(discount)}</span></div>}
                {deliveryType === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6, color: deliveryCost === 0 ? '#22c55e' : '#555' }}><span>🛵 Delivery</span><span>{deliveryCost === 0 ? '¡Gratis!' : fmt(deliveryCost)}</span></div>}
                {deliveryType === 'delivery' && client.address && <div style={{ fontSize: '0.78rem', color: '#333', marginBottom: 6 }}>📍 {[client.address, client.floor, client.references].filter(Boolean).join(' — ')}</div>}
                {scheduledFor !== 'asap' && <div style={{ fontSize: '0.78rem', color: GOLD, marginBottom: 8 }}>⏰ Programado para las {scheduledFor}hs</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: GOLD, fontSize: '0.75rem', textTransform: 'uppercase' }}>Total a pagar</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{fmt(totalFinal)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowConfirmModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>← Corregir</button>
                <button onClick={doSubmit} disabled={submitting} style={{ flex: 2, background: submitting ? '#1a1a1a' : GOLD, color: submitting ? '#555' : '#000', border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? (<><div style={{ width: 16, height: 16, border: '2px solid #333', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enviando...</>) : '✅ Sí, confirmar pedido'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 1: Entrega */}
        {step === 'entrega' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>¿Cómo recibís el pedido?</div>
            <div style={{ color: '#444', fontSize: '0.82rem', marginBottom: 24 }}>Paso 1 de 3</div>

            {hourlyDiscount?.enabled && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: (inDiscountWindow && !couponStatus?.valid) ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${(inDiscountWindow && !couponStatus?.valid) ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>{inDiscountWindow
                    ? couponStatus?.valid
                      ? <><div style={{ fontWeight: 600, color: '#aaa', fontSize: '0.85rem' }}>⏰ Horario de descuento activo</div><div style={{ fontSize: '0.73rem', color: '#555', marginTop: 3 }}>Tu cupón ya aplica descuento — no se acumulan</div></>
                      : <><div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>🎉 ¡Estás en horario de descuento!</div><div style={{ fontSize: '0.76rem', color: '#86efac', marginTop: 3 }}>{hourlyDiscount.discountPercent}% off aplicado</div></>
                    : <><div style={{ fontWeight: 600, color: '#aaa', fontSize: '0.85rem' }}>⏰ {hourlyDiscount.discountPercent}% off entre {hourlyDiscount.fromHour} y {hourlyDiscount.toHour}hs</div><div style={{ fontSize: '0.73rem', color: '#444', marginTop: 3 }}>Pedí en ese horario para obtenerlo</div></>
                  }</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', color: (inDiscountWindow && !couponStatus?.valid) ? '#22c55e' : '#333', fontWeight: 700, marginLeft: 12 }}>{currentTime}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>Tipo de entrega *</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: 'delivery', l: '🛵 Delivery' }, { v: 'takeaway', l: '🥡 Take Away' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setDeliveryType(v)} style={{ flex: 1, padding: '16px 12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', border: deliveryType === v ? `2px solid ${GOLD}` : '2px solid rgba(255,255,255,0.08)', fontSize: '0.95rem', transition: 'all 0.2s', background: deliveryType === v ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)', color: deliveryType === v ? GOLD : '#555' }}>{l}</button>
                ))}
              </div>
            </div>

            {deliveryType === 'delivery' && zones.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={labelStyle}>Zona de delivery *</div>
                {zones.map(zone => {
                  const cost = getZoneCost(zone);
                  const left = amountLeftForFree(zone);
                  const isFree = cost === 0 && zone.freeFrom > 0;
                  return (
                    <div key={zone.id}>
                      <button onClick={() => setSelectedZone(zone.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: left ? 4 : 10, border: selectedZone === zone.id ? `2px solid ${GOLD}` : '2px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s', background: selectedZone === zone.id ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.04)', color: selectedZone === zone.id ? GOLD : '#888' }}>
                        <span>📍 {zone.name}</span>
                        <span style={{ fontSize: '0.85rem', color: cost === 0 ? '#22c55e' : '#555', fontWeight: 700 }}>{cost === 0 ? (isFree ? '¡Gratis! 🎉' : 'Gratis') : fmt(cost)}</span>
                      </button>
                      {left !== null && selectedZone === zone.id && (
                        <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(232,184,75,0.05)', border: '1px solid rgba(232,184,75,0.15)', fontSize: '0.76rem', color: '#9a7d30', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🛵</span><span>Te faltan <strong style={{ color: GOLD }}>{fmt(left)}</strong> para envío gratis en esta zona</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>⏰ ¿Cuándo lo querés?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => setScheduledFor('asap')} className="slot-btn"
                  style={{ background: scheduledFor === 'asap' ? GOLD : 'rgba(255,255,255,0.07)', border: scheduledFor === 'asap' ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.1)', color: scheduledFor === 'asap' ? '#000' : 'rgba(255,255,255,0.75)' }}>
                  🚀 Lo antes posible
                </button>
                {slots.map(slot => (
                  <button key={slot.key} disabled={slot.full} onClick={() => !slot.full && setScheduledFor(slot.key)} className="slot-btn"
                    style={{ background: slot.full ? 'rgba(255,255,255,0.03)' : scheduledFor === slot.key ? 'rgba(232,184,75,0.2)' : 'rgba(255,255,255,0.07)', border: slot.full ? '1px solid rgba(255,255,255,0.05)' : scheduledFor === slot.key ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.1)', color: slot.full ? 'rgba(255,255,255,0.2)' : scheduledFor === slot.key ? GOLD : 'rgba(255,255,255,0.75)', position: 'relative' }}>
                    🕐 {slot.key}hs{slot.full && <span style={{ fontSize: '0.65rem', display: 'block', color: '#ef4444', fontWeight: 400 }}>Completo</span>}
                  </button>
                ))}
                {slots.length === 0 && scheduledFor !== 'asap' && setScheduledFor('asap') === undefined && null}
              </div>
              {scheduledFor !== 'asap' && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: '0.76rem', color: '#aaa' }}>
                  ✓ Programado para las <strong style={{ color: GOLD }}>{scheduledFor}hs</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AUTH: Paso WhatsApp ───────────────────────────────────────── */}
        {step === 'datos' && authStep === 'phone' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>¿Cuál es tu WhatsApp?</div>
            <div style={{ color: '#555', fontSize: '0.82rem', marginBottom: 24 }}>Lo usamos para avisarte de tu pedido 📲</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Tu número de WhatsApp *</label>
              <input
                value={waInput} onChange={e => setWaInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 1123456789" type="tel" style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleWaLookup()}
                autoFocus
              />
            </div>
            <button onClick={handleWaLookup} disabled={waLooking || pinSending || !waInput}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: GOLD, border: 'none', color: '#000', fontWeight: 800, fontSize: '1rem', cursor: waLooking ? 'not-allowed' : 'pointer' }}>
              {waLooking || pinSending ? 'Buscando...' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* ── AUTH: Verificar PIN (cliente nuevo) ───────────────────────── */}
        {step === 'datos' && authStep === 'verify-pin' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>Verificá tu WhatsApp</div>
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: 24 }}>
              Te mandamos un código de 4 dígitos al <strong style={{ color: 'white' }}>+{client.whatsapp}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Código de verificación</label>
              <input
                value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="_ _ _ _" type="tel" maxLength={4}
                style={{ ...inputStyle, fontSize: '1.6rem', letterSpacing: '0.4em', textAlign: 'center' }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                autoFocus
              />
            </div>
            {pinCountdown > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center', marginBottom: 12 }}>
                Expira en {Math.floor(pinCountdown / 60)}:{String(pinCountdown % 60).padStart(2, '0')}
              </div>
            )}
            <button onClick={handleVerifyPin} disabled={pinVerifying || pinInput.length !== 4}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: GOLD, border: 'none', color: '#000', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginBottom: 10 }}>
              {pinVerifying ? 'Verificando...' : 'Verificar →'}
            </button>
            <button onClick={handleResendPin} disabled={pinSending || pinCountdown > 540}
              style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#555', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              {pinSending ? 'Enviando...' : '↩️ Reenviar código'}
            </button>
            <button onClick={() => { setAuthStep('phone'); setPinInput(''); }}
              style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: 'none', color: '#333', fontSize: '0.8rem', cursor: 'pointer' }}>
              ← Cambiar número
            </button>
          </div>
        )}

        {/* ── AUTH: Actualizar datos (cliente viejo sin apodo) ──────────── */}
        {step === 'datos' && authStep === 'update' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>👋 ¡Te reconocemos!</div>
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: 24 }}>Completá estos datos para mejorar tu experiencia (solo una vez)</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>¿Cómo queres que te llamemos? *</label>
              <input value={updateForm.nickname} onChange={e => setUpdateForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="Tu apodo" style={inputStyle} autoFocus />
              <div style={{ fontSize: '0.72rem', color: '#444', marginTop: 5 }}>Así te vamos a saludar en cada pedido 😊</div>
            </div>
            <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(232,184,75,0.05)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: GOLD, marginBottom: 12 }}>🎂 ¿Cuándo es tu cumple? <span style={{ color: '#444', fontWeight: 400 }}>(opcional)</span></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" min={1} max={31} value={updateForm.birthDay}
                  onChange={e => setUpdateForm(f => ({ ...f, birthDay: e.target.value, birthSkipped: false }))}
                  placeholder="Día" style={{ ...inputStyle, width: 80, textAlign: 'center' }} />
                <select value={updateForm.birthMonth}
                  onChange={e => setUpdateForm(f => ({ ...f, birthMonth: e.target.value, birthSkipped: false }))}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">Mes</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              {!updateForm.birthDay && !updateForm.birthMonth && (
                <button onClick={() => setUpdateForm(f => ({ ...f, birthSkipped: true }))}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#333', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                  {updateForm.birthSkipped ? '✓ Preferí no compartirlo' : 'Prefiero no decir →'}
                </button>
              )}
            </div>
            <button onClick={handleSaveUpdate}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: GOLD, border: 'none', color: '#000', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Guardar y continuar →
            </button>
          </div>
        )}

        {/* ── AUTH: Cliente conocido — banner bienvenida ────────────────── */}
        {step === 'datos' && authStep === 'returning' && (
          <div className="step-wrap">

            {/* Modal de edición de perfil */}
            {editingProfile && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
                <div style={{ background: '#0f0f0f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 28, border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
                  <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: 20 }}>✏️ Editar mis datos</div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>¿Cómo querés que te llamemos? *</label>
                    <input
                      value={editForm.nickname}
                      onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))}
                      placeholder="Tu apodo"
                      style={inputStyle}
                      autoFocus
                    />
                  </div>

                  {deliveryType === 'delivery' && (
                    <>
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Dirección</label>
                        <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle y número" style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input value={editForm.floor} onChange={e => setEditForm(f => ({ ...f, floor: e.target.value }))} placeholder="Piso / Depto" style={{ ...inputStyle, flex: 1 }} />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <input value={editForm.references} onChange={e => setEditForm(f => ({ ...f, references: e.target.value }))} placeholder="Referencias (portón, timbre...)" style={inputStyle} />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => setEditingProfile(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: '13px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={handleSaveProfile} style={{ flex: 2, background: GOLD, color: '#000', border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Banner bienvenida */}
            <div style={{ padding: '16px 18px', background: 'rgba(232,184,75,0.07)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>👋 ¡Hola {client.nickname || client.name?.split(' ')[0]}! Como estas?</div>
                <button onClick={handleResetAuth}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#444', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                  No soy yo
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', color: '#555' }}><FaWhatsapp style={{ display: 'inline', marginRight: 4 }} />{client.whatsapp}</div>
                <button onClick={openEditProfile}
                  style={{ background: 'none', border: 'none', color: GOLD, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                  ✏️ Editar datos
                </button>
              </div>
            </div>

            {/* Dirección guardada vs nueva (solo delivery) */}
            {deliveryType === 'delivery' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>¿Dónde enviamos hoy?</label>
                {client.address && (
                  <button onClick={() => setClient(c => ({ ...c, useAltAddress: false }))}
                    style={{ width: '100%', marginBottom: 8, padding: '12px 14px', borderRadius: 10, border: `2px solid ${!client.useAltAddress ? GOLD : 'rgba(255,255,255,0.08)'}`, background: !client.useAltAddress ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.03)', color: !client.useAltAddress ? GOLD : '#555', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    📍 {client.address}{client.floor ? `, ${client.floor}` : ''} {!client.useAltAddress ? '✓' : ''}
                  </button>
                )}
                <button onClick={() => setClient(c => ({ ...c, useAltAddress: true }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `2px solid ${client.useAltAddress ? GOLD : 'rgba(255,255,255,0.08)'}`, background: client.useAltAddress ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.03)', color: client.useAltAddress ? GOLD : '#555', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                  📍 Usar otra dirección {client.useAltAddress ? '✓' : ''}
                </button>
                {client.useAltAddress && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 10 }}><input value={client.altAddress || ''} onChange={e => setClient(c => ({ ...c, altAddress: e.target.value }))} placeholder="Calle y número" style={inputStyle} /></div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><input value={client.altFloor || ''} onChange={e => setClient(c => ({ ...c, altFloor: e.target.value }))} placeholder="Piso / Depto" style={{ ...inputStyle, flex: 1 }} /></div>
                    <input value={client.altReferences || ''} onChange={e => setClient(c => ({ ...c, altReferences: e.target.value }))} placeholder="Referencias (portón, timbre...)" style={inputStyle} />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notas del pedido</label>
              <textarea value={client.notes} onChange={e => setClient(c => ({ ...c, notes: e.target.value }))}
                placeholder={notesPlaceholder} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* ── AUTH: Cliente nuevo — form completo ──────────────────────── */}
        {step === 'datos' && authStep === 'new' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>Tus datos</div>
            <div style={{ color: '#555', fontSize: '0.82rem', marginBottom: 24 }}>Paso 2 de 3</div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>¿Cómo queres que te llamemos? *</label>
              <input value={client.nickname} onChange={e => setClient(c => ({ ...c, nickname: e.target.value }))}
                placeholder="Tu apodo" style={inputStyle} autoFocus />
              <div style={{ fontSize: '0.72rem', color: '#444', marginTop: 5 }}>Así te vamos a saludar en cada pedido 😊</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nombre y apellido completo *</label>
              <input value={client.name} onChange={e => setClient(c => ({ ...c, name: e.target.value }))}
                placeholder="Ej: Gianfranco Buzzelatto" style={inputStyle} />
            </div>

            {deliveryType === 'delivery' && (
              <>
                <div style={{ marginBottom: 10 }}><label style={labelStyle}>Dirección *</label><input value={client.address} onChange={e => setClient(c => ({ ...c, address: e.target.value }))} placeholder="Calle y número" style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><input value={client.floor} onChange={e => setClient(c => ({ ...c, floor: e.target.value }))} placeholder="Piso / Depto" style={{ ...inputStyle, flex: 1 }} /></div>
                <div style={{ marginBottom: 16 }}><input value={client.references} onChange={e => setClient(c => ({ ...c, references: e.target.value }))} placeholder="Referencias (portón verde, timbre 2B...)" style={inputStyle} /></div>
              </>
            )}

            {/* Cumpleaños */}
            <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(232,184,75,0.05)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: GOLD, marginBottom: 12 }}>🎂 ¿Cuándo es tu cumple? <span style={{ color: '#444', fontWeight: 400 }}>(opcional)</span></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" min={1} max={31} value={client.birthDay}
                  onChange={e => setClient(c => ({ ...c, birthDay: e.target.value, birthSkipped: false }))}
                  placeholder="Día" style={{ ...inputStyle, width: 80, textAlign: 'center' }} />
                <select value={client.birthMonth}
                  onChange={e => setClient(c => ({ ...c, birthMonth: e.target.value, birthSkipped: false }))}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">Mes</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#444', marginTop: 8 }}>Te mandamos un cupón de 15% de descuento el día de tu cumple 🎁</div>
              {!client.birthDay && !client.birthMonth && (
                <button onClick={() => setClient(c => ({ ...c, birthSkipped: true }))}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#333', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                  {client.birthSkipped ? '✓ Preferí no compartirlo' : 'Prefiero no decir →'}
                </button>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notas del pedido</label>
              <textarea value={client.notes} onChange={e => setClient(c => ({ ...c, notes: e.target.value }))}
                placeholder={notesPlaceholder} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* Paso 3: Pago */}
        {step === 'pago' && (
          <div className="step-wrap">
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginBottom: 4, letterSpacing: '-0.5px' }}>Pago y resumen</div>
            <div style={{ color: '#444', fontSize: '0.82rem', marginBottom: 24 }}>Paso 3 de 3</div>
            <div style={{ marginBottom: 24 }}>
              <div style={labelStyle}>Método de pago *</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ value: 'efectivo', label: '💵 Efectivo' }, { value: 'transferencia', label: '🏦 Transferencia' }].map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)} style={{ flex: 1, padding: '16px 12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', border: paymentMethod === m.value ? `2px solid ${GOLD}` : '2px solid rgba(255,255,255,0.08)', transition: 'all 0.2s', background: paymentMethod === m.value ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)', color: paymentMethod === m.value ? GOLD : '#555' }}>{m.label}</button>
                ))}
              </div>
              {paymentMethod === 'transferencia' && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(232,184,75,0.06)', borderRadius: 10, fontSize: '0.8rem', color: '#666', border: '1px solid rgba(232,184,75,0.12)' }}>📲 Enviá el comprobante por WhatsApp.{transferAlias && <span style={{ color: GOLD, fontWeight: 700, display: 'block', marginTop: 4 }}>Alias: {transferAlias}</span>}</div>}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>🎟️ Cupón de descuento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }} placeholder="Ej: JB-JANZ" style={{ ...inputStyle, border: `1px solid ${couponStatus?.valid ? 'rgba(34,197,94,0.4)' : couponStatus?.valid === false ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}` }} />
                <button onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()} style={{ background: 'rgba(232,184,75,0.1)', color: GOLD, border: '1px solid rgba(232,184,75,0.3)', padding: '10px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{validatingCoupon ? '...' : 'Aplicar'}</button>
              </div>
              {couponStatus && <div style={{ marginTop: 6, fontSize: '0.8rem', color: couponStatus.valid ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{couponStatus.valid ? '✅' : '❌'} {couponStatus.message}</div>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 18, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 700, marginBottom: 14, color: GOLD, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumen del pedido</div>
              {cart.map((i, idx) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}><span style={{ color: '#888' }}>{i.productName} {i.variant} ×{i.quantity}</span><span style={{ color: 'white', fontWeight: 600 }}>{fmt(i.unitPrice * i.quantity)}</span></div>
                  {(i.additionals || []).map((a, ai) => (<div key={ai} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#444', paddingLeft: 10, marginTop: 2 }}><span>+ {a.name} ×{a.quantity}</span><span>+ {fmt(a.unitPrice * a.quantity)}</span></div>))}
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 12, paddingTop: 12 }}>
                {(discount > 0 || deliveryCost > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4, color: '#444' }}><span>Subtotal</span><span>{fmt(subtotalBruto)}</span></div>}
                {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4, color: '#22c55e' }}><span>{couponStatus?.valid ? `🎟️ Cupón ${couponStatus.discountPercent}%` : `🎉 Descuento ${activeDiscountPercent}%`}</span><span>- {fmt(discount)}</span></div>}
                {deliveryType === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}><span style={{ color: deliveryCost === 0 ? '#22c55e' : '#444' }}>🛵 Delivery</span><span style={{ color: deliveryCost === 0 ? '#22c55e' : '#444', fontWeight: deliveryCost === 0 ? 700 : 400 }}>{deliveryCost === 0 ? '¡Gratis! 🎉' : fmt(deliveryCost)}</span></div>}
                {scheduledFor !== 'asap' && <div style={{ fontSize: '0.78rem', color: GOLD, marginBottom: 4 }}>⏰ Programado para las {scheduledFor}hs</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}><span style={{ fontWeight: 700, color: GOLD, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span><span style={{ color: 'white', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>{fmt(totalFinal)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Botón siguiente fijo */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px 28px', background: 'linear-gradient(to top, #080808 60%, transparent)', zIndex: 100 }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <button onClick={handleNextStep} disabled={submitting} style={{ width: '100%', background: GOLD, color: '#000', border: 'none', padding: '16px', borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontSize: '1rem', letterSpacing: '-0.2px' }}>
              {step === 'pago' ? `Confirmar pedido — ${fmt(totalFinal)}` : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render menú ────────────────────────────────────────────────────────────
  return (
    <>
      {showWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍔</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: GOLD, marginBottom: 4 }}>Bienvenido a Janz Burgers!</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Así funciona el sistema de pedidos</div>
            </div>
            {[
              { icon: '🍔', title: 'Elegí tus hamburguesas', desc: 'Navegá el menú y tocá "Agregar". Podés elegir Simple, Doble o Triple.' },
              { icon: '➕', title: 'Sumá adicionales', desc: 'Agregá extras como panceta, huevo, queso y más.' },
              { icon: '🛒', title: 'Revisá tu pedido', desc: 'Tocá el carrito para completar los datos en 3 pasos simples.' },
              { icon: '📱', title: 'Confirmá y listo', desc: 'Te avisamos por WhatsApp en cada paso de tu pedido.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,184,75,0.1)', border: `1px solid rgba(232,184,75,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
                <div><div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>{s.title}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', lineHeight: 1.5 }}>{s.desc}</div></div>
              </div>
            ))}
            <button onClick={closeWelcome} style={{ width: '100%', padding: '14px', background: GOLD, color: '#000', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>Empezar a pedir!</button>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <style>{css}</style>

        <div className="janz-hero">
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroBurger})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.3)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,8,0.1) 0%, rgba(8,8,8,0.5) 50%, #080808 100%)' }} />
          <div style={{ position: 'absolute', top: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <img src={logoJanz} alt="Janz" style={{ height: 56, objectFit: 'contain', opacity: 0.95 }} />
          </div>
          <div className="janz-hero-content">
            <div>
              <div style={{ fontSize: 'clamp(1.8rem, 7vw, 3.5rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-2px', color: 'white' }}>PEDÍ. DISFRUTÁ.<br /><span style={{ color: GOLD }}>REPETÍ.</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <a href="https://www.instagram.com/janz.burgers" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.75rem' }}><Instagram size={11} /> @janz.burgers</a>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: '0.75rem', color: open ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{open ? '● Abierto' : '● Cerrado'}</span>
                {schedule.days && schedule.days.length > 0 && (() => {
                  const DAY_NAMES = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
                  const ORDER = [1, 2, 3, 4, 5, 6, 0];
                  const names = ORDER.filter(d => schedule.days.map(Number).includes(d)).map(d => DAY_NAMES[d]);
                  return <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>● Dias de atencion: {names.join(', ')}</span>;
                })()}
              </div>
            </div>
          </div>
        </div>

        {prodeEnabled && (
          <div style={{ padding: '10px 16px 0' }}>
            <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, background: 'rgba(232,184,75,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏆</div>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: GOLD, lineHeight: 1 }}>Prode Mundial 2026</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Pronosticá y ganá premios</div></div>
              </div>
              <a href={`/prode-publico${clientId ? `?clientId=${clientId}` : ''}`} style={{ background: GOLD, color: '#000', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Jugar →</a>
            </div>
          </div>
        )}

        {dailyDeal && open && (() => {
          // Buscar el producto vinculado en el menú para poder agregarlo al carrito
          const linkedProduct = dailyDeal.productId
            ? allMenuProducts.find(p => p._id === dailyDeal.productId)
            : null;
          // Precio efectivo: usar discountPrice si hay descuento, si no el original
          const effectivePrice = dailyDeal.discountPrice > 0 ? dailyDeal.discountPrice : (dailyDeal.originalPrice || linkedProduct?.salePrice || 0);
          const promoProduct = linkedProduct
            ? { ...linkedProduct, salePrice: effectivePrice }
            : null;
          const inCart = promoProduct ? cart.find(i => i.product === promoProduct._id) : null;

          return (
            <div style={{ margin: '12px 16px 0', background: 'linear-gradient(135deg, rgba(232,184,75,0.12), rgba(232,184,75,0.04))', border: '1px solid rgba(232,184,75,0.35)', borderRadius: 14, padding: '16px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: '#E8B84B', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px', borderBottomLeftRadius: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }} className="deal-badge">
                🔥 PROMO
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {dailyDeal.image && <img src={dailyDeal.image} alt={dailyDeal.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(232,184,75,0.2)' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: '#E8B84B', fontSize: '1rem', letterSpacing: '-0.2px' }}>{dailyDeal.name || 'Promo del día'}</div>
                  {dailyDeal.description && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.4 }}>{dailyDeal.description}</div>}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    {dailyDeal.originalPrice > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textDecoration: 'line-through' }}>{fmt(dailyDeal.originalPrice)}</span>}
                    {dailyDeal.discountPrice > 0 && <span style={{ color: '#E8B84B', fontWeight: 900, fontSize: '1rem' }}>{fmt(dailyDeal.discountPrice)}</span>}
                    {dailyDeal.discountPercent > 0 && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>-{dailyDeal.discountPercent}%</span>}
                    {countdown && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>⏱ {countdown}</span>}
                  </div>
                </div>
              </div>
              {promoProduct && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  {inCart ? (
                    <>
                      <button onClick={() => removeFromCart(promoProduct._id)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button>
                      <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center', color: 'white', fontSize: '0.9rem' }}>{inCart.quantity}</span>
                      <button onClick={() => handleAddToCart(promoProduct)} style={{ width: 30, height: 30, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 800 }}>+</button>
                    </>
                  ) : (
                    <button onClick={() => handleAddToCart(promoProduct)} style={{ background: GOLD, color: '#000', border: 'none', padding: '8px 20px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}>
                      🛒 Agregar al pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {monthlyBurger && (() => {
          const linkedMonthly = monthlyBurger.productId
            ? allMenuProducts.find(p => p._id === monthlyBurger.productId)
            : null;
          const monthlyInCart = linkedMonthly ? cart.find(i => i.product === linkedMonthly._id) : null;

          return (
            <div style={{
              margin: '12px 16px 0',
              background: 'linear-gradient(135deg, rgba(129,140,248,0.10), rgba(129,140,248,0.03))',
              border: '1px solid rgba(129,140,248,0.3)',
              borderRadius: 16, overflow: 'hidden'
            }}>
              {/* Stripe superior */}
              <div style={{
                background: 'linear-gradient(90deg, rgba(129,140,248,0.35), rgba(99,102,241,0.25))',
                padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid rgba(129,140,248,0.15)'
              }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {monthlyBurger.badge || '🏆 Burger del Mes'}
                </span>
                {monthlyBurger.month && (
                  <span style={{ fontSize: '0.68rem', color: 'rgba(165,180,252,0.5)', marginLeft: 'auto' }}>
                    {monthlyBurger.month}
                  </span>
                )}
              </div>
              {/* Contenido */}
              <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                {monthlyBurger.image && (
                  <img
                    src={monthlyBurger.image}
                    alt={monthlyBurger.name}
                    style={{
                      width: 88, height: 88, borderRadius: 14, objectFit: 'cover',
                      flexShrink: 0, border: '2px solid rgba(129,140,248,0.25)'
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: 'white', fontSize: '1.05rem', letterSpacing: '-0.2px', lineHeight: 1.25 }}>
                    {monthlyBurger.name}
                  </div>
                  {monthlyBurger.description && (
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 5, lineHeight: 1.5 }}>
                      {monthlyBurger.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    {monthlyBurger.price > 0 && (
                      <div style={{ color: '#818cf8', fontWeight: 800, fontSize: '1rem' }}>
                        {fmt(monthlyBurger.price)}
                      </div>
                    )}
                    {linkedMonthly && open && (
                      monthlyInCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                          <button onClick={() => removeFromCart(linkedMonthly._id)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>−</button>
                          <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center', color: 'white' }}>{monthlyInCart.quantity}</span>
                          <button onClick={() => handleAddToCart(linkedMonthly)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#818cf8', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer', fontWeight: 800 }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => handleAddToCart(linkedMonthly)} style={{ background: 'rgba(129,140,248,0.2)', color: '#a5b4fc', border: '1px solid rgba(129,140,248,0.35)', padding: '8px 16px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', marginLeft: 'auto' }}>
                          🛒 Pedir
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {!open && <div style={{ margin: '10px 16px 0', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>🔴 En este momento no estamos tomando pedidos</div>}

        {showPushBanner && !pushGranted && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
            <div style={{ background: '#0f0f0f', borderRadius: 20, width: '100%', maxWidth: 360, padding: '36px 28px', border: '1px solid rgba(232,184,75,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: GOLD, marginBottom: 8, lineHeight: 1.2 }}>¿Querés recibir notificaciones?</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 28 }}>
                Enterate de promos exclusivas, descuentos y novedades de Janz Burgers antes que nadie 🍔
              </div>
              <button
                onClick={() => { setShowPushBanner(false); requestPushPermission(); }}
                style={{ width: '100%', background: GOLD, color: '#000', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', marginBottom: 10 }}>
                🔔 Sí, activar notificaciones
              </button>
              <button
                onClick={() => { setShowPushBanner(false); try { localStorage.setItem('janz_push_dismissed', '1'); } catch {} }}
                style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', padding: '12px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                Ahora no
              </button>
            </div>
          </div>
        )}

        {navItems.length > 1 && (
          <div className="sticky-nav">
            {navItems.map(item => (
              <button key={item.key} className={`nav-pill ${activeSection === item.key ? 'active' : ''}`} onClick={() => scrollToSection(item.key)}>{item.label}</button>
            ))}
          </div>
        )}

        {additionalsModal && <AdditionalsModal product={additionalsModal} availableAdditionals={availableAdditionals} onConfirm={handleAdditionalsConfirm} onClose={() => setAdditionalsModal(null)} />}

        <div className="janz-menu-wrap">
          <div className="janz-desktop-layout">
            <div className="janz-menu-col" style={{ padding: '8px 16px 0' }}>
              {hasBurgers && <div ref={el => sectionRefs.current['burgers'] = el} data-section="burgers"><SectionHeader label="Hamburguesas" />{menuGroups.filter(g => g.productType === 'burger').map(g => <ProductCard key={g.name} name={g.name} variants={g.variants} />)}</div>}
              {hasPapas   && <div ref={el => sectionRefs.current['papas'] = el} data-section="papas"><SectionHeader label="Papas" />{menuGroups.filter(g => g.productType === 'papas').map(g => <ProductCard key={g.name} name={g.name} variants={g.variants} />)}</div>}
              {hasOtros   && <div ref={el => sectionRefs.current['otros'] = el} data-section="otros"><SectionHeader label="Otros" />{menuGroups.filter(g => g.productType !== 'burger' && g.productType !== 'papas').map(g => <ProductCard key={g.name} name={g.name} variants={g.variants} />)}</div>}
              {hasAdds && (
                <div ref={el => sectionRefs.current['adicionales'] = el} data-section="adicionales">
                  <SectionHeader label="Adicionales" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {availableAdditionals.map(add => (
                      <div key={add._id} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><span style={{ color: '#888', fontWeight: 600, fontSize: '0.88rem' }}>{add.emoji} {add.name}</span>{add.description && <span style={{ color: '#2a2a2a', fontSize: '0.75rem', marginLeft: 8 }}>{add.description}</span>}</div>
                        <span style={{ color: GOLD, fontWeight: 700, fontSize: '0.9rem' }}>{fmt(add.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'center', padding: '24px 0 12px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 8 }}>
                <img src={logoJanz} alt="Janz" style={{ height: 36, display: 'block', margin: '0 auto 10px', opacity: 0.2 }} />
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', letterSpacing: '0.05em', marginBottom: 6 }}>Pedí, Disfrutá, Repetí.</div>
                <a href="https://www.instagram.com/janz.burgers" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.15)', textDecoration: 'none', fontSize: '0.7rem' }}><Instagram size={10} /> @janz.burgers</a>
              </div>
            </div>

            <div className="janz-sidebar">
              <div style={{ position: 'sticky', top: 60 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Tu pedido</div>
                <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
                  {cart.length === 0 ? <div style={{ color: '#222', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Agregá productos para empezar</div> : (
                    <>
                      {cart.map((item, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><div><div style={{ fontSize: '0.85rem', color: '#aaa' }}>{item.productName} {item.variant}</div><div style={{ fontSize: '0.75rem', color: '#444', marginTop: 2 }}>×{item.quantity}</div></div><div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{fmt(itemTotal(item))}</div></div>))}
                      {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#22c55e', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><span>Descuento {activeDiscountPercent}%</span><span>- {fmt(discount)}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 }}><span style={{ fontWeight: 700, color: GOLD, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span><span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{fmt(subtotalConDescuento)}</span></div>
                      <button onClick={() => setStep('entrega')} style={{ width: '100%', background: GOLD, color: '#000', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', marginTop: 12 }}>Continuar →</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="janz-cart-float" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
            <button onClick={() => setStep('entrega')} style={{ background: GOLD, color: '#000', border: 'none', padding: '14px 28px', borderRadius: 100, fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 6px 24px rgba(232,184,75,0.35)', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
              🛒 Ver pedido ({cart.reduce((s, i) => s + i.quantity, 0)}) — {fmt(subtotalConDescuento)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}