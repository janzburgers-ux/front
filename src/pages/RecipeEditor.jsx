import { useState, useEffect } from 'react';
import { BookOpen, Save, Plus, Trash2, Edit2, X, Star, Sun } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

export default function RecipeEditor() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product being edited
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  // ── Estado para el panel de destacados ────────────────────────────────────
  const [featured, setFeatured] = useState({
    isDailyBurger:      false,
    dailyDiscountPrice: '',
    dailyFromHour:      '19:00',
    dailyToHour:        '21:00',
    isMonthlyBurger:    false,
    monthlyLabel:       ''
  });
  const [savingFeatured, setSavingFeatured] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/products'),
      API.get('/ingredients')
    ]).then(([p, i]) => {
      setProducts(p.data);
      setIngredients(i.data);
    }).finally(() => setLoading(false));
  }, []);

  const startEdit = async (product) => {
    try {
      const res = await API.get(`/products/${product._id}`);
      const p = res.data;
      const recipe = p.recipe;
      if (recipe?.ingredients?.length) {
        setRows(recipe.ingredients.map(ri => ({
          ingredient: ri.ingredient?._id || ri.ingredient,
          ingredientName: ri.ingredient?.name || '',
          quantity: ri.quantity,
          unit: ri.unit
        })));
      } else {
        setRows([{ ingredient: '', quantity: '', unit: 'g' }]);
      }
      // Cargar estado de destacados desde el producto
      setFeatured({
        isDailyBurger:      !!p.isDailyBurger,
        dailyDiscountPrice: p.dailyDiscountPrice || '',
        dailyFromHour:      p.dailyFromHour || '19:00',
        dailyToHour:        p.dailyToHour   || '21:00',
        isMonthlyBurger:    !!p.isMonthlyBurger,
        monthlyLabel:       p.monthlyLabel  || ''
      });
      setEditing(p);
    } catch { toast.error('Error al cargar receta'); }
  };

  const calcCost = () => {
    return rows.reduce((sum, row) => {
      if (!row.ingredient || !row.quantity) return sum;
      const ing = ingredients.find(i => i._id === row.ingredient);
      return sum + (ing?.costPerUnit || 0) * parseFloat(row.quantity || 0);
    }, 0);
  };

  const handleSave = async () => {
    if (!editing) return;
    const validRows = rows.filter(r => r.ingredient && r.quantity);
    if (validRows.length === 0) { toast.error('Agregá al menos un ingrediente'); return; }
    setSaving(true);
    try {
      // Update recipe
      if (editing.recipe?._id) {
        await API.put(`/products/recipes/${editing.recipe._id}`, {
          name: editing.name,
          ingredients: validRows.map(r => ({
            ingredient: r.ingredient,
            quantity: parseFloat(r.quantity),
            unit: r.unit
          }))
        });
      }
      // Recalculate product cost
      await API.put(`/products/${editing._id}`, {});
      toast.success(`Receta de ${editing.name} actualizada ✓`);
      setEditing(null);
      // Reload products
      const res = await API.get('/products');
      setProducts(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleSaveFeatured = async () => {
    if (!editing) return;
    setSavingFeatured(true);
    try {
      // Guardar estado del día
      await API.patch(`/products/${editing._id}/daily`, {
        isDailyBurger:      featured.isDailyBurger,
        dailyDiscountPrice: featured.isDailyBurger ? Number(featured.dailyDiscountPrice) || 0 : 0,
        dailyFromHour:      featured.isDailyBurger ? featured.dailyFromHour : '',
        dailyToHour:        featured.isDailyBurger ? featured.dailyToHour   : ''
      });
      // Guardar estado del mes
      await API.patch(`/products/${editing._id}/monthly`, {
        isMonthlyBurger: featured.isMonthlyBurger,
        monthlyLabel:    featured.isMonthlyBurger ? featured.monthlyLabel : ''
      });
      toast.success('Destacados guardados ✓');
      // Refrescar la lista
      const res = await API.get('/products');
      setProducts(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar destacados');
    } finally { setSavingFeatured(false); }
  };

  const ingredientCost = calcCost();

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1><BookOpen size={20} style={{ display: 'inline', marginRight: 8 }} />Editor de Recetas</h1>
      </div>

      <div className="page-body">
        {!editing ? (
          <>
            <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--gray)' }}>
              Seleccioná un producto para editar su receta y configurar si es destacado del día o del mes.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => p.active && p.recipe).map(p => (
                <div key={p._id} className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.name} <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>{p.variant}</span>
                        {p.isDailyBurger && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(232,184,75,0.15)', color: '#E8B84B', border: '1px solid rgba(232,184,75,0.3)', padding: '2px 7px', borderRadius: 99, letterSpacing: '0.04em' }}>
                            ☀️ DEL DÍA
                          </span>
                        )}
                        {p.isMonthlyBurger && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(159,122,234,0.15)', color: '#9F7AEA', border: '1px solid rgba(159,122,234,0.3)', padding: '2px 7px', borderRadius: 99, letterSpacing: '0.04em' }}>
                            ★ DEL MES
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                        Costo ingredientes: <span style={{ color: 'var(--white)' }}>{fmt(p.ingredientCost || 0)}</span>
                        {' · '}
                        Costo total: <span style={{ color: 'var(--white)' }}>{fmt(p.totalCost || 0)}</span>
                        {' · '}
                        Precio venta: <span style={{ color: 'var(--gold)' }}>{fmt(p.salePrice || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>
                    <Edit2 size={13} /> Editar receta
                  </button>
                </div>
              ))}
              {products.filter(p => p.active && !p.recipe).length > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--yellow)' }}>
                  ⚠️ {products.filter(p => p.active && !p.recipe).length} producto(s) sin receta asignada. Creálas desde la sección Escandallo.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>{editing.name} <span style={{ color: 'var(--gold)' }}>{editing.variant}</span></div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>Editando receta base (x1 medallón — x2 y x3 se multiplican automáticamente)</div>
              </div>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={16} /></button>
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 36px', gap: 8, alignItems: 'center' }}>
                  <select value={row.ingredient}
                    onChange={e => {
                      const ing = ingredients.find(x => x._id === e.target.value);
                      setRows(prev => prev.map((r, j) => j === i ? { ...r, ingredient: e.target.value, unit: ing?.unit || r.unit } : r));
                    }}>
                    <option value="">Ingrediente...</option>
                    {ingredients.map(ing => (
                      <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Cant." value={row.quantity}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))} />
                  <input placeholder="Ud." value={row.unit}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} />
                  <button className="btn-icon" style={{ color: 'var(--red)' }}
                    onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary w-full" style={{ marginBottom: 20 }}
              onClick={() => setRows(prev => [...prev, { ingredient: '', quantity: '', unit: 'g' }])}>
              <Plus size={14} /> Agregar ingrediente
            </button>

            {/* Cost preview */}
            {ingredientCost > 0 && (
              <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', marginBottom: 10, textTransform: 'uppercase' }}>Preview costos (x1)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--gray)' }}>Costo ingredientes</span>
                  <span style={{ color: 'var(--white)', fontWeight: 600 }}>{fmt(Math.round(ingredientCost))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--gray)' }}>Precio de venta actual</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(editing.salePrice)}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
                {saving ? <div className="spinner spinner-sm" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar receta'}
              </button>
            </div>

            {/* ── Panel de destacados ────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Destacados en el menú
              </div>

              {/* Hamburguesa del DÍA */}
              <div style={{ background: featured.isDailyBurger ? 'rgba(232,184,75,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${featured.isDailyBurger ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16, marginBottom: 12, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: featured.isDailyBurger ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={15} style={{ color: featured.isDailyBurger ? '#E8B84B' : 'var(--gray)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: featured.isDailyBurger ? '#E8B84B' : 'var(--white)' }}>Hamburguesa del día</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 1 }}>Se muestra con badge dorado y countdown en el menú</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFeatured(f => ({ ...f, isDailyBurger: !f.isDailyBurger }))}
                    style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${featured.isDailyBurger ? 'rgba(232,184,75,0.4)' : 'var(--border)'}`, background: featured.isDailyBurger ? 'rgba(232,184,75,0.15)' : 'transparent', color: featured.isDailyBurger ? '#E8B84B' : 'var(--gray)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s' }}
                  >
                    {featured.isDailyBurger ? 'Activo' : 'Activar'}
                  </button>
                </div>
                {featured.isDailyBurger && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Precio con descuento (0 = sin descuento)</label>
                      <input
                        type="number" min={0}
                        placeholder={`Precio normal: ${fmt(editing.salePrice)}`}
                        value={featured.dailyDiscountPrice}
                        onChange={e => setFeatured(f => ({ ...f, dailyDiscountPrice: e.target.value }))}
                        style={{ width: '100%' }}
                      />
                      {featured.dailyDiscountPrice > 0 && editing.salePrice > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: 4 }}>
                          ✅ {Math.round((1 - featured.dailyDiscountPrice / editing.salePrice) * 100)}% de descuento — el cliente ahorra {fmt(editing.salePrice - featured.dailyDiscountPrice)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Disponible desde</label>
                        <input type="time" value={featured.dailyFromHour} onChange={e => setFeatured(f => ({ ...f, dailyFromHour: e.target.value }))} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Hasta</label>
                        <input type="time" value={featured.dailyToHour} onChange={e => setFeatured(f => ({ ...f, dailyToHour: e.target.value }))} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hamburguesa del MES */}
              <div style={{ background: featured.isMonthlyBurger ? 'rgba(159,122,234,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${featured.isMonthlyBurger ? 'rgba(159,122,234,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16, marginBottom: 16, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: featured.isMonthlyBurger ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={15} style={{ color: featured.isMonthlyBurger ? '#9F7AEA' : 'var(--gray)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: featured.isMonthlyBurger ? '#9F7AEA' : 'var(--white)' }}>Hamburguesa del mes</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 1 }}>Se muestra con card especial violeta. Solo puede haber una activa.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFeatured(f => ({ ...f, isMonthlyBurger: !f.isMonthlyBurger }))}
                    style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${featured.isMonthlyBurger ? 'rgba(159,122,234,0.4)' : 'var(--border)'}`, background: featured.isMonthlyBurger ? 'rgba(159,122,234,0.15)' : 'transparent', color: featured.isMonthlyBurger ? '#9F7AEA' : 'var(--gray)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s' }}
                  >
                    {featured.isMonthlyBurger ? 'Activo' : 'Activar'}
                  </button>
                </div>
                {featured.isMonthlyBurger && (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Etiqueta del mes (ej: Abril 2025)</label>
                    <input
                      type="text"
                      placeholder="Ej: Abril 2025"
                      value={featured.monthlyLabel}
                      onChange={e => setFeatured(f => ({ ...f, monthlyLabel: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>

              <button className="btn btn-primary w-full" onClick={handleSaveFeatured} disabled={savingFeatured}>
                {savingFeatured ? <div className="spinner spinner-sm" /> : <Star size={14} />}
                {savingFeatured ? 'Guardando...' : 'Guardar destacados'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
