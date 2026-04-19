import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, RefreshCw, Trash2, CheckSquare, Square } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const REASON_LABELS = {
  sin_stock: { label: 'Sin stock', color: 'var(--red)', emoji: '📦' },
  cocina_cerrada: { label: 'Cocina cerrada', color: 'var(--yellow)', emoji: '🔒' },
  otro: { label: 'Otro motivo', color: 'var(--gray)', emoji: '❓' }
};

export default function RejectedOrders() {
  const [rejected, setRejected] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setSelected(new Set());

    Promise.all([
      API.get('/rejected-orders'),
      API.get('/rejected-orders/stats').catch(() => null)
    ])
      .then(([r, s]) => {
        setRejected(r.data || []);
        if (s) setStats(s.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rejected.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rejected.map(r => r._id)));
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;

    if (!window.confirm(`¿Eliminar ${selected.size} pedido(s)?`)) return;

    setDeleting(true);
    try {
      await API.delete('/rejected-orders', { data: { ids: [...selected] } });
      toast.success('Eliminados');
      load();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm('¿Eliminar TODOS los pedidos rechazados?')) return;

    setDeleting(true);
    try {
      await API.delete('/rejected-orders', { data: { all: true } });
      toast.success('Historial limpiado');
      load();
    } catch {
      toast.error('Error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSingle = async (id, e) => {
    e.stopPropagation();

    if (!window.confirm('¿Eliminar este registro?')) return;

    try {
      await API.delete(`/rejected-orders/${id}`);
      setRejected(prev => prev.filter(r => r._id !== id));
      setSelected(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      toast.success('Eliminado');
    } catch {
      toast.error('Error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>
          <XCircle size={20} /> Pedidos Rechazados
        </h1>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load}>
            <RefreshCw size={14} /> Actualizar
          </button>

          {selected.size > 0 && (
            <button onClick={deleteSelected}>
              <Trash2 size={14} /> Eliminar ({selected.size})
            </button>
          )}

          {rejected.length > 0 && (
            <button onClick={deleteAll}>
              <Trash2 size={14} /> Limpiar todo
            </button>
          )}
        </div>
      </div>

      <div className="page-body">

        {/* STATS */}
        {stats && (
          <div style={{ marginBottom: 20 }}>
            <div>Total: {stats.total}</div>
            <div>Mes: {stats.thisMonth}</div>
            <div>Perdido: {fmt(stats.totalLost)}</div>
          </div>
        )}

        {/* LISTA */}
        {rejected.length === 0 ? (
          <div>No hay pedidos rechazados</div>
        ) : (
          <>
            <button onClick={toggleAll} style={{ marginBottom: 10 }}>
              {selected.size === rejected.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>

            {rejected.map(r => {
              const reason = REASON_LABELS[r.reason] || REASON_LABELS.otro;
              const isSelected = selected.has(r._id);

              return (
                <div
                  key={r._id}
                  onClick={() => toggleSelect(r._id)}
                  style={{
                    border: isSelected ? '2px solid gold' : '1px solid gray',
                    padding: 10,
                    marginBottom: 10,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{r.publicCode || r.orderNumber}</strong>
                      <div>{r.client?.name}</div>
                    </div>

                    <div>-{fmt(r.total)}</div>
                  </div>

                  <div>{reason.emoji} {reason.label}</div>

                  <button onClick={(e) => deleteSingle(r._id, e)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}