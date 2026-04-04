
import { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function PushNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [form, setForm] = useState({ title: '', body: '', icon: '🍔', scheduledAt: '' });
  const [showForm, setShowForm]           = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        API.get('/push/notifications'),
        API.get('/push/subscribers/count'),
      ]);
      setNotifications(notifRes.data || []);
      setSubscriberCount(countRes.data?.count || 0);
    } catch {}
    finally { setLoading(false); }
  };

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Completá título y mensaje'); return; }
    setSending(true);
    try {
      await API.post('/push/send', form);
      toast.success('Notificación enviada 🚀');
      setForm({ title: '', body: '', icon: '🍔', scheduledAt: '' });
      setShowForm(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Error al enviar'); }
    finally { setSending(false); }
  };

  const deleteNotif = async (id) => {
    try { await API.delete(`/push/notifications/${id}`); setNotifications(n => n.filter(x => x._id !== id)); toast.success('Eliminada'); } catch { toast.error('Error'); }
  };

  const ICONS = ['🍔', '🍟', '🎉', '🔥', '⭐', '🎁', '🛵', '📢', '🕐'];

  const s = {
    card: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 16 },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', padding: '11px 14px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    label: { fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 },
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E8B84B', marginBottom: 4 }}>Notificaciones Push</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Enviá notificaciones a todos los clientes que aceptaron recibirlas.</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: '#E8B84B', color: '#000', border: 'none', padding: '11px 20px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
          + Nueva notificación
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Suscriptores activos', value: subscriberCount, icon: '📱' },
          { label: 'Enviadas hoy', value: notifications.filter(n => new Date(n.sentAt).toDateString() === new Date().toDateString()).length, icon: '📤' },
          { label: 'Total enviadas', value: notifications.length, icon: '📊' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {!pushSupported && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: '0.85rem', marginBottom: 20 }}>
          ⚠️ Tu navegador no soporta notificaciones push. Usá Chrome o Edge para gestionar esto.
        </div>
      )}

      {!VAPID_PUBLIC_KEY && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, color: '#f59e0b', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>
          ⚙️ <strong>Configuración pendiente:</strong> Agregá <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>REACT_APP_VAPID_PUBLIC_KEY</code> en el <code>.env</code> del frontend y <code>VAPID_PUBLIC_KEY</code> / <code>VAPID_PRIVATE_KEY</code> en el backend. Generá las claves con: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>npx web-push generate-vapid-keys</code>
        </div>
      )}

      {/* Modal nueva notificación */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', marginBottom: 20 }}>Nueva notificación push</div>

            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Ícono</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${form.icon === icon ? '#E8B84B' : 'rgba(255,255,255,0.1)'}`, background: form.icon === icon ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)', fontSize: '1.2rem', cursor: 'pointer' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: ¡Janz abrió! 🍔" style={s.input} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Mensaje *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Ej: Vení a probar la nueva CAVA con doble cheddar. Solo por hoy 2×1." rows={3} style={{ ...s.input, resize: 'vertical', lineHeight: 1.5 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Programar envío (opcional)</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} style={s.input} />
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Si dejás vacío, se envía ahora.</div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20, padding: '14px 16px', background: '#0a0a0a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Preview</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{form.icon || '🍔'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{form.title || 'Título de la notificación'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 3, lineHeight: 1.4 }}>{form.body || 'Mensaje de la notificación...'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', marginTop: 4 }}>Janz Burgers · ahora</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#666', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={send} disabled={sending} style={{ flex: 2, padding: '12px', borderRadius: 10, background: sending ? '#222' : '#E8B84B', border: 'none', color: sending ? '#555' : '#000', fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                {sending ? 'Enviando...' : form.scheduledAt ? '📅 Programar' : '🚀 Enviar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Historial</div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div>No enviaste notificaciones todavía</div>
        </div>
      ) : (
        notifications.map(n => (
          <div key={n._id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{n.icon || '🍔'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{n.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: 3 }}>{n.body}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>📅 {new Date(n.sentAt || n.createdAt).toLocaleString('es-AR')}</span>
                    <span style={{ fontSize: '0.72rem', color: '#22c55e' }}>📱 {n.delivered || 0} entregadas</span>
                    {n.scheduledAt && !n.sent && <span style={{ fontSize: '0.72rem', color: '#E8B84B' }}>⏰ Programada para {new Date(n.scheduledAt).toLocaleString('es-AR')}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteNotif(n._id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '1rem', padding: '4px', flexShrink: 0 }}>✕</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
