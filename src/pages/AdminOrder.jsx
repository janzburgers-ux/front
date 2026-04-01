import { useState, useEffect } from 'react';
import { Phone, Plus, Minus, Trash2, Send, User, MapPin, ShoppingBag } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

function itemTotal(item) {
  const base   = item.unitPrice * item.quantity;
  const extras = (item.additionals || []).reduce((s, a) => s + a.unitPrice * (a.quantity || 1), 0);
  return base + extras;
}

export default function AdminOrder() {
  const [products, setProducts]       = useState([]);
  const [additionals, setAdditionals] = useState([]);
  const [zones, setZones]             = useState([]);
  const [clients, setClients]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  // Carrito
  const [cart, setCart]               = useState([]);
  const [additionalsModal, setAdditionalsModal] = useState(null);

  // Datos del cliente
  const [client, setClient]           = useState({ name: '', whatsapp: '', address: '', floor: '', neighborhood: '', references: '', notes: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);

  // Entrega
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [selectedZone, setSelectedZone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes]             = useState('');
  const [couponCode, setCouponCode]   = useState('');
  const [couponStatus, setCouponStatus] = useState(null);

  // Resultado
  const [result, setResult]           = useState(null);

  useEffect(() => {
    Promise.all([
      API.get('/public/menu'),
      API.get('/clients')
    ]).then(([menuRes, clientsRes]) => {
      const menuData = menuRes.data;
      // Flatten menu object into product array
      const prods = [];
      Object.entries(menuData.menu || {}).forEach(([name, variants]) => {
        variants.forEach(v => prods.push(v));
      });
      setProducts(prods);
      setAdditionals(menuData.additionals || []);
      setZones(menuData.zones || []);
      setClients(clientsRes.data || []);
    }).catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  // Autocompletar cliente
  useEffect(() => {
    if (!clientSearch.trim()) { setClientSuggestions([]); return; }
    const q = clientSearch.toLowerCase();
    const matches = clients.filter(c =>
      c.name?.toLowerCase().includes(q) || c.whatsapp?.includes(q) || c.phone?.includes(q)
    ).slice(0, 5);
    setClientSuggestions(matches);
  }, [clientSearch, clients]);

  const selectClient = (c) => {
    setClient({
      name: c.name || '',
      whatsapp: c.whatsapp || '',
      address: c.address || '',
      floor: c.floor || '',
      neighborhood: c.neighborhood || '',
      references: c.references || '',
      notes: ''
    });
    setClientSearch(c.name || '');
    setClientSuggestions([]);
    toast.success(`Cliente cargado: ${c.name}`);
  };

  // Carrito
  const addToCart = (product, additionalsList = []) => {
    setCart(prev => {
      const ex = prev.find(i => i.product === product._id);
      if (ex && additionalsList.length === 0) return prev.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product: product._id,
        productName: product.name,
        variant: product.variant,
        productType: product.productType || 'burger',
        quantity: 1,
        unitPrice: product.salePrice,
        additionals: additionalsList
      }];
    });
  };

  const handleAddProduct = (product) => {
    if (additionals.length > 0) {
      setAdditionalsModal(product);
    } else {
      addToCart(product, []);
    }
  };

  const removeFromCart = (idx) => {
    setCart(prev => {
      const item = prev[idx];
      if (item.quantity > 1) return prev.map((i, ii) => ii === idx ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter((_, ii) => ii !== idx);
    });
  };

  const addQty = (idx) => setCart(prev => prev.map((i, ii) => ii === idx ? { ...i, quantity: i.quantity + 1 } : i));

  // Cálculos
  const subtotalBruto = cart.reduce((s, i) => s + itemTotal(i), 0);
  const activeDiscountPct = couponStatus?.valid ? couponStatus.discountPercent : 0;
  const discount = activeDiscountPct > 0 ? Math.round(subtotalBruto * activeDiscountPct / 100) : 0;
  const subtotalConDescuento = subtotalBruto - discount;

  const deliveryCost = (() => {
    if (deliveryType !== 'delivery' || !selectedZone) return 0;
    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) return 0;
    const isFree = zone.freeFrom > 0 && subtotalConDescuento >= zone.freeFrom;
    return isFree ? 0 : (zone.cost || 0);
  })();

  const totalFinal = subtotalConDescuento + deliveryCost;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!client.whatsapp) { toast.error('Ingresá el WhatsApp del cliente primero'); return; }
    try {
      const res = await API.post('/coupons/validate', { code: couponCode.trim(), whatsapp: client.whatsapp });
      setCouponStatus({ valid: true, discountPercent: res.data.discountPercent, message: res.data.message });
      toast.success(res.data.message);
    } catch (e) {
      setCouponStatus({ valid: false, message: e.response?.data?.message || 'Cupón inválido' });
      toast.error(e.response?.data?.message || 'Cupón inválido');
    }
  };

  const handleSubmit = async () => {
    if (!client.name || !client.whatsapp) { toast.error('Nombre y WhatsApp son obligatorios'); return; }
    if (cart.length === 0) { toast.error('Agregá al menos un producto'); return; }
    if (!paymentMethod) { toast.error('Seleccioná un método de pago'); return; }
    if (deliveryType === 'delivery' && zones.length > 0 && !selectedZone) { toast.error('Seleccioná la zona de delivery'); return; }

    setSubmitting(true);
    try {
      const res = await API.post('/orders/admin-create', {
        client,
        items: cart.map(i => ({
          product: i.product,
          quantity: i.quantity,
          additionals: (i.additionals || []).map(a => ({ additional: a.additional, quantity: a.quantity })),
          notes: i.notes || ''
        })),
        deliveryType,
        paymentMethod,
        notes,
        zone: selectedZone,
        couponCode: couponStatus?.valid ? couponCode.trim() : null
      });

      setResult(res.data);
      toast.success(`✅ Pedido creado: ${res.data.publicCode}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setClient({ name: '', whatsapp: '', address: '', floor: '', neighborhood: '', references: '', notes: '' });
    setClientSearch('');
    setDeliveryType('delivery');
    setSelectedZone('');
    setPaymentMethod('efectivo');
    setNotes('');
    setCouponCode('');
    setCouponStatus(null);
    setResult(null);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner"/></div>;

  if (result) return (
    <div className="page-body" style={{ maxWidth: 520 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#22c55e', marginBottom: 8 }}>
          Pedido creado
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)', marginBottom: 4, letterSpacing: 2 }}>
          {result.publicCode}
        </div>
        <div style={{ color: 'var(--gray)', fontSize: '0.82rem', marginBottom: 20 }}>
          El cliente recibirá confirmación por WhatsApp
        </div>
        <div style={{ background: 'var(--dark)', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left' }}>
          {result.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--gray)' }}>×{item.quantity} {item.productName} {item.variant}</span>
              <span>{fmt(item.subtotal || item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          {result.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#22c55e', marginTop: 8 }}>
              <span>🎟️ Descuento</span><span>- {fmt(result.discountAmount)}</span>
            </div>
          )}
          {result.deliveryCost > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray)', marginTop: 4 }}>
              <span>🛵 Delivery</span><span>{fmt(result.deliveryCost)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
            <span style={{ color: 'var(--gold)' }}>TOTAL</span>
            <span style={{ fontSize: '1.2rem' }}>{fmt(result.total)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>
            Nuevo pedido
          </button>
          <a href="/gestion/cocina" className="btn btn-primary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Ver en cocina →
          </a>
        </div>
      </div>
    </div>
  );

  // Categorías de productos
  const burgers = products.filter(p => (p.productType || 'burger') === 'burger');
  const papas   = products.filter(p => p.productType === 'papas');
  const otros   = products.filter(p => p.productType === 'otro');

  const ProductCard = ({ p }) => {
    const inCart = cart.filter(i => i.product === p._id).reduce((s, i) => s + i.quantity, 0);
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, opacity: p.available ? 1 : 0.4 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {p.name} <span style={{ color: 'var(--gold)' }}>{p.variant}</span>
            {!p.available && <span style={{ color: '#ef4444', fontSize: '0.65rem', marginLeft: 8 }}>NO DISP.</span>}
          </div>
          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.88rem' }}>{fmt(p.salePrice)}</div>
        </div>
        {p.available && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {inCart > 0 && <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', borderRadius: 20, padding: '2px 10px', fontSize: '0.82rem', fontWeight: 700 }}>×{inCart}</span>}
            <button className="btn btn-primary btn-sm" onClick={() => handleAddProduct(p)}>
              <Plus size={14}/> Agregar
            </button>
          </div>
        )}
      </div>
    );
  };

  const ProductSection = ({ title, emoji, items }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          {emoji} {title}
        </div>
        {items.map(p => <ProductCard key={p._id} p={p}/>)}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1>📞 Tomar Pedido</h1>
        <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginTop: 4 }}>
          Para clientes que piden por WhatsApp. Se registra igual que /pedido.
        </p>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* ── COLUMNA IZQUIERDA ── */}
          <div>

            {/* Cliente */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} color="var(--gold)"/> Datos del cliente
              </div>

              {/* Buscador de cliente existente */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <label className="form-label">Buscar cliente existente</label>
                <input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Nombre o WhatsApp..."
                  className="form-input"
                />
                {clientSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 4 }}>
                    {clientSuggestions.map(c => (
                      <button key={c._id} onClick={() => selectClient(c)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'white' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{c.whatsapp} · {c.address || 'Sin dirección'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={client.name} onChange={e => setClient(c => ({ ...c, name: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                  <label>WhatsApp *</label>
                  <input value={client.whatsapp} onChange={e => setClient(c => ({ ...c, whatsapp: e.target.value }))} placeholder="11xxxxxxxx" type="tel" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[{ v: 'delivery', l: '🛵 Delivery' }, { v: 'takeaway', l: '🥡 Take Away' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setDeliveryType(v)}
                    className={`btn ${deliveryType === v ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}>{l}</button>
                ))}
              </div>

              {deliveryType === 'delivery' && (
                <>
                  <div className="form-group">
                    <label>Dirección</label>
                    <input value={client.address} onChange={e => setClient(c => ({ ...c, address: e.target.value }))} placeholder="Calle y número" />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Piso / Depto</label>
                      <input value={client.floor} onChange={e => setClient(c => ({ ...c, floor: e.target.value }))} placeholder="3° B" />
                    </div>
                    <div className="form-group">
                      <label>Barrio</label>
                      <input value={client.neighborhood} onChange={e => setClient(c => ({ ...c, neighborhood: e.target.value }))} placeholder="Barrio..." />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Referencias</label>
                    <input value={client.references} onChange={e => setClient(c => ({ ...c, references: e.target.value }))} placeholder="Portón verde, timbre 2B..." />
                  </div>

                  {zones.length > 0 && (
                    <div className="form-group">
                      <label>Zona de delivery *</label>
                      <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
                        <option value="">Seleccioná una zona...</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>
                            📍 {z.name} — {z.cost > 0 ? fmt(z.cost) : 'Gratis'}
                            {z.freeFrom > 0 ? ` (gratis desde ${fmt(z.freeFrom)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Productos */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={16} color="var(--gold)"/> Productos
              </div>
              <ProductSection title="Hamburguesas" emoji="🍔" items={burgers}/>
              <ProductSection title="Papas" emoji="🍟" items={papas}/>
              <ProductSection title="Otros" emoji="🍶" items={otros}/>
            </div>
          </div>

          {/* ── COLUMNA DERECHA (resumen) ── */}
          <div>
            <div style={{ position: 'sticky', top: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14 }}>🧾 Resumen del pedido</div>

              {cart.length === 0 ? (
                <div style={{ color: 'var(--gray)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                  Agregá productos para empezar
                </div>
              ) : (
                <>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.productName} {item.variant}</div>
                        {(item.additionals || []).map((a, ai) => (
                          <div key={ai} style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>+ {a.name} ×{a.quantity}</div>
                        ))}
                        <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: 2 }}>{fmt(itemTotal(item))}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                        <button onClick={() => removeFromCart(idx)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--dark)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={12}/>
                        </button>
                        <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', fontSize: '0.88rem' }}>{item.quantity}</span>
                        <button onClick={() => addQty(idx)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={12}/>
                        </button>
                        <button onClick={() => setCart(prev => prev.filter((_, ii) => ii !== idx))} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Método de pago */}
                  <div style={{ marginTop: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Método de pago</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{ v: 'efectivo', l: '💵 Efectivo' }, { v: 'transferencia', l: '🏦 Transf.' }].map(({ v, l }) => (
                        <button key={v} onClick={() => setPaymentMethod(v)}
                          className={`btn btn-sm ${paymentMethod === v ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ flex: 1, fontSize: '0.78rem' }}>{l}</button>
                      ))}
                    </div>
                  </div>

                  {/* Cupón */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Cupón</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                        placeholder="Código..." style={{ flex: 1 }} className="form-input" />
                      <button className="btn btn-secondary btn-sm" onClick={validateCoupon} disabled={!couponCode.trim()}>Aplicar</button>
                    </div>
                    {couponStatus && (
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: couponStatus.valid ? '#22c55e' : '#ef4444' }}>
                        {couponStatus.valid ? '✅' : '❌'} {couponStatus.message}
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Notas del pedido</div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alergias, aclaraciones..." rows={2} className="form-input" style={{ resize: 'vertical' }} />
                  </div>

                  {/* Totales */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    {(discount > 0 || deliveryCost > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: 'var(--gray)' }}>
                        <span>Subtotal</span><span>{fmt(subtotalBruto)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: '#22c55e' }}>
                        <span>Descuento {activeDiscountPct}%</span><span>- {fmt(discount)}</span>
                      </div>
                    )}
                    {deliveryType === 'delivery' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: deliveryCost === 0 ? '#22c55e' : 'var(--gray)' }}>
                        <span>Delivery</span><span>{deliveryCost === 0 ? '¡Gratis!' : fmt(deliveryCost)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</span>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'white' }}>{fmt(totalFinal)}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 14, padding: '13px' }}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Send size={15}/>
                    {submitting ? 'Creando pedido...' : `Confirmar pedido — ${fmt(totalFinal)}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal adicionales */}
      {additionalsModal && (
        <div className="modal-overlay" onClick={() => setAdditionalsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionales — {additionalsModal.name} {additionalsModal.variant}</h2>
              <button className="btn-icon" onClick={() => setAdditionalsModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <SimpleAdditionalsSelector
                product={additionalsModal}
                additionals={additionals}
                onConfirm={(sel) => { addToCart(additionalsModal, sel); setAdditionalsModal(null); }}
                onCancel={() => setAdditionalsModal(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SimpleAdditionalsSelector({ product, additionals, onConfirm, onCancel }) {
  const [selected, setSelected] = useState({});
  const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

  const toggle = (add) => setSelected(prev =>
    prev[add._id] ? (({ [add._id]: _, ...rest }) => rest)(prev) : { ...prev, [add._id]: 1 }
  );
  const changeQty = (addId, delta) => setSelected(prev => {
    const newQty = (prev[addId] || 1) + delta;
    if (newQty <= 0) return (({ [addId]: _, ...rest }) => rest)(prev);
    return { ...prev, [addId]: newQty };
  });

  // Filtrar según productType
  const pType = product.productType || 'burger';
  const filtered = additionals.filter(a => {
    if (a.category === 'salsa') return pType !== 'papas';
    if (a.category === 'hamburguesa' || a.category === 'adicional') return pType === 'burger';
    if (a.category === 'papas') return pType === 'burger' || pType === 'papas';
    return true;
  });

  const totalExtra = additionals.reduce((s, a) => selected[a._id] ? s + a.price * selected[a._id] : s, 0);

  return (
    <div>
      {filtered.length === 0 && <p style={{ color: 'var(--gray)', textAlign: 'center' }}>Sin adicionales para este producto</p>}
      {filtered.map(add => {
        const qty = selected[add._id] || 0;
        return (
          <div key={add._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{add.emoji} {add.name}</div>
              {add.price > 0 && <div style={{ color: 'var(--gold)', fontSize: '0.82rem' }}>{fmt(add.price)}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {qty > 0 ? (
                <>
                  <button onClick={() => changeQty(add._id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--dark)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700 }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => changeQty(add._id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700 }}>+</button>
                </>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(add)}>+ Agregar</button>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
          const sel = additionals.filter(a => selected[a._id]).map(a => ({ additional: a._id, name: a.name, unitPrice: a.price, quantity: selected[a._id] }));
          onConfirm(sel);
        }}>
          Confirmar {totalExtra > 0 ? `(+ ${fmt(totalExtra)})` : ''}
        </button>
      </div>
    </div>
  );
}
