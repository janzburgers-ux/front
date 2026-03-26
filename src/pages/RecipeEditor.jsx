import { useState, useEffect } from 'react';
import { BookOpen, Save, Plus, Trash2, Edit2, X } from 'lucide-react';
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
              Seleccioná un producto para editar su receta. Los cambios actualizan el costo automáticamente.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter(p => p.active && p.recipe).map(p => (
                <div key={p._id} className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name} <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>{p.variant}</span></div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                      Costo ingredientes: <span style={{ color: 'var(--white)' }}>{fmt(p.ingredientCost || 0)}</span>
                      {' · '}
                      Costo total: <span style={{ color: 'var(--white)' }}>{fmt(p.totalCost || 0)}</span>
                      {' · '}
                      Precio venta: <span style={{ color: 'var(--gold)' }}>{fmt(p.salePrice || 0)}</span>
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

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
                {saving ? <div className="spinner spinner-sm" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar receta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
