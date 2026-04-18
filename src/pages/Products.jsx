import { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X, TrendingUp, TrendingDown, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Upload, Trash2 } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

// Wizard para crear nueva hamburguesa
function NewProductWizard({ ingredients, config, onClose, onSaved }) {
  const [wizardStep, setWizardStep] = useState(1); // 1=info, 2=receta, 3=precio
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [recipeRows, setRecipeRows] = useState([{ ingredient: '', quantity: '', unit: 'g' }]);
  const [prices, setPrices] = useState({ Simple: '', Doble: '', Triple: '' });
  const [productType, setProductType] = useState('burger');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const totalIndirectPct = Object.values(config.indirectCosts || {}).reduce((s, v) => s + Number(v), 0);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(res.data.url);
      toast.success('Foto subida ✓');
    } catch {
      toast.error('Error al subir la foto');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Calcular costo de la receta
  const calcRecipeCost = () => {
    return recipeRows.reduce((sum, row) => {
      if (!row.ingredient || !row.quantity) return sum;
      const ing = ingredients.find(i => i._id === row.ingredient);
      if (!ing) return sum;
      return sum + (ing.costPerUnit || 0) * Number(row.quantity);
    }, 0);
  };

  const ingredientCost = calcRecipeCost();
  const indirectCost = Math.round(ingredientCost * totalIndirectPct / 100);
  const totalCost = Math.round(ingredientCost + indirectCost);
  const suggestedPrice = Math.round(totalCost * (1 + (config.desiredMargin || 300) / 100));

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (recipeRows.some(r => r.ingredient && !r.quantity)) { toast.error('Completá las cantidades de la receta'); return; }
    if (!prices.Simple || !prices.Doble || !prices.Triple) { toast.error('Los precios de venta son obligatorios'); return; }

    setSaving(true);
    try {
      // Crear receta y producto para cada variante
      const validRows = recipeRows.filter(r => r.ingredient && r.quantity);
      const multipliers = { Simple: 1, Doble: 2, Triple: 3 };

      for (const [variant, multiplier] of Object.entries(multipliers)) {
        const scaledIngredients = validRows.map(r => ({
          ingredient: r.ingredient,
          quantity: Number(r.quantity) * multiplier,
          unit: r.unit
        }));

        const recipeRes = await API.post('/products/recipes', {
          name: `Receta ${name} ${variant}`,
          ingredients: scaledIngredients
        });

        await API.post('/products', {
          name: name.trim(),
          variant,
          salePrice: Number(prices[variant]),
          recipe: recipeRes.data._id,
          description: description.trim(),
          image: imageUrl || '',
          productType
        });
      }

      toast.success(`${name} creado con 3 variantes ✓`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>🍔 Nueva Hamburguesa</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[1,2,3].map(s => (
                <div key={s} style={{ width: 28, height: 4, borderRadius: 2, background: wizardStep >= s ? 'var(--gold)' : '#333' }} />
              ))}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* STEP 1 — Info básica */}
          {wizardStep === 1 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 16 }}>
                Paso 1 — Información básica
              </div>
              <div className="form-group">
                <label>Nombre de la hamburguesa *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: La Especial" />
              </div>
              <div className="form-group">
                <label>Descripción (aparece en /pedido)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ej: Doble medallón, cheddar fundido, panceta crocante y cebolla caramelizada..."
                  rows={3} style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'white', padding: '10px 14px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem' }} />
              </div>
              <div className="form-group">
                <label>Tipo de producto</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{v:'burger',l:'🍔 Hamburguesa'},{v:'papas',l:'🍟 Papas'},{v:'otro',l:'📦 Otro'}].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setProductType(opt.v)}
                      className={`btn btn-sm ${productType === opt.v ? 'btn-primary' : 'btn-secondary'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
                  Define qué adicionales se muestran al cliente al personalizarlo.
                </div>
              </div>
              <div className="form-group">
                <label>Foto (opcional)</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                {imagePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    {uploadingImage && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                        <div className="spinner" />
                      </div>
                    )}
                    <button onClick={() => { setImagePreview(null); setImageUrl(''); }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current.click()}
                    style={{ width: '100%', background: '#1a1a1a', border: '2px dashed var(--border)', borderRadius: 8, padding: '28px', cursor: 'pointer', color: 'var(--gray)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={24} />
                    <span style={{ fontSize: '0.85rem' }}>Subir foto desde tu dispositivo</span>
                    <span style={{ fontSize: '0.75rem', color: '#444' }}>JPG, PNG, WEBP — máx 5MB</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* STEP 2 — Receta/Escandallo */}
          {wizardStep === 2 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 16 }}>
                Paso 2 — Receta base (Simple)
              </div>
              <div style={{ color: 'var(--gray)', fontSize: '0.8rem', marginBottom: 16 }}>
                Cargá los ingredientes para <strong style={{ color: 'white' }}>una</strong> unidad. Las variantes Doble y Triple se multiplican automáticamente.
              </div>

              {recipeRows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select value={row.ingredient} onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, ingredient: e.target.value } : r))}>
                    <option value="">Ingrediente...</option>
                    {ingredients.map(ing => (
                      <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Cant." value={row.quantity}
                    onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))} />
                  <input placeholder="Ud." value={row.unit}
                    onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} />
                  <button className="btn-icon" style={{ color: 'var(--red)' }}
                    onClick={() => setRecipeRows(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 4 }}
                onClick={() => setRecipeRows(prev => [...prev, { ingredient: '', quantity: '', unit: 'g' }])}>
                <Plus size={14} /> Agregar ingrediente
              </button>

              {/* Preview costos */}
              {totalCost > 0 && (
                <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: 14, marginTop: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', marginBottom: 10, textTransform: 'uppercase' }}>Preview de costos (Simple)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--gray)' }}>Costo ingredientes</span>
                    <span>{fmt(Math.round(ingredientCost))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--gray)' }}>Costos indirectos ({totalIndirectPct}%)</span>
                    <span>{fmt(indirectCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid rgba(232,184,75,0.2)', paddingTop: 8 }}>
                    <span>Costo total</span>
                    <span style={{ color: 'var(--gold)' }}>{fmt(totalCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 6 }}>
                    <span style={{ color: 'var(--gray)' }}>Precio sugerido ({config.desiredMargin}% margen)</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(suggestedPrice)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 3 — Precios de venta */}
          {wizardStep === 3 && (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 16 }}>
                Paso 3 — Precios de venta
              </div>
              <div style={{ color: 'var(--gray)', fontSize: '0.8rem', marginBottom: 20 }}>
                Precio sugerido basado en tu escandallo: <strong style={{ color: 'var(--gold)' }}>{fmt(suggestedPrice)}</strong> (Simple)
              </div>
              {['Simple','Doble','Triple'].map((v, i) => {
                const multiplier = i + 1;
                const costForVariant = Math.round((ingredientCost + indirectCost) * multiplier);
                const salePrice = Number(prices[v]);
                const margin = salePrice > 0 ? Math.round(((salePrice - costForVariant) / salePrice) * 100) : 0;
                return (
                  <div key={v} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--gold)' }}>{v}</span>
                        <span style={{ color: 'var(--gray)', fontSize: '0.8rem', marginLeft: 8 }}>Costo: {fmt(costForVariant)}</span>
                      </div>
                      {salePrice > 0 && (
                        <span style={{ color: margin >= 50 ? 'var(--green)' : margin >= 30 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700, fontSize: '0.85rem' }}>
                          Margen: {margin}%
                        </span>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Precio de venta *</label>
                      <input type="number" value={prices[v]} placeholder={`Sugerido: ${fmt(Math.round(costForVariant * (1 + (config.desiredMargin || 300) / 100)))}`}
                        onChange={e => setPrices(p => ({ ...p, [v]: e.target.value }))} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={wizardStep === 1 ? onClose : () => setWizardStep(s => s - 1)}>
            {wizardStep === 1 ? 'Cancelar' : '← Atrás'}
          </button>
          {wizardStep < 3 ? (
            <button className="btn btn-primary" onClick={() => {
              if (wizardStep === 1 && !name.trim()) { toast.error('El nombre es obligatorio'); return; }
              setWizardStep(s => s + 1);
            }}>
              Siguiente →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Crear Hamburguesa'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// Modal edición completa de producto existente
function EditProductModal({ product, ingredients, config, onClose, onSaved }) {
  const [description, setDescription] = useState(product.description || '');
  const [imagePreview, setImagePreview] = useState(product.image || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(product.image || '');
  const [recipeRows, setRecipeRows] = useState(
    product.recipe?.ingredients?.length > 0
      ? product.recipe.ingredients.map(ri => ({
          ingredient: ri.ingredient?._id || ri.ingredient || '',
          quantity: ri.quantity || '',
          unit: ri.unit || 'g'
        }))
      : [{ ingredient: '', quantity: '', unit: 'g' }]
  );
  const [salePrice, setSalePrice] = useState(product.salePrice || '');
  const [productType, setProductType] = useState(product.productType || 'burger');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const totalIndirectPct = Object.values(config.indirectCosts || {}).reduce((s, v) => s + Number(v), 0);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(res.data.url);
      toast.success('Foto subida ✓');
    } catch {
      toast.error('Error al subir la foto');
      setImagePreview(product.image || null);
    } finally {
      setUploadingImage(false);
    }
  };

  const calcCost = () => {
    return recipeRows.reduce((sum, row) => {
      if (!row.ingredient || !row.quantity) return sum;
      const ing = ingredients.find(i => i._id === row.ingredient);
      if (!ing) return sum;
      return sum + (ing.costPerUnit || 0) * Number(row.quantity);
    }, 0);
  };

  const ingredientCost = calcCost();
  const indirectCost = Math.round(ingredientCost * totalIndirectPct / 100);
  const totalCost = Math.round(ingredientCost + indirectCost);
  const margin = salePrice > 0 ? Math.round(((salePrice - totalCost) / salePrice) * 100) : 0;

  const handleSave = async () => {
    if (!salePrice) { toast.error('El precio es obligatorio'); return; }
    setSaving(true);
    try {
      // Actualizar receta si cambió
      const validRows = recipeRows.filter(r => r.ingredient && r.quantity);
      if (validRows.length > 0 && product.recipe?._id) {
        await API.put(`/products/recipes/${product.recipe._id}`, {
          ingredients: validRows.map(r => ({
            ingredient: r.ingredient,
            quantity: Number(r.quantity),
            unit: r.unit
          }))
        });
      }

      // Actualizar producto
      await API.put(`/products/${product._id}`, {
        salePrice: Number(salePrice),
        description: description.trim(),
        image: imageUrl || product.image || '',
        productType
      });

      // Actualizar también el resto de variantes con descripción e imagen
      toast.success('Producto actualizado ✓');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar {product.name} {product.variant}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Foto */}
          <div className="form-group">
            <label>Foto</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            {imagePreview ? (
              <div style={{ position: 'relative' }}>
                <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                {uploadingImage && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                    <div className="spinner" />
                  </div>
                )}
                <button onClick={() => { setImagePreview(null); setImageUrl(''); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()}
                style={{ width: '100%', background: '#1a1a1a', border: '2px dashed var(--border)', borderRadius: 8, padding: '24px', cursor: 'pointer', color: 'var(--gray)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Upload size={22} />
                <span style={{ fontSize: '0.85rem' }}>Subir foto</span>
              </button>
            )}
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describí esta hamburguesa..."
              rows={3} style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'white', padding: '10px 14px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>

          {/* Tipo de producto */}
          <div className="form-group">
            <label>Tipo de producto</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{v:'burger',l:'🍔 Hamburguesa'},{v:'papas',l:'🍟 Papas'},{v:'otro',l:'📦 Otro'}].map(opt => (
                <button key={opt.v} type="button" onClick={() => setProductType(opt.v)}
                  className={`btn btn-sm ${productType === opt.v ? 'btn-primary' : 'btn-secondary'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
              Define qué adicionales se muestran al cliente al personalizar este producto.
            </div>
          </div>

          {/* Receta */}
          <div className="form-group">
            <label>Receta</label>
            {recipeRows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select value={row.ingredient} onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, ingredient: e.target.value } : r))}>
                  <option value="">Ingrediente...</option>
                  {ingredients.map(ing => (
                    <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <input type="number" placeholder="Cant." value={row.quantity}
                  onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))} />
                <input placeholder="Ud." value={row.unit}
                  onChange={e => setRecipeRows(prev => prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} />
                <button className="btn-icon" style={{ color: 'var(--red)' }}
                  onClick={() => setRecipeRows(prev => prev.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 4 }}
              onClick={() => setRecipeRows(prev => [...prev, { ingredient: '', quantity: '', unit: 'g' }])}>
              <Plus size={14} /> Agregar ingrediente
            </button>
          </div>

          {/* Preview costos */}
          {totalCost > 0 && (
            <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--gray)' }}>Ingredientes</span><span>{fmt(Math.round(ingredientCost))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--gray)' }}>Indirectos ({totalIndirectPct}%)</span><span>{fmt(indirectCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid rgba(232,184,75,0.2)', paddingTop: 8 }}>
                <span>Costo total</span><span style={{ color: 'var(--gold)' }}>{fmt(totalCost)}</span>
              </div>
            </div>
          )}

          {/* Precio */}
          <div className="form-group">
            <label>Precio de venta *
              {salePrice > 0 && totalCost > 0 && (
                <span style={{ marginLeft: 10, color: margin >= 50 ? 'var(--green)' : margin >= 30 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                  Margen: {margin}%
                </span>
              )}
            </label>
            <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="Precio de venta" />
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : '✓ Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [config, setConfig] = useState({ indirectCosts: { luz: 5, gas: 3, packaging: 4, otros: 3 }, desiredMargin: 300 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editingName, setEditingName] = useState(null); // { id, value }
  const [showConfig, setShowConfig] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  const loadData = () => {
    Promise.all([
      API.get('/products'),
      API.get('/config'),
      API.get('/ingredients')
    ]).then(([p, c, ing]) => {
      setProducts(p.data);
      setConfig(c.data);
      setEditConfig(c.data);
      setIngredients(ing.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const startEdit = (p) => { setEditing(p._id); setEditPrice(p.salePrice); };

  const saveEdit = async (productId) => {
    try {
      const res = await API.put(`/products/${productId}`, { salePrice: Number(editPrice) });
      setProducts(prev => prev.map(p => p._id === productId ? res.data : p));
      setEditing(null);
      toast.success('Precio actualizado');
    } catch { toast.error('Error al actualizar'); }
  };

  const toggleAvailable = async (product) => {
    try {
      await API.put(`/products/${product._id}`, { available: !product.available });
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, available: !p.available } : p));
      toast.success(product.available ? `${product.name} → No disponible` : `${product.name} → Disponible`);
    } catch { toast.error('Error'); }
  };

  const toggleVisible = async (product) => {
    const newVisible = product.visible === false ? true : false;
    try {
      await API.put(`/products/${product._id}`, { visible: newVisible });
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, visible: newVisible } : p));
      toast.success(newVisible ? `${product.name} → Visible en menú` : `${product.name} → Oculto del menú público`);
    } catch { toast.error('Error al cambiar visibilidad'); }
  };

  const saveEditName = async (groupName, newName) => {
    if (!newName.trim() || newName.trim() === groupName) { setEditingName(null); return; }
    try {
      // Actualizar todos los productos del grupo (todas las variantes comparten el nombre)
      const group = products.filter(p => p.name === groupName);
      await Promise.all(group.map(p => API.put(`/products/${p._id}`, { name: newName.trim() })));
      setProducts(prev => prev.map(p => p.name === groupName ? { ...p, name: newName.trim() } : p));
      setEditingName(null);
      toast.success(`Nombre actualizado → ${newName.trim()}`);
    } catch { toast.error('Error al actualizar nombre'); }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name} ${product.variant}"? Esta acción no se puede deshacer.`)) return;
    try {
      await API.delete(`/products/${product._id}`);
      setProducts(prev => prev.filter(p => p._id !== product._id));
      toast.success(`${product.name} ${product.variant} eliminado`);
    } catch { toast.error('Error al eliminar producto'); }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await API.put('/config', editConfig);
      setConfig(editConfig);
      const p = await API.get('/products');
      setProducts(p.data);
      setShowConfig(false);
      toast.success('Configuración guardada y costos recalculados');
    } catch { toast.error('Error al guardar'); }
    finally { setSavingConfig(false); }
  };

  const totalIndirectPct = Object.values(config.indirectCosts || {}).reduce((s, v) => s + Number(v), 0);

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.name]) acc[p.name] = [];
    acc[p.name].push(p);
    return acc;
  }, {});

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Escandallo de Productos</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 4 }}>
            Costos indirectos: <strong style={{ color: 'var(--gold)' }}>{totalIndirectPct}%</strong> &nbsp;|&nbsp; Margen objetivo: <strong style={{ color: 'var(--gold)' }}>{config.desiredMargin}%</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => { setShowConfig(true); setEditConfig(config); }}>
            <Settings size={16} /> Configurar Costos
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewProduct(true)}>
            <Plus size={16} /> Nueva Burger
          </button>
        </div>
      </div>

      <div className="page-body">
        {Object.entries(grouped).map(([name, variants]) => (
          <div key={name} className="card mb-4">
            {/* Imagen y descripción si existe */}
            {variants[0]?.image && (
              <div style={{ marginBottom: 12 }}>
                <img src={variants[0].image} alt={name} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                {editingName?.id === name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      autoFocus
                      value={editingName.value}
                      onChange={e => setEditingName({ id: name, value: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditName(name, editingName.value); if (e.key === 'Escape') setEditingName(null); }}
                      style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', background: 'var(--input-bg)', border: '1px solid var(--gold)', borderRadius: 8, padding: '2px 10px', color: 'var(--gold)', width: 280 }}
                    />
                    <button className="btn-icon" onClick={() => saveEditName(name, editingName.value)} style={{ color: 'var(--green)' }}><Check size={16} /></button>
                    <button className="btn-icon" onClick={() => setEditingName(null)} style={{ color: 'var(--red)' }}><X size={16} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'var(--gold)' }}>🍔 {name}</div>
                    <button className="btn-icon" title="Editar nombre" onClick={() => setEditingName({ id: name, value: name })} style={{ opacity: 0.6 }}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                {variants[0]?.description && (
                  <div style={{ color: 'var(--gray)', fontSize: '0.82rem', marginTop: 4, maxWidth: 500 }}>{variants[0].description}</div>
                )}
              </div>
              {/* Botón ocultar/mostrar del menú público — afecta TODAS las variantes del grupo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {variants.some(p => p.visible === false) && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.12)', color: 'var(--red)', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>
                    OCULTO DEL MENÚ
                  </span>
                )}
                <button
                  title={variants.some(p => p.visible === false) ? 'Mostrar en menú público' : 'Ocultar del menú público'}
                  onClick={() => toggleVisible(variants[0])}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: variants.some(p => p.visible === false) ? 'var(--red)' : 'var(--gray)', fontSize: '0.78rem', fontWeight: 600 }}>
                  {variants.some(p => p.visible === false) ? <Eye size={15} /> : <EyeOff size={15} />}
                  {variants.some(p => p.visible === false) ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            </div>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Variante</th>
                    <th>Ingredientes</th>
                    <th>Indirectos ({totalIndirectPct}%)</th>
                    <th>Costo Total</th>
                    <th>Precio Venta</th>
                    <th>Ganancia</th>
                    <th>Margen %</th>
                    <th>Sugerido ({config.desiredMargin}%)</th>
                    <th>Disponible</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.sort((a, b) => a.variant.localeCompare(b.variant)).map(p => {
                    const profit = p.salePrice - p.totalCost;
                    const margin = p.salePrice > 0 ? Math.round((profit / p.salePrice) * 100) : 0;
                    const isLow = p.salePrice < (p.suggestedPrice || 0) * 0.85;
                    const isExpanded = expandedRecipe === p._id;
                    return (
                      <>
                        <tr key={p._id} style={{ opacity: p.available ? 1 : 0.55 }}>
                          <td><strong>{p.variant}</strong></td>
                          <td style={{ color: 'var(--gray)' }}>{fmt(p.ingredientCost || p.totalCost)}</td>
                          <td style={{ color: 'var(--gray)' }}>{fmt(p.indirectCost || 0)}</td>
                          <td className="text-red"><strong>{fmt(p.totalCost)}</strong></td>
                          <td>
                            {editing === p._id ? (
                              <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: 110 }} />
                            ) : <strong className="text-gold">{fmt(p.salePrice)}</strong>}
                          </td>
                          <td style={{ color: profit > 0 ? 'var(--green)' : 'var(--red)' }}>
                            {profit >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: 4 }} />}
                            {fmt(profit)}
                          </td>
                          <td>
                            <span style={{ color: margin > 60 ? 'var(--green)' : margin > 40 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                              {margin}%
                            </span>
                          </td>
                          <td>
                            <span style={{ color: isLow ? 'var(--yellow)' : 'var(--gray)', fontSize: '0.85rem' }}>
                              {isLow && '⚠️ '}{fmt(p.suggestedPrice || Math.round(p.totalCost * (1 + config.desiredMargin / 100)))}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => toggleAvailable(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.available ? 'var(--green)' : 'var(--red)', padding: 4 }}>
                              {p.available ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {editing === p._id ? (
                                <>
                                  <button className="btn-icon" onClick={() => saveEdit(p._id)} style={{ color: 'var(--green)' }}><Check size={14} /></button>
                                  <button className="btn-icon" onClick={() => setEditing(null)} style={{ color: 'var(--red)' }}><X size={14} /></button>
                                </>
                              ) : (
                                <button className="btn-icon" onClick={() => setEditingProduct(p)}><Edit2 size={14} /></button>
                              )}
                              {p.recipe?.ingredients?.length > 0 && (
                                <button className="btn-icon" onClick={() => setExpandedRecipe(isExpanded ? null : p._id)}>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              )}
                              <button className="btn-icon" onClick={() => deleteProduct(p)} style={{ color: 'var(--red)' }} title="Eliminar producto">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && p.recipe?.ingredients?.length > 0 && (
                          <tr key={`${p._id}-recipe`}>
                            <td colSpan={10} style={{ background: 'rgba(232,184,75,0.04)', padding: '16px 24px' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gray)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Escandallo Detallado</div>

                              {/* Ingredientes */}
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>🥩 Ingredientes</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {p.recipe.ingredients.map((ri, i) => (
                                    <div key={i} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem' }}>
                                      <span style={{ color: 'white' }}>{ri.ingredient?.name}</span>
                                      <span style={{ color: 'var(--gold)', marginLeft: 6 }}>×{ri.quantity}{ri.unit}</span>
                                      {ri.ingredient?.costPerUnit && (
                                        <span style={{ color: 'var(--gray)', marginLeft: 6 }}>({fmt(Math.round(ri.ingredient.costPerUnit * ri.quantity))})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Desglose completo de costos */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                                {/* Columna izquierda: costos */}
                                <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 10 }}>Desglose de costos por unidad</div>

                                  {[
                                    { emoji: '🥩', label: 'Ingredientes', value: p.ingredientCost },
                                    { emoji: '💡', label: `Indirectos (${totalIndirectPct}%)`, value: p.indirectCost },
                                    { emoji: '🏠', label: 'Gastos fijos / burger', value: p.fixedCostPerUnit || 0 },
                                    { emoji: '🛵', label: 'Delivery / burger', value: p.deliveryCostPerUnit || 0 },
                                  ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      <span style={{ color: 'var(--gray)' }}>{row.emoji} {row.label}</span>
                                      <span style={{ color: row.value > 0 ? 'white' : 'var(--gray)' }}>{fmt(row.value)}</span>
                                    </div>
                                  ))}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(232,184,75,0.2)' }}>
                                    <span style={{ fontWeight: 700 }}>Costo base (ing + ind)</span>
                                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(p.totalCost)}</span>
                                  </div>
                                  {(p.fixedCostPerUnit > 0 || p.deliveryCostPerUnit > 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 6 }}>
                                      <span style={{ fontWeight: 700 }}>Costo real total</span>
                                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{fmt(p.realTotalCost || p.totalCost)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Columna derecha: precio y márgenes */}
                                <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 10 }}>Análisis de precio</div>

                                  {[
                                    { label: 'Precio de venta', value: p.salePrice, color: 'var(--gold)' },
                                    { label: 'Costo real total', value: p.realTotalCost || p.totalCost, color: '#ef4444' },
                                    { label: 'Ganancia real', value: p.salePrice - (p.realTotalCost || p.totalCost), color: (p.salePrice - (p.realTotalCost || p.totalCost)) > 0 ? '#22c55e' : '#ef4444' },
                                    { label: `Precio sugerido (${config.desiredMargin}% margen)`, value: p.suggestedPrice, color: 'var(--gray)' },
                                  ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      <span style={{ color: 'var(--gray)' }}>{row.label}</span>
                                      <span style={{ color: row.color, fontWeight: 700 }}>{fmt(row.value)}</span>
                                    </div>
                                  ))}

                                  {/* Margen real */}
                                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: (() => {
                                    const realMargin = p.salePrice > 0 ? Math.round(((p.salePrice - (p.realTotalCost || p.totalCost)) / p.salePrice) * 100) : 0;
                                    return realMargin >= 50 ? 'rgba(34,197,94,0.1)' : realMargin >= 30 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                                  })() }}>
                                    {(() => {
                                      const realMargin = p.salePrice > 0 ? Math.round(((p.salePrice - (p.realTotalCost || p.totalCost)) / p.salePrice) * 100) : 0;
                                      return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Margen real sobre precio</span>
                                          <span style={{ fontWeight: 700, color: realMargin >= 50 ? '#22c55e' : realMargin >= 30 ? '#f59e0b' : '#ef4444' }}>
                                            {realMargin}%
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Aviso si no hay gastos fijos cargados */}
                              {!p.fixedCostPerUnit && !p.deliveryCostPerUnit && (
                                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--gray)', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                                  💡 Cargá los gastos fijos y el costo de delivery en <strong style={{ color: 'white' }}>Configuración → Escandallo detallado</strong> para ver el costo real completo.
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal edición completa */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          ingredients={ingredients}
          config={config}
          onClose={() => setEditingProduct(null)}
          onSaved={() => { loadData(); setEditingProduct(null); }}
        />
      )}

      {/* Modal nueva burger */}
      {showNewProduct && (
        <NewProductWizard
          ingredients={ingredients}
          config={config}
          onClose={() => setShowNewProduct(false)}
          onSaved={loadData}
        />
      )}

      {/* Modal configuración costos */}
      {showConfig && editConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Configuración de Costos</h2>
              <button className="btn-icon" onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 12 }}>
                  Costos Indirectos (% sobre costo de ingredientes)
                </div>
                <div className="grid-2">
                  {Object.entries(editConfig.indirectCosts || {}).map(([key, val]) => (
                    <div className="form-group" key={key}>
                      <label style={{ textTransform: 'capitalize' }}>{key} (%)</label>
                      <input type="number" min="0" max="50" value={val}
                        onChange={e => setEditConfig(c => ({ ...c, indirectCosts: { ...c.indirectCosts, [key]: Number(e.target.value) } }))} />
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(232,184,75,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 700 }}>
                  Total costos indirectos: {Object.values(editConfig.indirectCosts || {}).reduce((s, v) => s + Number(v), 0)}%
                </div>
              </div>
              <div className="form-group">
                <label>Margen de Ganancia Deseado (%)</label>
                <input type="number" min="0" max="1000" value={editConfig.desiredMargin}
                  onChange={e => setEditConfig(c => ({ ...c, desiredMargin: Number(e.target.value) }))} />
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 4 }}>
                  El precio sugerido se calcula como: Costo Total × (1 + {editConfig.desiredMargin}%)
                </div>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 14, fontSize: '0.83rem', color: 'var(--gray)' }}>
                💡 Al guardar, se recalculan automáticamente los costos y precios sugeridos de todos los productos.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfig(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveConfig} disabled={savingConfig}>
                {savingConfig ? 'Guardando...' : 'Guardar y Recalcular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
