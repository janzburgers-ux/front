import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Settings, X, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt  = n  => `$${Number(n || 0).toLocaleString('es-AR')}`;
const fmtD = dt => {
  if (!dt) return '';
  const [y, m, d] = (typeof dt === 'string' ? dt : dt.toISOString()).split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const VIEWS = [
  { id: 'dia',   label: 'Día' },
  { id: 'finde', label: 'Finde' },
  { id: 'mes',   label: 'Mes' },
  { id: 'año',   label: 'Año' },
];

const TYPE_META = {
  sale:       { label: 'Venta',    dir: 'in',  color: 'var(--color-text-success)',  bg: 'var(--color-background-success)' },
  expense:    { label: 'Gasto',    dir: 'out', color: 'var(--color-text-danger)',   bg: 'var(--color-background-danger)'  },
  purchase:   { label: 'Compra',   dir: 'out', color: 'var(--color-text-warning)',  bg: 'var(--color-background-warning)' },
  withdrawal: { label: 'Retiro',   dir: 'out', color: 'var(--color-text-tertiary)', bg: 'var(--color-background-secondary)' },
  other:      { label: 'Otro',     dir: 'out', color: 'var(--color-text-danger)',   bg: 'var(--color-background-danger)'  },
};

const MEMBER_COLORS = ['#E8B84B', '#818cf8', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];

// ── Navegar períodos ─────────────────────────────────────────────────────────
function navRef(view, ref, delta) {
  if (view === 'dia') {
    const d = new Date(ref + 'T12:00:00'); d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
  }
  if (view === 'finde') {
    const d = new Date(ref + 'T12:00:00'); d.setDate(d.getDate() + delta * 7);
    return d.toISOString().split('T')[0];
  }
  if (view === 'mes') {
    const [y, m] = ref.split('-').map(Number);
    let nm = m + delta, ny = y;
    if (nm > 12) { nm = 1; ny++; } if (nm < 1) { nm = 12; ny--; }
    return `${ny}-${String(nm).padStart(2, '0')}`;
  }
  if (view === 'año') return String(Number(ref) + delta);
  return ref;
}

function defaultRef(view) {
  const now = new Date();
  if (view === 'dia')   return now.toISOString().split('T')[0];
  if (view === 'mes')   return now.toISOString().slice(0, 7);
  if (view === 'año')   return String(now.getFullYear());
  // finde: viernes correspondiente
  const day = now.getDay();
  const offset = -((day - 5 + 7) % 7);
  const fri = new Date(now); fri.setDate(now.getDate() + offset);
  return fri.toISOString().split('T')[0];
}

function formatPeriodLabel(view, ref) {
  if (!ref) return '';
  if (view === 'dia') {
    return new Date(ref + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (view === 'finde') {
    const fri = new Date(ref + 'T12:00:00');
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    return `${fri.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (view === 'mes') {
    const [y, m] = ref.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
  return ref;
}

// ── Modal de nuevo movimiento ─────────────────────────────────────────────────
function MovModal({ members, defaultDate, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'purchase', description: '', amount: '',
    paymentMethod: 'efectivo', memberId: '', date: defaultDate, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0)
      return toast.error('Descripción e importe son obligatorios');
    if (form.type === 'withdrawal' && !form.memberId)
      return toast.error('Seleccioná a quién corresponde el retiro');
    setSaving(true);
    try {
      const res = await API.post('/cash-movements', {
        ...form, amount: Number(form.amount)
      });
      toast.success('Movimiento registrado');
      onCreated(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: 'white', padding: '11px 14px', fontSize: '0.88rem',
    outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.35)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.1em'
  };

  const TYPE_OPTS = [
    { value: 'purchase',   label: '🛒 Compra de materiales' },
    { value: 'withdrawal', label: '💸 Retiro de ganancia'   },
    { value: 'other',      label: '📌 Otro egreso'          },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#0f0f0f', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Registrar movimiento</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tipo *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TYPE_OPTS.map(opt => (
              <button key={opt.value} onClick={() => set('type', opt.value)}
                style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: form.type === opt.value ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.04)', color: form.type === opt.value ? '#E8B84B' : '#666', outline: form.type === opt.value ? '1.5px solid rgba(232,184,75,0.4)' : 'none' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Integrante (solo si es retiro) */}
        {form.type === 'withdrawal' && members.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Integrante *</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {members.map((m, i) => (
                <button key={m.id} onClick={() => set('memberId', m.id)}
                  style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: 'none', background: form.memberId === m.id ? MEMBER_COLORS[i % MEMBER_COLORS.length] : 'rgba(255,255,255,0.05)', color: form.memberId === m.id ? '#000' : '#666' }}>
                  {m.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>({m.percent}%)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Descripción *</label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            placeholder={form.type === 'purchase' ? 'Ej: Carnicería Los Amigos' : form.type === 'withdrawal' ? 'Ej: Retiro semana del 27/06' : 'Descripción del gasto'}
            style={inputStyle} />
        </div>

        {/* Importe + medio de pago */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Importe *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0" style={inputStyle} min="0" />
          </div>
          <div>
            <label style={labelStyle}>Medio de pago</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 'efectivo', l: '💵 Efectivo' }, { v: 'digital', l: '🏦 Digital' }].map(({ v, l }) => (
                <button key={v} onClick={() => set('paymentMethod', v)}
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', border: 'none', background: form.paymentMethod === v ? '#E8B84B' : 'rgba(255,255,255,0.05)', color: form.paymentMethod === v ? '#000' : '#555' }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
        </div>

        {/* Notas */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notas (opcional)</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Detalle adicional..." style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: 13, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, background: saving ? '#222' : '#E8B84B', color: saving ? '#555' : '#000', border: 'none', padding: 13, borderRadius: 10, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
            {saving ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de integrantes ──────────────────────────────────────────────────────
function MembersModal({ members: initial, onClose, onSaved }) {
  const [members, setMembers] = useState(
    initial.length > 0 ? initial : [{ id: 'admin', name: 'Admin', percent: 100 }]
  );
  const [saving, setSaving] = useState(false);
  const totalPct = members.reduce((s, m) => s + Number(m.percent || 0), 0);

  const update = (idx, key, val) => setMembers(ms => ms.map((m, i) => i === idx ? { ...m, [key]: val } : m));
  const add    = () => setMembers(ms => [...ms, { id: `member_${Date.now()}`, name: '', percent: 0 }]);
  const remove = idx => setMembers(ms => ms.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (totalPct > 100) return toast.error(`Los porcentajes suman ${totalPct}% (máximo 100%)`);
    if (members.some(m => !m.name.trim())) return toast.error('Todos los integrantes deben tener nombre');
    setSaving(true);
    try {
      await API.put('/cash-movements/members', { members });
      toast.success('Integrantes guardados');
      onSaved(members);
    } catch (e) { toast.error(e.response?.data?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: '0.85rem', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
      <div style={{ background: '#0f0f0f', borderRadius: 18, width: '100%', maxWidth: 440, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>Integrantes</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
          Definí quién cobra qué porcentaje de la ganancia neta. Los retiros quedarán limitados a ese porcentaje.
        </div>

        {members.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }} />
            <input value={m.name} onChange={e => update(i, 'name', e.target.value)}
              placeholder="Nombre" style={{ ...inputStyle, flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" value={m.percent} onChange={e => update(i, 'percent', Number(e.target.value))}
                min="0" max="100" style={{ ...inputStyle, width: 62, textAlign: 'right' }} />
              <span style={{ color: '#555', fontSize: '0.8rem' }}>%</span>
            </div>
            {members.length > 1 && (
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
          <button onClick={add} style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.1)', color: '#555', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }}>+ Agregar integrante</button>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: totalPct > 100 ? '#ef4444' : totalPct === 100 ? '#22c55e' : '#E8B84B' }}>
            Total: {totalPct}%
          </div>
        </div>

        {totalPct < 100 && totalPct > 0 && (
          <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: '0.75rem', color: '#E8B84B' }}>
            ⚠️ El {100 - totalPct}% restante no está asignado a nadie — no podrá retirarse.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#666', border: '1px solid rgba(255,255,255,0.08)', padding: 11, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || totalPct > 100}
            style={{ flex: 2, background: saving || totalPct > 100 ? '#222' : '#E8B84B', color: saving || totalPct > 100 ? '#555' : '#000', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CajaGlobal() {
  const [view, setView] = useState('finde');
  const [ref,  setRef]  = useState(() => defaultRef('finde'));

  const [summary,   setSummary]   = useState(null);
  const [movements, setMovements] = useState([]);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [movLoading, setMovLoading] = useState(true);

  const [showMov,     setShowMov]     = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [deleting,    setDeleting]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setMovLoading(true);
    try {
      const [sumRes, movRes, memRes] = await Promise.all([
        API.get(`/cash-movements/summary?view=${view}&ref=${ref}`),
        API.get(`/cash-movements/movements?view=${view}&ref=${ref}`),
        API.get('/cash-movements/members'),
      ]);
      setSummary(sumRes.data);
      setMovements(movRes.data);
      setMembers(memRes.data);
    } catch (e) { toast.error('Error al cargar datos'); }
    finally { setLoading(false); setMovLoading(false); }
  }, [view, ref]);

  useEffect(() => { load(); }, [load]);

  const handleViewChange = (v) => { setView(v); setRef(defaultRef(v)); };
  const handleNav = (delta) => setRef(r => navRef(view, r, delta));

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/cash-movements/${id}`);
      toast.success('Movimiento eliminado');
      load();
    } catch (e) { toast.error('Error al eliminar'); }
    finally { setDeleting(null); }
  };

  // Agrupar movimientos por fecha
  const byDate = movements.reduce((acc, m) => {
    const d = m.date?.split('T')[0] || m.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(m);
    return acc;
  }, {});

  const s = summary;

  return (
    <>
      {showMov && (
        <MovModal
          members={members}
          defaultDate={new Date().toISOString().split('T')[0]}
          onClose={() => setShowMov(false)}
          onCreated={() => { setShowMov(false); load(); }}
        />
      )}
      {showMembers && (
        <MembersModal
          members={members}
          onClose={() => setShowMembers(false)}
          onSaved={(m) => { setMembers(m); setShowMembers(false); load(); }}
        />
      )}

      <div className="page-header">
        <h1>💰 Caja global</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowMembers(true)}>
            <Settings size={14} /> Integrantes
          </button>
          <button className="btn btn-primary" onClick={() => setShowMov(true)}>
            <Plus size={14} /> Registrar
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Selector de vista */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => handleViewChange(v.id)}
              style={{ padding: '7px 16px', borderRadius: 100, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: view === v.id ? '#E8B84B' : 'var(--card)', color: view === v.id ? '#000' : 'var(--gray)' }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Navegador de período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => handleNav(-1)} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: 'var(--white)', textTransform: 'capitalize' }}>
            {formatPeriodLabel(view, ref)}
          </div>
          <button onClick={() => handleNav(1)} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : s ? (
          <>
            {/* Cards de resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Recaudado',      value: fmt(s.sales.total),    color: '#22c55e', sub: `💵 ${fmt(s.sales.efectivo)} · 🏦 ${fmt(s.sales.digital)}` },
                { label: 'Total egresos',  value: fmt(s.totalOut),       color: '#ef4444', sub: `Compras + gastos + otros` },
                { label: 'Ganancia neta',  value: fmt(s.netProfit),      color: s.netProfit >= 0 ? '#E8B84B' : '#ef4444', sub: 'Antes de retiros' },
                { label: 'Efectivo en mano', value: fmt(s.balanceEfectivo), color: s.balanceEfectivo >= 0 ? 'white' : '#ef4444', sub: 'Saldo disponible' },
              ].map((c, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-label">{c.label}</div>
                  <div className="stat-value" style={{ color: c.color, fontSize: '1.25rem' }}>{c.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Panel de integrantes */}
            {s.membersStatus?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="section-header"><div className="section-title">Ganancia por integrante</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {s.membersStatus.map((m, i) => {
                    const color   = MEMBER_COLORS[i % MEMBER_COLORS.length];
                    const pct     = m.entitled > 0 ? Math.min(100, Math.round(m.withdrawn / m.entitled * 100)) : 0;
                    const isMaxed = m.available === 0 && m.entitled > 0;
                    return (
                      <div key={m.id} className="card" style={{ borderColor: isMaxed ? 'rgba(34,197,94,0.3)' : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</div>
                          <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--gray)' }}>{m.percent}%</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                          <span style={{ color: 'var(--gray)' }}>Le corresponde</span>
                          <span style={{ color, fontWeight: 700 }}>{fmt(m.entitled)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 8 }}>
                          <span style={{ color: 'var(--gray)' }}>Ya retiró</span>
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(m.withdrawn)}</span>
                        </div>
                        {/* Barra de progreso */}
                        <div style={{ height: 5, background: 'var(--dark)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: m.available > 0 ? '#22c55e' : 'var(--gray)' }}>
                          {m.available > 0 ? `Disponible: ${fmt(m.available)}` : isMaxed ? '✓ Retiro completo' : 'Sin ganancia aún'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aviso si no hay integrantes configurados */}
            {s.membersStatus?.length === 0 && (
              <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>No hay integrantes configurados. <button onClick={() => setShowMembers(true)} style={{ background: 'none', border: 'none', color: '#E8B84B', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}>Configurar ahora →</button></span>
              </div>
            )}

            {/* Desglose de egresos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Compras', value: s.purchases.total, color: '#f59e0b' },
                { label: 'Gastos',  value: s.expenses.total,  color: '#ef4444' },
                { label: 'Retiros', value: s.withdrawals.total, color: 'var(--gray)' },
              ].map((item, i) => (
                <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-value" style={{ color: item.color, fontSize: '1.1rem' }}>{fmt(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Lista de movimientos */}
            <div className="section-header"><div className="section-title">Movimientos</div></div>

            {movLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : movements.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--gray)', fontSize: '0.88rem' }}>
                Sin movimientos en este período
              </div>
            ) : (
              Object.entries(byDate).sort().map(([date, movs]) => (
                <div key={date} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 2 }}>
                    {fmtD(date)} · {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })}
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {movs.map((m, idx) => {
                      const meta = TYPE_META[m.type] || TYPE_META.other;
                      const isIn = m.direction === 'in';
                      return (
                        <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < movs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: meta.color, flexShrink: 0 }}>
                            {isIn ? '↑' : '↓'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.description}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>
                              <span style={{ background: 'var(--dark)', padding: '1px 6px', borderRadius: 4, marginRight: 5 }}>{meta.label}</span>
                              {m.meta && <span>{m.meta}</span>}
                              {m.paymentMethod === 'digital' && <span style={{ color: '#818cf8', marginLeft: 5 }}>🏦</span>}
                              {m.isAuto && <span style={{ color: '#444', marginLeft: 5 }}>Auto</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isIn ? '#22c55e' : meta.color }}>
                              {isIn ? '+' : '-'}{fmt(m.amount)}
                            </div>
                          </div>
                          {!m.isAuto && (
                            <button onClick={() => handleDelete(m._id)} disabled={deleting === m._id}
                              style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4, opacity: deleting === m._id ? 0.4 : 1 }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
