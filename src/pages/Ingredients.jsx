import { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, AlertTriangle, Trash2 } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const fmtDec = n => `$${Number(n || 0).toFixed(2)}`;
const CATEGORIES = ['Proteína', 'Lácteos', 'Verduras', 'Almacén', 'Salsas', 'Descartables'];
const EMPTY = { name: '', unit: '', packageUnit: '', quantityPerPackage: 1, packageCost: 0, category: 'Almacén', perishable: false, priority: 'B' };

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [formData, setFormData] = useState(EMPTY);
  const [priceAlert, setPriceAlert] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchIngredients = () => {
    API.get('/ingredients').then(r => setIngredients(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchIngredients(); }, []);

  // Edición inline (solo precio/cantidad — modo rápido)
  const startEdit = (ing) => {
    setEditing(ing._id);
    setEditValues({ packageCost: ing.packageCost, quantityPerPackage: ing.quantityPerPackage });
  };

  const saveEdit = async (ingId) => {
    try {
      const res = await API.put(`/ingredients/${ingId}`, editValues);
      setIngredients(prev => prev.map(i => i._id === ingId ? res.data.ingredient : i));
      setEditing(null);
      if (res.data.pricesRecalculated && res.data.affectedProducts?.length > 0) {
        setPriceAlert(res.data.affectedProducts);
        toast.success(`💰 ${res.data.affectedProducts.length} productos recalculados`);
      } else {
        toast.success('Ingrediente actualizado');
      }
    } catch { toast.error('Error al actualizar'); }
  };

  // Edición completa en modal
  const openEditModal = (ing) => {
    setFormData({
      name: ing.name,
      unit: ing.unit,
      packageUnit: ing.packageUnit || '',
      quantityPerPackage: ing.quantityPerPackage,
      packageCost: ing.packageCost,
      category: ing.category,
      perishable: ing.perishable || false,
      priority: ing.priority || 'B',
    });
    setModalMode('edit');
    setEditing(ing._id);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData(EMPTY);
    setModalMode('create');
    setEditing(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    try {
      if (modalMode === 'create') {
        const res = await API.post('/ingredients', formData);
        setIngredients(prev => [...prev, res.data]);
        await API.post('/stock', { ingredient: res.data._id, currentStock: 0, minimumStock: 0, unit: res.data.unit });
        toast.success('Ingrediente creado');
      } else {
        const res = await API.put(`/ingredients/${editing}`, formData);
        setIngredients(prev => prev.map(i => i._id === editing ? res.data.ingredient : i));
        if (res.data.pricesRecalculated && res.data.affectedProducts?.length > 0) {
          setPriceAlert(res.data.affectedProducts);
          toast.success(`💰 ${res.data.affectedProducts.length} productos recalculados`);
        } else {
          toast.success('Ingrediente actualizado');
        }
      }
      setShowModal(false);
      setEditing(null);
    } catch { toast.error('Error al guardar'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await API.delete(`/ingredients/${deleteConfirm._id}`);
      setIngredients(prev => prev.filter(i => i._id !== deleteConfirm._id));
      toast.success('Ingrediente eliminado');
      setDeleteConfirm(null);
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al eliminar';
      toast.error(msg);
      if (e.response?.data?.inUse) setDeleteConfirm(null);
    } finally { setDeleting(false); }
  };

  const grouped = ingredients.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1>Ingredientes y Costos</h1>
        <button className="btn btn-primary" onClick={openCreateModal}><Plus size={16} />Nuevo Ingrediente</button>
      </div>
      <div className="page-body">
        {priceAlert && (
          <div className="alert alert-warning" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontWeight: 700 }}>
              <AlertTriangle size={16} /> Precios Actualizados Automáticamente
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              {priceAlert.map(p => (
                <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 6 }}>
                  <span>{p.name}</span>
                  <span>Costo: {fmt(p.previousCost)} → <strong style={{ color: 'var(--gold)' }}>{fmt(p.newCost)}</strong> | Sugerido: <strong>{fmt(p.suggestedPrice)}</strong></span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setPriceAlert(null)}>Cerrar</button>
          </div>
        )}

        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--gold)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                {category}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Unidad Compra</th>
                      <th>Cant./Paquete</th>
                      <th>Costo Paquete</th>
                      <th>Costo/Unidad</th>
                      <th>Prioridad</th>
                      <th>Perecedero</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(ing => (
                      <tr key={ing._id}>
                        <td><strong>{ing.name}</strong></td>
                        <td className="text-sm text-gray">{ing.packageUnit || ing.unit}</td>
                        <td>
                          {editing === ing._id && !showModal ? (
                            <input type="number" value={editValues.quantityPerPackage}
                              onChange={e => setEditValues(v => ({ ...v, quantityPerPackage: Number(e.target.value) }))}
                              style={{ width: 80 }} min={1} />
                          ) : ing.quantityPerPackage}
                        </td>
                        <td>
                          {editing === ing._id && !showModal ? (
                            <input type="number" value={editValues.packageCost}
                              onChange={e => setEditValues(v => ({ ...v, packageCost: Number(e.target.value) }))}
                              style={{ width: 110 }} min={0} />
                          ) : <strong>{fmt(ing.packageCost)}</strong>}
                        </td>
                        <td className="text-gold">{fmtDec(ing.costPerUnit)}</td>
                        <td><span className={`badge badge-${ing.priority}`}>{ing.priority}</span></td>
                        <td>{ing.perishable ? '✓' : '—'}</td>
                        <td>
                          {editing === ing._id && !showModal ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-icon" onClick={() => saveEdit(ing._id)} style={{ color: 'var(--green)' }}><Check size={14} /></button>
                              <button className="btn-icon" onClick={() => setEditing(null)} style={{ color: 'var(--red)' }}><X size={14} /></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-icon" title="Edición rápida de precio" onClick={() => startEdit(ing)}><Edit2 size={14} /></button>
                              <button className="btn-icon" title="Editar todo" style={{ color: 'var(--gold)' }} onClick={() => openEditModal(ing)}>✏️</button>
                              <button className="btn-icon" title="Eliminar" style={{ color: 'var(--red)' }} onClick={() => setDeleteConfirm(ing)}><Trash2 size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Nuevo Ingrediente' : `Editar: ${formData.name}`}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="ej: Carne picada" />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidad de medida</label>
                  <input value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))} placeholder="g, ml, unidad..." />
                </div>
                <div className="form-group">
                  <label>Unidad de compra</label>
                  <input value={formData.packageUnit} onChange={e => setFormData(f => ({ ...f, packageUnit: e.target.value }))} placeholder="kg, litro, paquete x50..." />
                </div>
                <div className="form-group">
                  <label>Cantidad por paquete</label>
                  <input type="number" value={formData.quantityPerPackage} onChange={e => setFormData(f => ({ ...f, quantityPerPackage: Number(e.target.value) }))} min={1} />
                </div>
                <div className="form-group">
                  <label>Costo del paquete ($)</label>
                  <input type="number" value={formData.packageCost} onChange={e => setFormData(f => ({ ...f, packageCost: Number(e.target.value) }))} min={0} />
                </div>
                <div className="form-group">
                  <label>Prioridad ABC</label>
                  <select value={formData.priority} onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}>
                    <option value="A">A - Crítico</option>
                    <option value="B">B - Importante</option>
                    <option value="C">C - Secundario</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="perishable" checked={formData.perishable} onChange={e => setFormData(f => ({ ...f, perishable: e.target.checked }))} style={{ width: 'auto' }} />
                  <label htmlFor="perishable" style={{ margin: 0 }}>Es perecedero</label>
                </div>
              </div>
              {formData.quantityPerPackage > 0 && formData.packageCost > 0 && (
                <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: '0.85rem' }}>
                  💡 Costo por unidad: <strong style={{ color: 'var(--gold)' }}>${(formData.packageCost / formData.quantityPerPackage).toFixed(2)}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {modalMode === 'create' ? 'Crear Ingrediente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Eliminar ingrediente</h3>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: 8 }}>
                ¿Eliminar <strong style={{ color: 'white' }}>{deleteConfirm.name}</strong>?
              </p>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#fca5a5' }}>
                ⚠️ Si este ingrediente está en alguna receta, no se podrá eliminar. También se eliminará su registro de stock.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
