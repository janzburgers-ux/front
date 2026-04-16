import { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, MapPin, Clock, CreditCard, Users, Star, DollarSign, FileText, Lock, Target, MessageCircle, Zap, Calendar } from 'lucide-react';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

// ─── Sección genérica ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Icon size={18} color="var(--gold)" />
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Config() {
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  // formularios locales
  const [alias, setAlias] = useState('');
  const [notesPlaceholder, setNotesPlaceholder] = useState('Aclaraciones...');
  const [deleteOrderPassword, setDeleteOrderPassword] = useState('janz2024');
  const [schedule, setSchedule] = useState({ days: [5, 6, 0], openHour: '19:00', closeHour: '23:00' });
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({ name: '', cost: '', freeFrom: '', deliveryMinutes: '' });
  const [loyalty, setLoyalty] = useState({ enabled: false, pointsPerPeso: 1, redeemThreshold: 500, couponPercent: 10 });
  const [fixedExpenses, setFixedExpenses] = useState({ luz: 0, gas: 0, agua: 0, alquiler: 0, otros: 0 });
  const [costingParams, setCostingParams] = useState({ avgBurgersPerDay: 30, deliveryCostPerShift: 0 });
  const [hourlyDiscount, setHourlyDiscount] = useState({ enabled: false, discountPercent: 10, fromHour: '18:00', toHour: '20:00', couponCode: 'TEMPRANO' });
  const [orderLimits, setOrderLimits] = useState({ enabled: false, dailyMax: 50 });
  const [maxOrdersPerSlot, setMaxOrdersPerSlot] = useState(5);

  // ── Objetivos de Caja ─────────────────────────────────────────────────────
  const [cajaGoals, setCajaGoals] = useState({
    dia:   { money: 0, burgers: 0, orders: 0, newClients: 0, returningClients: 0, avgTicket: 0, coupons: 0 },
    finde: { money: 0, burgers: 0, orders: 0, newClients: 0, returningClients: 0, avgTicket: 0, coupons: 0 },
    mes:   { money: 0, burgers: 0, orders: 0, newClients: 0, returningClients: 0, avgTicket: 0, coupons: 0 },
    año:   { money: 0, burgers: 0, orders: 0, newClients: 0, returningClients: 0, avgTicket: 0, coupons: 0 }
  });

  // ── Sistema de reseñas ────────────────────────────────────────────────────
  const [reviewSettings, setReviewSettings] = useState({
    enabled: true, sendMode: 'auto', orderInterval: 1,
    incentiveType: 'discount', discountPercent: 10,
    productId: null, productName: 'Papas fritas', validDays: 30, waitMinutes: 10
  });
  const [products, setProducts] = useState([]);

  // ── Hamburguesa del día ───────────────────────────────────────────────────
  const [dailyDeal, setDailyDeal] = useState({
    enabled: false, name: '', description: '', originalPrice: 0,
    discountPrice: 0, discountPercent: 0, fromHour: '19:00', toHour: '21:00',
    image: '', productId: null
  });

  // ── Hamburguesa del mes ───────────────────────────────────────────────────
  const [monthlyBurger, setMonthlyBurger] = useState({
    enabled: false, name: '', description: '', price: 0,
    image: '', badge: '🏆 Del mes', month: ''
  });

  useEffect(() => {
    Promise.all([API.get('/config'), API.get('/auth/users'), API.get('/products').catch(() => ({ data: [] }))])
      .then(([cfgRes, usersRes, prodRes]) => {
        setProducts(prodRes.data || []);
        const cfg = cfgRes.data;
        setConfig(cfg);
        setAlias(cfg.transferAlias || '');
        setNotesPlaceholder(cfg.notesPlaceholder || 'Aclaraciones, alergias...');
        const rawSchedule = cfg.schedule || { days: [5, 6, 0], openHour: '19:00', closeHour: '23:00' };
        // Compatibilidad: si viene como número (viejo formato), convertir a string
        const toTimeStr = v => {
          if (typeof v === 'string' && v.includes(':')) return v;
          return `${String(Number(v) || 0).padStart(2,'0')}:00`;
        };
        setSchedule({
          days: (rawSchedule.days || []).map(Number),
          openHour: toTimeStr(rawSchedule.openHour),
          closeHour: toTimeStr(rawSchedule.closeHour),
        });
        setZones(cfg.zones || []);
        setLoyalty(cfg.loyalty || { enabled: false, pointsPerPeso: 1, redeemThreshold: 500, couponPercent: 10 });
        setFixedExpenses(cfg.fixedExpenses || { luz: 0, gas: 0, agua: 0, alquiler: 0, otros: 0 });
        setCostingParams(cfg.costingParams || { avgBurgersPerDay: 30, deliveryCostPerShift: 0 });
        setUsers(usersRes.data || []);
        if (cfg.maxOrdersPerSlot) setMaxOrdersPerSlot(cfg.maxOrdersPerSlot);
        if (cfg.orderLimits) setOrderLimits(cfg.orderLimits);
        if (cfg.hourlyDiscount) setHourlyDiscount(cfg.hourlyDiscount);
        if (cfg.cajaGoals) setCajaGoals(cfg.cajaGoals);
        if (cfg.reviewSettings) setReviewSettings(cfg.reviewSettings);
        if (cfg.dailyDeal) setDailyDeal(cfg.dailyDeal);
        if (cfg.monthlyBurger) setMonthlyBurger(cfg.monthlyBurger);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Alias ─────────────────────────────────────────────────────────────────
  const saveAlias = async () => {
    setSaving('alias');
    try {
      await API.put('/config/transfer-alias', { transferAlias: alias });
      toast.success('Alias guardado');
    } catch { toast.error('Error al guardar alias'); }
    finally { setSaving(''); }
  };

  // ── Notes Placeholder ─────────────────────────────────────────────────────
  const saveNotesPlaceholder = async () => {
    setSaving('notes');
    try {
      await API.put('/config/notesPlaceholder', { value: notesPlaceholder });
      toast.success('Placeholder guardado');
    } catch { toast.error('Error al guardar placeholder'); }
    finally { setSaving(''); }
  };

  // ── Horario ───────────────────────────────────────────────────────────────
  const toggleDay = (d) => {
    setSchedule(s => ({
      ...s,
      days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d]
    }));
  };

  const saveSchedule = async () => {
    setSaving('schedule');
    try {
      await API.put('/config/schedule', { schedule });
      toast.success('Horario guardado');
    } catch { toast.error('Error al guardar horario'); }
    finally { setSaving(''); }
  };

  // ── Zonas ─────────────────────────────────────────────────────────────────
  const addZone = async () => {
    if (!newZone.name.trim()) return toast.error('Ingresá el nombre del barrio');
    setSaving('zone');
    try {
      const res = await API.post('/config/zones', newZone);
      setZones(z => [...z, res.data]);
      setNewZone({ name: '', cost: '', freeFrom: '', deliveryMinutes: '' });
      toast.success('Zona agregada');
    } catch { toast.error('Error al agregar zona'); }
    finally { setSaving(''); }
  };

  const deleteZone = async (id) => {
    try {
      await API.delete(`/config/zones/${id}`);
      setZones(z => z.filter(x => x.id !== id));
      toast.success('Zona eliminada');
    } catch { toast.error('Error al eliminar zona'); }
  };

  const updateZoneField = (id, field, value) => {
    setZones(z => z.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const saveZone = async (zone) => {
    try {
      await API.put(`/config/zones/${zone.id}`, zone);
      toast.success('Zona actualizada');
    } catch { toast.error('Error al guardar zona'); }
  };

  // ── Gastos fijos y parámetros de escandallo ───────────────────────────────
  const saveHourlyDiscount = async () => {
    setSaving('hourly');
    try { await API.put('/config/hourlyDiscount', { value: hourlyDiscount }); toast.success('Descuento horario guardado'); }
    catch { toast.error('Error al guardar'); }
    finally { setSaving(''); }
  };

  const saveFixedExpenses = async () => {
    setSaving('fixed');
    try {
      await API.put('/config/fixed-expenses', { fixedExpenses });
      await API.put('/config/costing-params', { costingParams });
      toast.success('Gastos fijos guardados y escandallo recalculado ✓');
    } catch { toast.error('Error al guardar gastos fijos'); }
    finally { setSaving(''); }
  };

  // ── Fidelización ─────────────────────────────────────────────────────────
  const saveLoyalty = async () => {
    setSaving('loyalty');
    try {
      await API.put('/config/loyalty', { loyalty });
      toast.success('Fidelización guardada');
    } catch { toast.error('Error al guardar fidelización'); }
    finally { setSaving(''); }
  };

  // ── % Ganancias por persona ───────────────────────────────────────────────
  const updateProfitShare = async (userId, value) => {
    try {
      await API.put(`/users/${userId}`, { profitShare: Number(value) });
      setUsers(u => u.map(x => x._id === userId ? { ...x, profitShare: Number(value) } : x));
      toast.success('% actualizado');
    } catch { toast.error('Error al actualizar'); }
  };

  const totalShares = users.filter(u => u.active).reduce((s, u) => s + (u.profitShare || 0), 0);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  );

  return (
    <>
      <div className="page-header">
        <h1>Configuración</h1>
      </div>
      <div className="page-body">

        {/* ── Alias de transferencia ─────────────────────────────────────── */}
        <Section title="Transferencia" icon={CreditCard}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            Este alias aparece en el mensaje de WhatsApp cuando el cliente elige transferencia.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="ej: janz.burgers o CVU/CBU"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={saveAlias} disabled={saving === 'alias'}>
              <Save size={15} /> {saving === 'alias' ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Section>

        {/* ── Formulario de pedido ───────────────────────────────────────── */}
        <Section title="Formulario de pedido" icon={FileText}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            Texto de ayuda que aparece en el campo "Notas del pedido" del formulario público.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={notesPlaceholder}
              onChange={e => setNotesPlaceholder(e.target.value)}
              placeholder="Aclaraciones, alergias..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={saveNotesPlaceholder} disabled={saving === 'notes'}>
              <Save size={15} /> {saving === 'notes' ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Section>

        {/* ── Horario de atención ────────────────────────────────────────── */}
        <Section title="Horario de atención" icon={Clock}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            La página de pedidos se activa y desactiva automáticamente según este horario.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--gray)', display: 'block', marginBottom: 8 }}>DÍAS OPERATIVOS</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`btn btn-sm ${schedule.days.includes(i) ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Hora de apertura</label>
              <select value={schedule.openHour} onChange={e => setSchedule(s => ({ ...s, openHour: e.target.value }))}>
                {Array.from({ length: 24 * 4 }, (_, i) => {
                  const h = Math.floor(i / 4);
                  const m = (i % 4) * 15;
                  const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label>Hora de cierre</label>
              <select value={schedule.closeHour} onChange={e => setSchedule(s => ({ ...s, closeHour: e.target.value }))}>
                {Array.from({ length: 24 * 4 }, (_, i) => {
                  const h = Math.floor(i / 4);
                  const m = (i % 4) * 15;
                  const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveSchedule} disabled={saving === 'schedule'}>
            <Save size={15} /> {saving === 'schedule' ? 'Guardando...' : 'Guardar horario'}
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 12 }}>
            🕐 Límite por slot horario
          </div>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            Cuántos pedidos programados puede recibir cada slot de 30 minutos. Cuando se llena, ese horario aparece como "Completo" para el cliente.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label>Máx. pedidos por slot (0 = sin límite)</label>
              <input
                type="number" min="0" max="50"
                value={maxOrdersPerSlot}
                onChange={e => setMaxOrdersPerSlot(Number(e.target.value))}
                placeholder="Ej: 5"
              />
            </div>
            <button className="btn btn-primary" onClick={async () => {
              setSaving('maxSlot');
              try {
                await API.put('/config/max-orders-per-slot', { value: maxOrdersPerSlot });
                toast.success('Límite por slot guardado');
              } catch { toast.error('Error al guardar'); }
              finally { setSaving(''); }
            }} disabled={saving === 'maxSlot'}>
              <Save size={15} /> {saving === 'maxSlot' ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Section>

        {/* ── Zonas de delivery ──────────────────────────────────────────── */}
        <Section title="Zonas de delivery" icon={MapPin}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 16 }}>
            Configurá los barrios a los que hacen delivery, el costo de envío y desde qué monto el envío es gratis.
          </p>

          {/* Lista de zonas existentes */}
          {zones.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {zones.map(zone => (
                <div key={zone.id} style={{ marginBottom: 10, background: 'var(--dark)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input
                    value={zone.name}
                    onChange={e => updateZoneField(zone.id, 'name', e.target.value)}
                    placeholder="Nombre del barrio"
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>Costo $</div>
                      <input type="number" value={zone.cost} onChange={e => updateZoneField(zone.id, 'cost', Number(e.target.value))} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>Gratis desde $</div>
                      <input type="number" value={zone.freeFrom} onChange={e => updateZoneField(zone.id, 'freeFrom', Number(e.target.value))} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>Delivery (min)</div>
                      <input type="number" value={zone.deliveryMinutes || ''} onChange={e => updateZoneField(zone.id, 'deliveryMinutes', Number(e.target.value))} placeholder="15" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => saveZone(zone)}><Save size={13} /> Guardar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteZone(zone.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Agregar zona nueva */}
          <div style={{ background: 'var(--dark)', padding: 16, borderRadius: 8, border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 12, fontWeight: 600 }}>AGREGAR ZONA</div>
            <div className="form-group">
              <label>Barrio</label>
              <input value={newZone.name} onChange={e => setNewZone(z => ({ ...z, name: e.target.value }))} placeholder="ej: Villa Crespo" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Costo $</label>
                <input type="number" value={newZone.cost} onChange={e => setNewZone(z => ({ ...z, cost: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Gratis desde $</label>
                <input type="number" value={newZone.freeFrom} onChange={e => setNewZone(z => ({ ...z, freeFrom: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Delivery (min)</label>
                <input type="number" value={newZone.deliveryMinutes} onChange={e => setNewZone(z => ({ ...z, deliveryMinutes: e.target.value }))} placeholder="15" />
              </div>
            </div>
            <button className="btn btn-primary w-full" onClick={addZone} disabled={saving === 'zone'}>
              <Plus size={15} /> Agregar zona
            </button>
          </div>
        </Section>

        {/* ── % Ganancias por persona ────────────────────────────────────── */}
        <Section title="Distribución de ganancias" icon={Users}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 16 }}>
            Asigná el porcentaje de la ganancia neta para cada persona. El total no debería superar el 100%.
          </p>
          <div style={{ marginBottom: 8 }}>
            {users.filter(u => u.active).map(u => (
              <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, background: 'var(--dark)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div className="user-avatar" style={{ flexShrink: 0 }}>{u.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{u.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={u.profitShare || 0}
                    onChange={e => setUsers(us => us.map(x => x._id === u._id ? { ...x, profitShare: Number(e.target.value) } : x))}
                    style={{ width: 70 }}
                  />
                  <span style={{ color: 'var(--gray)' }}>%</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => updateProfitShare(u._id, u.profitShare || 0)}>
                    <Save size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: totalShares > 100 ? '#ef4444' : 'var(--gray)' }}>
            Total asignado: <strong style={{ color: totalShares > 100 ? '#ef4444' : 'var(--gold)' }}>{totalShares}%</strong>
            {totalShares > 100 && ' — ⚠️ supera el 100%'}
          </div>
        </Section>

        {/* ── Escandallo detallado ───────────────────────────────────────── */}
        <Section title="Escandallo detallado" icon={DollarSign}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 20 }}>
            Cargá tus gastos fijos mensuales en $ reales. El sistema los distribuye automáticamente
            por jornada y por hamburguesa para calcular el <strong style={{ color: 'white' }}>costo real de cada producto</strong>.
          </p>

          {/* Gastos fijos mensuales */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 12 }}>
              🏠 Gastos fijos del mes (en $)
            </div>
            <div className="grid-3">
              {[
                { key: 'luz', label: '💡 Luz' },
                { key: 'gas', label: '🔥 Gas' },
                { key: 'agua', label: '💧 Agua' },
                { key: 'alquiler', label: '🏠 Alquiler' },
                { key: 'otros', label: '📦 Otros' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    type="number"
                    value={fixedExpenses[f.key] || 0}
                    onChange={e => setFixedExpenses(fe => ({ ...fe, [f.key]: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginTop: 4 }}>
              Total mensual: <strong style={{ color: 'var(--gold)' }}>
                ${Object.values(fixedExpenses).reduce((s, v) => s + Number(v || 0), 0).toLocaleString('es-AR')}
              </strong>
            </div>
          </div>

          {/* Parámetros de distribución */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 12 }}>
              📊 Parámetros de distribución
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Promedio de hamburguesas por jornada</label>
                <input
                  type="number"
                  value={costingParams.avgBurgersPerDay}
                  onChange={e => setCostingParams(p => ({ ...p, avgBurgersPerDay: Number(e.target.value) }))}
                  min={1}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                  El costo fijo por burger = total mensual ÷ jornadas ÷ este número
                </span>
              </div>
              <div className="form-group">
                <label>🛵 Costo del delivery por jornada ($)</label>
                <input
                  type="number"
                  value={costingParams.deliveryCostPerShift}
                  onChange={e => setCostingParams(p => ({ ...p, deliveryCostPerShift: Number(e.target.value) }))}
                  min={0}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                  Sueldo o viático del delivery repartido entre las hamburguesas de esa noche
                </span>
              </div>
            </div>
          </div>

          {/* Preview del cálculo */}
          {config && (
            <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 10 }}>
                Preview de distribución (mes actual)
              </div>
              {(() => {
                const totalFixed = Object.values(fixedExpenses).reduce((s, v) => s + Number(v || 0), 0);
                const opDays = config.operationalDaysThisMonth || 0;
                const perDay = opDays > 0 ? Math.round(totalFixed / opDays) : 0;
                const perBurger = costingParams.avgBurgersPerDay > 0 ? Math.round(perDay / costingParams.avgBurgersPerDay) : 0;
                const deliveryPerBurger = costingParams.avgBurgersPerDay > 0 ? Math.round((costingParams.deliveryCostPerShift || 0) / costingParams.avgBurgersPerDay) : 0;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: '0.82rem' }}>
                    {[
                      { label: 'Jornadas este mes', value: opDays },
                      { label: 'Gasto fijo por jornada', value: `$${perDay.toLocaleString('es-AR')}` },
                      { label: '🏠 Fijos por burger', value: `$${perBurger.toLocaleString('es-AR')}` },
                      { label: '🛵 Delivery por burger', value: `$${deliveryPerBurger.toLocaleString('es-AR')}` },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--gray)', fontSize: '0.68rem', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          <button className="btn btn-primary" onClick={saveFixedExpenses} disabled={saving === 'fixed'}>
            <Save size={15} /> {saving === 'fixed' ? 'Guardando y recalculando...' : 'Guardar y recalcular escandallo'}
          </button>
        </Section>

        {/* ── Descuento por franja horaria ── */}
        <Section title="Descuento por franja horaria" icon={Clock}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${hourlyDiscount.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>⏰ Descuento automático por horario</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                Los pedidos que lleguen en el horario configurado reciben descuento automático
              </div>
            </div>
            <button
              className={`btn btn-sm ${hourlyDiscount.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHourlyDiscount(h => ({ ...h, enabled: !h.enabled }))}>
              {hourlyDiscount.enabled ? '🟢 Activo' : '⚪ Inactivo'}
            </button>
          </div>

          <div style={{ opacity: hourlyDiscount.enabled ? 1 : 0.4, pointerEvents: hourlyDiscount.enabled ? 'auto' : 'none' }}>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Desde (hora)</label>
                <input type="time" value={hourlyDiscount.fromHour}
                  onChange={e => setHourlyDiscount(h => ({ ...h, fromHour: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Hasta (hora)</label>
                <input type="time" value={hourlyDiscount.toHour}
                  onChange={e => setHourlyDiscount(h => ({ ...h, toHour: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>% de descuento</label>
              <input type="number" min={1} max={50} value={hourlyDiscount.discountPercent}
                onChange={e => setHourlyDiscount(h => ({ ...h, discountPercent: Number(e.target.value) }))} />
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--green)', marginBottom: 14 }}>
              💡 Pedidos entre las {hourlyDiscount.fromHour} y las {hourlyDiscount.toHour} reciben {hourlyDiscount.discountPercent}% off automáticamente — sin necesidad de cupón.
            </div>
          </div>

          <button className="btn btn-primary" onClick={saveHourlyDiscount} disabled={saving === 'hourly'}>
            <Save size={15} /> {saving === 'hourly' ? 'Guardando...' : 'Guardar descuento horario'}
          </button>
        </Section>

        {/* ── Fidelización ──────────────────────────────────────────────── */}
        <Section title="Sistema de fidelización" icon={Star}>
          {/* Switch puntos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${loyalty.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>🏆 Puntos por compra</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                {loyalty.enabled ? 'Los clientes acumulan puntos y reciben cupones automáticos' : 'Activalo cuando tengas datos de ventas suficientes'}
              </div>
            </div>
            <button
              className={`btn btn-sm ${loyalty.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLoyalty(l => ({ ...l, enabled: !l.enabled }))}
            >
              {loyalty.enabled ? '🟢 Activo' : '⚪ Inactivo'}
            </button>
          </div>

          <div className="grid-3" style={{ marginBottom: 16, opacity: loyalty.enabled ? 1 : 0.4, pointerEvents: loyalty.enabled ? 'auto' : 'none' }}>
            <div className="form-group">
              <label>Puntos por cada $</label>
              <input type="number" value={loyalty.pointsPerPeso}
                onChange={e => setLoyalty(l => ({ ...l, pointsPerPeso: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>ej: 100 → 1 punto cada $100</span>
            </div>
            <div className="form-group">
              <label>Umbral de canje (pts)</label>
              <input type="number" value={loyalty.redeemThreshold}
                onChange={e => setLoyalty(l => ({ ...l, redeemThreshold: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>puntos para obtener cupón</span>
            </div>
            <div className="form-group">
              <label>Descuento del cupón (%)</label>
              <input type="number" value={loyalty.couponPercent}
                onChange={e => setLoyalty(l => ({ ...l, couponPercent: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>% de descuento al canjear</span>
            </div>
          </div>

          {/* Separador */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Switch referidos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${loyalty.referralEnabled ? 'rgba(129,140,248,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>🔗 Sistema de referidos</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                {loyalty.referralEnabled
                  ? 'El dueño del cupón recibe una recompensa cuando alguien lo usa'
                  : 'Activalo para incentivar que tus clientes recomienden el negocio'}
              </div>
            </div>
            <button
              className={`btn btn-sm ${loyalty.referralEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLoyalty(l => ({ ...l, referralEnabled: !l.referralEnabled }))}
            >
              {loyalty.referralEnabled ? '🟢 Activo' : '⚪ Inactivo'}
            </button>
          </div>

          <div className="grid-2" style={{ marginBottom: 20, opacity: loyalty.referralEnabled ? 1 : 0.4, pointerEvents: loyalty.referralEnabled ? 'auto' : 'none' }}>
            <div className="form-group">
              <label>Recompensa al dueño del cupón (%)</label>
              <input type="number" value={loyalty.referralRewardPercent || 5}
                onChange={e => setLoyalty(l => ({ ...l, referralRewardPercent: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>% del pedido que gana el cliente estrella</span>
            </div>
            <div className="form-group">
              <label>Descuento para el cliente nuevo (%)</label>
              <input type="number" value={loyalty.referralDiscountForNew || 10}
                onChange={e => setLoyalty(l => ({ ...l, referralDiscountForNew: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>% de descuento en el primer pedido</span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={saveLoyalty} disabled={saving === 'loyalty'}>
            <Save size={15} /> {saving === 'loyalty' ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </Section>

        <Section title="Límite de pedidos" icon={Clock}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            Limitá la cantidad de pedidos por día para no saturar la cocina.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${orderLimits.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>🎯 Límite diario de pedidos</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>Si se alcanza el límite, el formulario se cierra automáticamente</div>
            </div>
            <button className={`btn btn-sm ${orderLimits.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setOrderLimits(l => ({ ...l, enabled: !l.enabled }))}>
              {orderLimits.enabled ? '🟢 Activo' : '⚪ Inactivo'}
            </button>
          </div>
          <div style={{ opacity: orderLimits.enabled ? 1 : 0.4, pointerEvents: orderLimits.enabled ? 'auto' : 'none' }}>
            <div className="form-group">
              <label>Máximo de pedidos por día</label>
              <input type="number" value={orderLimits.dailyMax} min={1}
                onChange={e => setOrderLimits(l => ({ ...l, dailyMax: Number(e.target.value) }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={async () => {
            setSaving('orderLimits');
            try { await API.put('/config/orderLimits', { value: orderLimits }); toast.success('Límites guardados'); }
            catch { toast.error('Error al guardar'); }
            finally { setSaving(''); }
          }} disabled={saving === 'orderLimits'}>
            <Save size={15} /> {saving === 'orderLimits' ? 'Guardando...' : 'Guardar límites'}
          </button>
        </Section>


        {/* ── Objetivos de Caja ───────────────────────────────────────────── */}
        <Section title="Objetivos de Caja" icon={Target}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 20 }}>
            Definí metas por período. Las que quedes en 0 no se muestran en Caja Global.
          </p>
          {[
            { key: 'dia',   label: '📅 Por día' },
            { key: 'finde', label: '🍔 Por finde (Vie–Dom)' },
            { key: 'mes',   label: '📆 Por mes' },
            { key: 'año',   label: '🗓️ Por año' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{label}</div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                {[
                  { field: 'money',            label: '💰 Recaudación ($)',      type: 'number' },
                  { field: 'burgers',          label: '🍔 Hamburguesas',         type: 'number' },
                  { field: 'orders',           label: '📦 Pedidos',              type: 'number' },
                  { field: 'newClients',       label: '👤 Clientes nuevos',      type: 'number' },
                  { field: 'returningClients', label: '🔁 Clientes recurrentes', type: 'number' },
                  { field: 'avgTicket',        label: '⭐ Ticket promedio ($)',   type: 'number' },
                  { field: 'coupons',          label: '🏷️ Cupones canjeados',    type: 'number' },
                ].map(({ field, label: lbl }) => (
                  <div key={field}>
                    <label className="form-label">{lbl}</label>
                    <input type="number" min={0}
                      value={cajaGoals[key]?.[field] || 0}
                      onChange={e => setCajaGoals(g => ({ ...g, [key]: { ...g[key], [field]: Number(e.target.value) } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-primary" disabled={saving === 'cajaGoals'}
            onClick={async () => {
              setSaving('cajaGoals');
              try { await API.put('/config/cajaGoals', { value: cajaGoals }); toast.success('Objetivos guardados'); }
              catch { toast.error('Error al guardar'); }
              finally { setSaving(''); }
            }}>
            <Save size={15} /> {saving === 'cajaGoals' ? 'Guardando...' : 'Guardar objetivos'}
          </button>
        </Section>

        {/* ── Sistema de reseñas ──────────────────────────────────────────── */}
        <Section title="Sistema de reseñas" icon={MessageCircle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${reviewSettings.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 700, color: reviewSettings.enabled ? 'var(--gold)' : 'var(--gray)', marginBottom: 2 }}>
                {reviewSettings.enabled ? '🟢 Activo' : '⚪ Inactivo'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>
                {reviewSettings.enabled ? 'Se envía WhatsApp automático al entregar cada pedido' : 'No se solicitan reseñas'}
              </div>
            </div>
            <button className={`btn btn-sm ${reviewSettings.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReviewSettings(r => ({ ...r, enabled: !r.enabled }))}>
              {reviewSettings.enabled ? 'Desactivar' : 'Activar'}
            </button>
          </div>

          <div style={{ opacity: reviewSettings.enabled ? 1 : 0.4, pointerEvents: reviewSettings.enabled ? 'auto' : 'none' }}>
            {/* Modo de envío */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">📤 Modo de envío</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['auto', '🤖 Automático'], ['manual', '✋ Manual']].map(([v, l]) => (
                  <button key={v} onClick={() => setReviewSettings(r => ({ ...r, sendMode: v }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', border: `1px solid ${reviewSettings.sendMode === v ? 'rgba(232,184,75,0.6)' : 'var(--border)'}`, background: reviewSettings.sendMode === v ? 'rgba(232,184,75,0.1)' : 'var(--dark)', color: reviewSettings.sendMode === v ? 'var(--gold)' : 'var(--gray)', transition: 'all 0.15s' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 6 }}>
                {reviewSettings.sendMode === 'auto'
                  ? '🤖 Se envía solo cuando el pedido se marca como entregado'
                  : '✋ El sistema NO envía automáticamente. Vos elegís cuándo mandar desde la pantalla del pedido'}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="form-label">⏱️ Minutos de espera post-entrega</label>
                <input type="number" min={1} max={120} value={reviewSettings.waitMinutes}
                  onChange={e => setReviewSettings(r => ({ ...r, waitMinutes: Number(e.target.value) }))}
                  disabled={reviewSettings.sendMode === 'manual'} />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Tiempo que espera antes de mandar el WA</div>
              </div>
              <div>
                <label className="form-label">🔁 Enviar cada X pedidos del cliente</label>
                <input type="number" min={1} max={50} value={reviewSettings.orderInterval}
                  onChange={e => setReviewSettings(r => ({ ...r, orderInterval: Math.max(1, Number(e.target.value)) }))}
                  disabled={reviewSettings.sendMode === 'manual'} />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
                  {reviewSettings.orderInterval === 1
                    ? 'Se envía en cada pedido entregado'
                    : `Se envía cada ${reviewSettings.orderInterval} pedidos (pedidos 5, 10, 15...)`}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
                <label className="form-label">🎁 Tipo de incentivo</label>
                <select value={reviewSettings.incentiveType}
                  onChange={e => setReviewSettings(r => ({ ...r, incentiveType: e.target.value }))}
                  style={{ width: '100%' }}>
                  <option value="discount">% Descuento en próximo pedido</option>
                  <option value="product">Producto gratis</option>
                  <option value="none">Sin incentivo</option>
                </select>
            </div>

            {reviewSettings.incentiveType === 'discount' && (
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label className="form-label">% de descuento</label>
                  <input type="number" min={1} max={50} value={reviewSettings.discountPercent}
                    onChange={e => setReviewSettings(r => ({ ...r, discountPercent: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-label">Validez del cupón (días)</label>
                  <input type="number" min={1} max={365} value={reviewSettings.validDays}
                    onChange={e => setReviewSettings(r => ({ ...r, validDays: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {reviewSettings.incentiveType === 'product' && (
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label className="form-label">Producto gratis</label>
                  <select value={reviewSettings.productId || ''}
                    onChange={e => {
                      const p = products.find(x => x._id === e.target.value);
                      setReviewSettings(r => ({ ...r, productId: e.target.value, productName: p ? `${p.name} ${p.variant}` : r.productName }));
                    }}
                    style={{ width: '100%' }}>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} {p.variant} — {fmt(p.salePrice)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Validez del cupón (días)</label>
                  <input type="number" min={1} max={365} value={reviewSettings.validDays}
                    onChange={e => setReviewSettings(r => ({ ...r, validDays: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>
              {reviewSettings.sendMode === 'manual'
                ? <>✋ <strong style={{ color: 'var(--gold)' }}>Modo manual:</strong> El WA de reseña NO se envía automáticamente. Podés enviarlo manualmente desde la pantalla de pedidos.</>
                : <>💡 <strong style={{ color: 'var(--gold)' }}>Flujo automático:</strong> Pedido entregado
                    {reviewSettings.orderInterval > 1 ? ` (cada ${reviewSettings.orderInterval}° pedido del cliente)` : ''}
                    {' → '} espera {reviewSettings.waitMinutes} min → WA al cliente → cliente califica → {reviewSettings.incentiveType === 'none' ? 'agradecimiento' : 'cupón generado automáticamente'}.</>
              }
            </div>
          </div>

          <button className="btn btn-primary" disabled={saving === 'review'}
            onClick={async () => {
              setSaving('review');
              try { await API.put('/config/reviewSettings', { value: reviewSettings }); toast.success('Configuración de reseñas guardada'); }
              catch { toast.error('Error al guardar'); }
              finally { setSaving(''); }
            }}>
            <Save size={15} /> {saving === 'review' ? 'Guardando...' : 'Guardar reseñas'}
          </button>
        </Section>

        {/* ── Hamburguesa del día ──────────────────────────────────────────── */}
        <Section title="Hamburguesa del día (promo con countdown)" icon={Zap}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${dailyDeal.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 700, color: dailyDeal.enabled ? 'var(--gold)' : 'var(--gray)', marginBottom: 2 }}>
                {dailyDeal.enabled ? '🟢 Visible en el menú' : '⚪ Oculta'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Aparece como banner destacado en /pedido con countdown</div>
            </div>
            <button className={`btn btn-sm ${dailyDeal.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDailyDeal(d => ({ ...d, enabled: !d.enabled }))}>
              {dailyDeal.enabled ? 'Desactivar' : 'Activar'}
            </button>
          </div>

          <div style={{ opacity: dailyDeal.enabled ? 1 : 0.5, pointerEvents: dailyDeal.enabled ? 'auto' : 'none' }}>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">Nombre de la promo</label>
                <input value={dailyDeal.name} onChange={e => setDailyDeal(d => ({ ...d, name: e.target.value }))} placeholder="Ej: CAVA del día" />
              </div>
              <div>
                <label className="form-label">Vincular a producto (opcional)</label>
                <select value={dailyDeal.productId || ''} onChange={e => setDailyDeal(d => ({ ...d, productId: e.target.value || null }))} style={{ width: '100%' }}>
                  <option value="">Sin producto vinculado</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name} {p.variant}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Descripción</label>
              <input value={dailyDeal.description} onChange={e => setDailyDeal(d => ({ ...d, description: e.target.value }))} placeholder="Ej: Doble cheddar + panceta + salsa especial" />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">Precio original ($)</label>
                <input type="number" min={0} value={dailyDeal.originalPrice}
                  onChange={e => {
                    const orig = Number(e.target.value);
                    const disc = dailyDeal.discountPrice;
                    const pct  = orig > 0 && disc < orig ? Math.round((1 - disc / orig) * 100) : 0;
                    setDailyDeal(d => ({ ...d, originalPrice: orig, discountPercent: pct }));
                  }} />
              </div>
              <div>
                <label className="form-label">Precio con descuento ($)</label>
                <input type="number" min={0} value={dailyDeal.discountPrice}
                  onChange={e => {
                    const disc = Number(e.target.value);
                    const orig = dailyDeal.originalPrice;
                    const pct  = orig > 0 && disc < orig ? Math.round((1 - disc / orig) * 100) : 0;
                    setDailyDeal(d => ({ ...d, discountPrice: disc, discountPercent: pct }));
                  }} />
              </div>
            </div>
            {dailyDeal.discountPercent > 0 && (
              <div style={{ fontSize: '0.82rem', color: '#22c55e', marginBottom: 14, fontWeight: 600 }}>
                ✅ {dailyDeal.discountPercent}% de descuento — el cliente ahorra {fmt(dailyDeal.originalPrice - dailyDeal.discountPrice)}
              </div>
            )}
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">⏰ Válida desde</label>
                <input type="time" value={dailyDeal.fromHour} onChange={e => setDailyDeal(d => ({ ...d, fromHour: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">⏰ Válida hasta</label>
                <input type="time" value={dailyDeal.toHour} onChange={e => setDailyDeal(d => ({ ...d, toHour: e.target.value }))} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" disabled={saving === 'dailyDeal'}
            onClick={async () => {
              setSaving('dailyDeal');
              try { await API.put('/config/dailyDeal', { value: dailyDeal }); toast.success('Promo del día guardada'); }
              catch { toast.error('Error al guardar'); }
              finally { setSaving(''); }
            }}>
            <Save size={15} /> {saving === 'dailyDeal' ? 'Guardando...' : 'Guardar promo del día'}
          </button>
        </Section>

        {/* ── Hamburguesa del mes ──────────────────────────────────────────── */}
        <Section title="Hamburguesa del mes" icon={Calendar}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--dark)', borderRadius: 10, border: `1px solid ${monthlyBurger.enabled ? 'rgba(129,140,248,0.3)' : 'var(--border)'}` }}>
            <div>
              <div style={{ fontWeight: 700, color: monthlyBurger.enabled ? '#818cf8' : 'var(--gray)', marginBottom: 2 }}>
                {monthlyBurger.enabled ? '🟢 Visible como sección especial' : '⚪ Oculta'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Aparece como sección destacada al tope del menú</div>
            </div>
            <button className={`btn btn-sm ${monthlyBurger.enabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMonthlyBurger(m => ({ ...m, enabled: !m.enabled }))}>
              {monthlyBurger.enabled ? 'Desactivar' : 'Activar'}
            </button>
          </div>

          <div style={{ opacity: monthlyBurger.enabled ? 1 : 0.5, pointerEvents: monthlyBurger.enabled ? 'auto' : 'none' }}>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">Nombre</label>
                <input value={monthlyBurger.name} onChange={e => setMonthlyBurger(m => ({ ...m, name: e.target.value }))} placeholder="Ej: La Abril — BBQ Ahumada" />
              </div>
              <div>
                <label className="form-label">Precio ($)</label>
                <input type="number" min={0} value={monthlyBurger.price} onChange={e => setMonthlyBurger(m => ({ ...m, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Descripción</label>
              <textarea rows={2} value={monthlyBurger.description}
                onChange={e => setMonthlyBurger(m => ({ ...m, description: e.target.value }))}
                placeholder="Ingredientes y características especiales..."
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">Badge</label>
                <input value={monthlyBurger.badge} onChange={e => setMonthlyBurger(m => ({ ...m, badge: e.target.value }))} placeholder="🏆 Del mes" />
              </div>
              <div>
                <label className="form-label">Mes (ej: Abril 2026)</label>
                <input value={monthlyBurger.month} onChange={e => setMonthlyBurger(m => ({ ...m, month: e.target.value }))} placeholder="Abril 2026" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">URL de imagen (opcional)</label>
              <input value={monthlyBurger.image} onChange={e => setMonthlyBurger(m => ({ ...m, image: e.target.value }))} placeholder="https://res.cloudinary.com/..." />
            </div>
          </div>

          <button className="btn btn-primary" disabled={saving === 'monthly'}
            onClick={async () => {
              setSaving('monthly');
              try { await API.put('/config/monthlyBurger', { value: monthlyBurger }); toast.success('Hamburguesa del mes guardada'); }
              catch { toast.error('Error al guardar'); }
              finally { setSaving(''); }
            }}>
            <Save size={15} /> {saving === 'monthly' ? 'Guardando...' : 'Guardar hamburguesa del mes'}
          </button>
        </Section>

      {/* Contraseña para eliminar pedidos */}
        <Section title="Seguridad" icon={Lock}>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 14 }}>
            Contraseña requerida para eliminar pedidos del historial.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="password"
              value={deleteOrderPassword}
              onChange={e => setDeleteOrderPassword(e.target.value)}
              placeholder="Contraseña para eliminar pedidos"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={async () => {
              setSaving('deletePass');
              try { await API.put('/config/deleteOrderPassword', { value: deleteOrderPassword }); toast.success('Contraseña actualizada'); }
              catch { toast.error('Error'); }
              finally { setSaving(''); }
            }} disabled={saving === 'deletePass'}>
              <Save size={15} /> {saving === 'deletePass' ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Section>

      </div>
    </>
  );
}