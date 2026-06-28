import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, Package } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const GOLD = '#E8B84B';
const fmt  = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const EMPTY_FORM = { name: '', description: '', salePrice: '', components: [] };

export default function Promos() {
  const [promos,    setPromos]    = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  // Para el selector de producto dentro del form
  const [addProductId, setAddProductId] = useState('');
  const [addQty,       setAddQty]       = useState(1);

  // ── Cargar datos ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([API.get('/promos'), API.get('/products')])
      .then(([pr, pd]) => {
        setPromos(pr.data || []);
        setProducts((pd.data || []).filter(p => p.active));
      })
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  // ── Costo y margen calculados en vivo desde el form ───────────────────────
  const liveCost = form.components.reduce((sum, c) => {
    const prod = products.find(p => p._id === (c.product?._id || c.product));
    return sum + (prod?.cost || 0) * c.quantity;
  }, 0);
  const liveMargin = Number(form.salePrice) > 0
    ? Math.round(((Number(form.salePrice) - liveCost) / Number(form.salePrice)) * 100)
    : 0;
  const summedSalePrice = form.components.reduce((sum, c) => {
    const prod = products.find(p => p._id === (c.product?._id || c.product));
    return sum + (prod?.salePrice || 0) * c.quantity;
  }, 0);

  // ── Agregar componente al form ────────────────────────────────────────────
  const addComponent = () => {
    if (!addProductId) return toast.error('Seleccioná un producto');
    const already = form.components.find(c => (c.product?._id || c.product) === addProductId);
    if (already) return toast.error('Ya está en la promo');
    const prod = products.find(p => p._id === addProductId);
    setForm(f => ({ ...f, components: [...f.components, { product: prod, quantity: addQty }] }));
    setAddProductId('');
    setAddQty(1);
  };

  const removeComponent = (idx) => setForm(f => ({ ...f, components: f.components.filter((_, i) => i !== idx) }));

  const updateComponentQty = (idx, qty) => setForm(f => ({
    ...f,
    components: f.components.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, qty) } : c)
  }));

  // ── Abrir modal ───────────────────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setAddProductId(''); setAddQty(1); setShowModal(true); };

  const openEdit = (promo) => {
    setEditId(promo._id);
    setForm({
      name:        promo.name,
      description: promo.description || '',
      salePrice:   promo.salePrice,
      components:  promo.components.map(c => ({ product: c.product, quantity: c.quantity })),
    });
    setAddProductId('');
    setAddQty(1);
    setShowModal(true);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim())        return toast.error('El nombre es obligatorio');
    if (!form.components.length)  return toast.error('Agregá al menos un producto');
    if (!form.salePrice || Number(form.salePrice) <= 0) return toast.error('El precio de venta es obligatorio');

    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        salePrice:   Number(form.salePrice),
        components:  form.components.map(c => ({
          product:  c.product?._id || c.product,
          quantity: c.quantity,
        })),
      };
      if (editId) {
        const res = await API.put(`/promos/${editId}`, payload);
        setPromos(prev => prev.map(p => p._id === editId ? res.data : p));
        toast.success('Promo actualizada');
      } else {
        const res = await API.post('/promos', payload);
        setPromos(prev => [res.data, ...prev]);
        toast.success('Promo creada');
      }
      setShowModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta promo?')) return;
    try {
      await API.delete(`/promos/${id}`);
      setPromos(prev => prev.filter(p => p._id !== id));
      toast.success('Promo eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleActive = async (promo) => {
    try {
      const res = await API.put(`/promos/${promo._id}`, { active: !promo.active });
      setPromos(prev => prev.map(p => p._id === promo._id ? { ...p, active: res.data.active } : p));
    } catch { toast.error('Error al actualizar'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1>Promos</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nueva promo
        </button>
      </div>

      <div className="page-body">
        {promos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>No hay promos creadas. Creá tu primer combo.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {promos.map(promo => (
              <div key={promo._id} style={{ background: 'var(--card)', border: `1px solid ${promo.active ? 'rgba(232,184,75,0.2)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 20px', opacity: promo.active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>{promo.name}</span>
                      {!promo.available && promo.active && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 99, padding: '1px 7px' }}>Sin stock</span>
                      )}
                      {!promo.active && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 7px' }}>Inactiva</span>
                      )}
                    </div>
                    {promo.description && <div style={{ color: 'var(--gray)', fontSize: '0.8rem', marginBottom: 8 }}>{promo.description}</div>}

                    {/* Componentes */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {promo.components.map((c, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 10px', color: 'var(--gray-light)' }}>
                          ×{c.quantity} {c.name || c.product?.name} {c.variant || c.product?.variant}
                        </span>
                      ))}
                    </div>

                    {/* Financials */}
                    <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: 'var(--gray)' }}>Precio: </span>
                        <span style={{ color: GOLD, fontWeight: 800 }}>{fmt(promo.salePrice)}</span>
                      </div>
                      {promo.cost > 0 && (
                        <div>
                          <span style={{ color: 'var(--gray)' }}>Costo: </span>
                          <span style={{ color: 'var(--gray-light)' }}>{fmt(promo.cost)}</span>
                        </div>
                      )}
                      {promo.margin !== undefined && (
                        <div>
                          <span style={{ color: 'var(--gray)' }}>Margen: </span>
                          <span style={{ color: promo.margin >= 50 ? '#22c55e' : promo.margin >= 30 ? GOLD : '#ef4444', fontWeight: 700 }}>{promo.margin}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => toggleActive(promo)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.72rem' }}>
                      {promo.active ? '⚪ Desactivar' : '🟢 Activar'}
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(promo)}><Pencil size={14} /></button>
                    <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(promo._id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de crear / editar ─────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{editId ? 'Editar promo' : 'Nueva promo'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label>Nombre de la promo *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Combo Janz" />
            </div>
            <div className="form-group">
              <label>Descripción <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="ej: Dos hamburguesas al precio de una y media" />
            </div>

            {/* Productos del combo */}
            <div className="form-group">
              <label>Productos del combo *</label>
              {form.components.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 8 }}>Agregá los productos que forman este combo.</div>
              )}
              {form.components.map((c, idx) => {
                const prod = c.product;
                const name = prod?.name || '';
                const variant = prod?.variant || '';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ flex: 1, fontSize: '0.85rem', color: 'white' }}>{name} {variant}</div>
                    <input type="number" min={1} value={c.quantity} onChange={e => updateComponentQty(idx, Number(e.target.value))} style={{ width: 60 }} />
                    <button onClick={() => removeComponent(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <select value={addProductId} onChange={e => setAddProductId(e.target.value)}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'white', padding: '9px 12px', fontSize: '0.85rem' }}>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} {p.variant} — {fmt(p.salePrice)}</option>
                    ))}
                  </select>
                </div>
                <input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} style={{ width: 60 }} />
                <button onClick={addComponent} className="btn btn-secondary btn-sm"><Plus size={14} /> Agregar</button>
              </div>
            </div>

            {/* Precio de venta */}
            <div className="form-group">
              <label>Precio de venta de la promo *</label>
              <input type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="ej: 25000" />
            </div>

            {/* Preview financiero en vivo */}
            {form.components.length > 0 && (
              <div style={{ background: 'rgba(232,184,75,0.05)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Preview financiero</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Suma de precios', value: fmt(summedSalePrice), color: 'var(--gray-light)' },
                    { label: 'Costo total',      value: fmt(liveCost),        color: 'var(--gray-light)' },
                    { label: 'Margen',           value: `${liveMargin}%`,    color: liveMargin >= 50 ? '#22c55e' : liveMargin >= 30 ? GOLD : '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: 'var(--dark)', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontWeight: 800, color: s.color, fontSize: '0.95rem' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {summedSalePrice > 0 && Number(form.salePrice) > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 8, textAlign: 'center' }}>
                    Ahorro para el cliente: <strong style={{ color: GOLD }}>{fmt(summedSalePrice - Number(form.salePrice))}</strong>
                    {' '}({Math.round(((summedSalePrice - Number(form.salePrice)) / summedSalePrice) * 100)}% off)
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                <Check size={15} /> {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
