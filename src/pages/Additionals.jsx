import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const CATEGORIES = [
  { key: 'hamburguesa', label: '🍔 Hamburguesa', desc: 'Medallón, cheddar (feta), panceta (feta), huevo frito...' },
  { key: 'papas',       label: '🍟 Papas',        desc: 'Cheddar líquido, panceta picada...' },
  { key: 'salsa',       label: '🫙 Salsas',        desc: 'Salsas y aderezos' },
];

// Opciones de "aplica a" — controla en qué tipo de producto aparece al cliente
const APPLIES_TO_OPTIONS = [
  {
    v: 'burger',
    l: '🍔 Solo burger',
    desc: 'Aparece al personalizar hamburguesas (no en papas solas)',
  },
  {
    v: 'papas',
    l: '🍟 Solo papas',
    desc: 'Aparece al personalizar papas (no en hamburguesas)',
  },
  {
    v: 'todos',
    l: '🌐 Todos',
    desc: 'Aparece en cualquier tipo de producto',
  },
];

// Default de appliesTo según la categoría del tab activo
function defaultAppliesTo(tab) {
  if (tab === 'hamburguesa') return 'burger';
  if (tab === 'papas') return 'papas';
  return 'todos'; // salsas → aplica a todos por defecto
}

const EMOJI_SUGGESTIONS = {
  hamburguesa: ['🥩','🧀','🥓','🍳','🥚','🧅','🌶️','🍖','➕'],
  papas:       ['🧀','🥓','🫙','🌶️','🧂','🧄','➕'],
  salsa:       ['🫙','🌶️','🧄','🍅','🫒','🥫','💛','❤️','🤍'],
};

const EMPTY_FORM = { name: '', description: '', price: 0, emoji: '', appliesTo: 'burger' };

export default function Additionals() {
  const [tab, setTab]             = useState('hamburguesa');
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [editVals, setEditVals]   = useState({});
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const fetchAll = () => {
    setLoading(true);
    API.get('/additionals/all')
      .then(r => setItems(r.data))
      .catch(() => API.get('/additionals').then(r => setItems(r.data)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Cuando cambia el tab, resetear el appliesTo del form al default correcto
  useEffect(() => {
    setForm(f => ({ ...f, appliesTo: defaultAppliesTo(tab) }));
  }, [tab]);

  const visible = items.filter(i => i.category === tab);
  const currentCat = CATEGORIES.find(c => c.key === tab);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      const payload = {
        ...form,
        category: tab,
        price: Number(form.price) || 0,
        appliesTo: form.appliesTo || defaultAppliesTo(tab),
      };
      const res = await API.post('/additionals', payload);
      setItems(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({ ...EMPTY_FORM, appliesTo: defaultAppliesTo(tab) });
      toast.success('Adicional creado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear');
    } finally { setSaving(false); }
  };

  const startEdit = (item) => {
    setEditItem(item._id);
    setEditVals({
      name: item.name,
      description: item.description || '',
      price: item.price,
      emoji: item.emoji || '',
      appliesTo: item.appliesTo || defaultAppliesTo(item.category),
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      const res = await API.put(`/additionals/${id}`, {
        name: editVals.name,
        description: editVals.description,
        price: Number(editVals.price) || 0,
        emoji: editVals.emoji,
        appliesTo: editVals.appliesTo,
      });
      setItems(prev => prev.map(i => i._id === id ? res.data : i));
      setEditItem(null);
      toast.success('Guardado');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    try {
      await API.delete(`/additionals/${id}`);
      setItems(prev => prev.filter(i => i._id !== id));
      toast.success('Eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  // Label corto para mostrar en tabla
  const appliesToLabel = (val) => {
    if (val === 'burger') return '🍔 Solo burger';
    if (val === 'papas')  return '🍟 Solo papas';
    return '🌐 Todos';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1>Adicionales</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_FORM, appliesTo: defaultAppliesTo(tab) }); setShowModal(true); }}>
          <Plus size={16} /> Nuevo adicional
        </button>
      </div>

      <div className="page-body">

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setTab(cat.key)}
              className={`btn btn-sm ${tab === cat.key ? 'btn-primary' : 'btn-secondary'}`}>
              {cat.label}
              <span style={{ marginLeft: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 100, padding: '1px 7px', fontSize: '0.65rem', fontWeight: 700 }}>
                {items.filter(i => i.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Descripción de la categoría */}
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--gray-light)' }}>
          💡 {currentCat?.desc}
          <span style={{ marginLeft: 12, color: 'var(--gray)', fontSize: '0.75rem' }}>
            El campo <strong style={{ color: 'white' }}>Aplica a</strong> controla en qué tipos de producto el cliente puede elegir este adicional.
          </span>
        </div>

        {/* Lista */}
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{tab === 'hamburguesa' ? '🍔' : tab === 'papas' ? '🍟' : '🫙'}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', marginBottom: 8 }}>Sin adicionales en esta categoría</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...EMPTY_FORM, appliesTo: defaultAppliesTo(tab) }); setShowModal(true); }}>
              <Plus size={13} /> Agregar el primero
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Adicional</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>Aplica a</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(item => (
                  <tr key={item._id}>
                    {editItem === item._id ? (
                      <>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input value={editVals.emoji} onChange={e => setEditVals(v => ({ ...v, emoji: e.target.value }))}
                              style={{ width: 48 }} placeholder="emoji" />
                            <input value={editVals.name} onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                              style={{ flex: 1 }} />
                          </div>
                        </td>
                        <td>
                          <input value={editVals.description} onChange={e => setEditVals(v => ({ ...v, description: e.target.value }))}
                            placeholder="Descripción opcional" />
                        </td>
                        <td>
                          <input type="number" value={editVals.price} onChange={e => setEditVals(v => ({ ...v, price: e.target.value }))}
                            style={{ width: 100 }} />
                        </td>
                        <td>
                          <select value={editVals.appliesTo} onChange={e => setEditVals(v => ({ ...v, appliesTo: e.target.value }))}
                            style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'white', padding: '6px 10px', fontSize: '0.82rem' }}>
                            {APPLIES_TO_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-icon" onClick={() => handleSaveEdit(item._id)} disabled={saving}
                              style={{ color: 'var(--green)' }}><Check size={14} /></button>
                            <button className="btn-icon" onClick={() => setEditItem(null)}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.emoji} {item.name}</div>
                        </td>
                        <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{item.description || '—'}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(item.price)}</td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--gray-light)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                            {appliesToLabel(item.appliesTo || defaultAppliesTo(item.category))}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-icon" onClick={() => startEdit(item)}><Pencil size={13} /></button>
                            <button className="btn-icon" onClick={() => handleDelete(item._id)}
                              style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{currentCat?.label} — Nuevo adicional</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Emoji</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {EMOJI_SUGGESTIONS[tab]?.map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      style={{ fontSize: '1.3rem', background: form.emoji === e ? 'rgba(232,184,75,0.2)' : 'var(--dark)', border: `1px solid ${form.emoji === e ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
                <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="O escribí un emoji..." />
              </div>
              <div className="form-group">
                <label>Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={tab === 'hamburguesa' ? 'Ej: Cheddar feta' : tab === 'papas' ? 'Ej: Cheddar líquido' : 'Ej: Salsa cheddar'} />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Feta de queso cheddar fundido" />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>

              {/* Aplica a */}
              <div className="form-group">
                <label>¿En qué productos aparece esta opción al cliente?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {APPLIES_TO_OPTIONS.map(opt => (
                    <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, appliesTo: opt.v }))}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                        padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: form.appliesTo === opt.v ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.03)',
                        outline: form.appliesTo === opt.v ? '1.5px solid rgba(232,184,75,0.4)' : '1px solid var(--border)',
                      }}>
                      <div style={{ fontSize: '1.1rem', marginTop: 1 }}>{opt.v === 'burger' ? '🍔' : opt.v === 'papas' ? '🍟' : '🌐'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: form.appliesTo === opt.v ? '#E8B84B' : 'white' }}>{opt.l}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? '...' : 'Crear adicional'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
