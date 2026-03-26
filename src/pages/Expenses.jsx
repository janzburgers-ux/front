import { useState, useEffect } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const CATEGORIES = ['Insumos', 'Mantenimiento', 'Marketing', 'Personal', 'Servicios', 'Equipamiento', 'Otro'];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Otro', date: new Date().toISOString().split('T')[0], notes: '' });
  const [filter, setFilter] = useState('all');

  const load = () => {
    API.get('/expenses').then(r => setExpenses(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.description || !form.amount) { toast.error('Descripción e importe son obligatorios'); return; }
    try {
      const res = await API.post('/expenses', form);
      setExpenses(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ description: '', amount: '', category: 'Otro', date: new Date().toISOString().split('T')[0], notes: '' });
      toast.success('Gasto registrado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await API.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e._id !== id));
      toast.success('Gasto eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const months = [...new Set(expenses.map(e => e.date?.slice(0, 7)))].sort().reverse();
  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.date?.startsWith(filter));
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = filtered.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1><Receipt size={20} style={{ display: 'inline', marginRight: 8 }} />Gastos Variables</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Registrar gasto
        </button>
      </div>

      <div className="page-body">

        {/* Filtro por mes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>
            Todos
          </button>
          {months.slice(0, 6).map(m => (
            <button key={m} onClick={() => setFilter(m)} className={`btn btn-sm ${filter === m ? 'btn-primary' : 'btn-secondary'}`}>
              {new Date(m + '-01').toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
            </button>
          ))}
        </div>

        {/* Resumen */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total {filter === 'all' ? 'histórico' : 'del período'}</div>
            <div className="stat-value" style={{ color: 'var(--red)', fontSize: '1.6rem' }}>{fmt(totalFiltered)}</div>
          </div>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Por categoría</div>
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, amt]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                <span style={{ color: 'var(--gray-light)' }}>{cat}</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{fmt(amt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧾</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', marginBottom: 8 }}>Sin gastos registrados</div>
            <div style={{ fontSize: '0.85rem' }}>Registrá gastos inesperados para que se descuenten de tus ganancias</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Importe</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e._id}>
                    <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>
                      {new Date(e.date).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.description}</td>
                    <td>
                      <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, padding: '2px 10px', fontSize: '0.72rem', color: 'var(--gray-light)' }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(e.amount)}</td>
                    <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{e.notes || '—'}</td>
                    <td>
                      <button className="btn-icon" onClick={() => handleDelete(e._id)} style={{ color: 'var(--red)' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🧾 Registrar Gasto</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Descripción *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Compra de aceite extra, repuesto de freidora..." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Importe *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Notas (opcional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Detalles adicionales..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
