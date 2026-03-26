import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Users as UsersIcon } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const ROLES = { admin: 'Administrador', kitchen: 'Cocina', viewer: 'Solo lectura' };
const ROLE_COLORS = { admin: 'badge-confirmed', kitchen: 'badge-preparing', viewer: 'badge-pending' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'kitchen' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfit, setSavingProfit] = useState(false);

  const fetchUsers = () => {
    API.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Completá todos los campos');
    try {
      const res = await API.post('/auth/users', form);
      setUsers(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'kitchen' });
      toast.success('Usuario creado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar usuario?')) return;
    try {
      await API.delete(`/auth/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success('Usuario eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleSaveProfit = async () => {
    const newVal = Number(editUser.profitShare) || 0;
    const total = users.reduce((sum, u) => {
      return sum + (u._id === editUser._id ? newVal : Number(u.profitShare || 0));
    }, 0);

    if (total > 100) {
      toast.error(`El total sería ${total}% — no puede superar el 100%`);
      return;
    }
    setSavingProfit(true);
    try {
      const res = await API.put(`/auth/users/${editUser._id}`, { profitShare: newVal });
      setUsers(prev => prev.map(u => u._id === editUser._id ? res.data : u));
      setEditUser(null);
      toast.success('Porcentaje actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingProfit(false);
    }
  };

  const totalAssigned = users.reduce((sum, u) => sum + Number(u.profitShare || 0), 0);
  const totalColor = totalAssigned > 100 ? '#ef4444' : totalAssigned === 100 ? '#22c55e' : 'var(--gold)';

  return (
    <>
      <div className="page-header">
        <h1>Usuarios</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16}/> Nuevo Usuario
        </button>
      </div>

      <div className="page-body">

        {/* Distribución de ganancias */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <UsersIcon size={16} color="var(--gold)" />
            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: 1, color: 'var(--gold)' }}>
              Distribución de ganancias
            </span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--gray)', marginBottom: 10 }}>
            Asigná el porcentaje de la ganancia neta para cada persona. El total no debería superar el 100%.
          </p>
          <div style={{ background: 'var(--dark)', borderRadius: 6, height: 6, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(totalAssigned, 100)}%`,
              background: totalColor,
              borderRadius: 6,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--gray)' }}>
            Total asignado:{' '}
            <strong style={{ color: totalColor }}>{totalAssigned}%</strong>
            {totalAssigned > 100 && <span style={{ color: '#ef4444', marginLeft: 8, fontSize: '0.78rem' }}>⚠ Excede el 100%</span>}
            {totalAssigned === 100 && <span style={{ color: '#22c55e', marginLeft: 8, fontSize: '0.78rem' }}>✓ Completo</span>}
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'center' }}>% Ganancia</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isEditing = editUser?._id === u._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--black)' }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td className="text-sm text-gray">{u.email}</td>
                      <td><span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLES[u.role]}</span></td>

                      {/* % Ganancia inline editable */}
                      <td style={{ textAlign: 'center', minWidth: 160 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <input
                              type="number" min="0" max="100"
                              value={editUser.profitShare}
                              onChange={e => setEditUser(prev => ({ ...prev, profitShare: e.target.value }))}
                              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gold)', background: 'var(--dark)', color: 'var(--white)', fontSize: '0.9rem', textAlign: 'center' }}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveProfit(); if (e.key === 'Escape') setEditUser(null); }}
                            />
                            <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>%</span>
                            <button className="btn btn-primary btn-sm" onClick={handleSaveProfit} disabled={savingProfit} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                              {savingProfit ? '...' : 'OK'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(null)} style={{ padding: '4px 8px', fontSize: '0.78rem' }}>✕</button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditUser({ ...u })}
                            title="Clic para editar"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 12px', borderRadius: 20, background: u.profitShare > 0 ? 'rgba(232,184,75,0.12)' : 'var(--dark)', border: '1px solid', borderColor: u.profitShare > 0 ? 'var(--gold)' : 'var(--border)', transition: 'all 0.15s ease' }}
                          >
                            <span style={{ fontWeight: 700, color: u.profitShare > 0 ? 'var(--gold)' : 'var(--gray)', fontSize: '0.95rem' }}>
                              {u.profitShare || 0}%
                            </span>
                            <Pencil size={11} color="var(--gray)" />
                          </div>
                        )}
                      </td>

                      <td className="text-sm text-gray">{new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>
                          <Trash2 size={13}/> Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nuevo Usuario</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" />
              </div>
              <div className="form-group">
                <label>Contraseña *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Administrador — acceso total</option>
                  <option value="kitchen">Cocina — solo confirmar pedidos</option>
                  <option value="viewer">Solo lectura</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Crear Usuario</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}