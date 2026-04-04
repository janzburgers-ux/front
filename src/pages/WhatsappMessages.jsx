import { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const TEMPLATES = [
  {
    key: 'orderReceived',
    label: '📥 Pedido recibido',
    desc: 'Se envía inmediatamente cuando el cliente confirma el pedido.',
    vars: ['{nombre}', '{codigo}']
  },
  {
    key: 'orderConfirmed',
    label: '✅ Pedido confirmado por cocina',
    desc: 'Se envía cuando la cocina confirma y asigna tiempo estimado.',
    vars: ['{nombre}', '{codigo}', '{total}', '{items}', '{descuento}', '{metodoPago}', '{alias}', '{tiempoEstimado}']
  },
  {
    key: 'orderReady',
    label: '🛵 Pedido listo / en camino',
    desc: 'Se envía cuando el pedido pasa a estado "listo" o "en camino".',
    vars: ['{nombre}', '{codigo}', '{total}', '{metodoPago}', '{alias}', '{tipoEntrega}']
  },
  {
    key: 'orderCancelled',
    label: '❌ Pedido cancelado',
    desc: 'Se envía cuando el pedido es cancelado por falta de stock u otro motivo.',
    vars: ['{nombre}', '{codigo}']
  },
];

const DEFAULTS = {
  orderReceived:
    `¡Hola {nombre}! 👋\n\nRecibimos tu pedido *{codigo}* ✅\n\nEn breve te confirmamos cuando la cocina lo apruebe.\n\n_Janz Burgers_ 🍔`,
  orderConfirmed:
    `¡Hola {nombre}! 🔥\n\nTu pedido *{codigo}* fue *confirmado por la cocina* y ya está en preparación.\n{tiempoEstimado}\n\n*Detalle del pedido:*\n{items}{descuento}\n\n💰 *Total: {total}*\n{metodoPago}\n\n_Janz Burgers_ 🍔`,
  orderReady:
    `¡Hola {nombre}! 🛵\n\nTu pedido *{codigo}* está *en camino*. ✅\n\nEn instantes llega a tu puerta.\n{metodoPago}\n\n_Janz Burgers_ 🍔`,
  orderCancelled:
    `¡Hola {nombre}! 😔\n\nTe avisamos que tu pedido *{codigo}* fue cancelado porque en este momento no contamos con stock suficiente.\n\nDisculpá las molestias. Podés volver a pedir en nuestra próxima jornada.\n\n_Janz Burgers_ 🍔`,
};

export default function WhatsappMessages() {
  const [templates, setTemplates] = useState({ ...DEFAULTS });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState('');
  const [active, setActive]       = useState('orderReceived');

  useEffect(() => {
    API.get('/whatsapp-templates')
      .then(r => setTemplates({ ...DEFAULTS, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (key) => {
    setSaving(key);
    try {
      await API.put('/whatsapp-templates', { key, template: templates[key] });
      toast.success('Template guardado');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(''); }
  };

  const reset = (key) => {
    setTemplates(t => ({ ...t, [key]: DEFAULTS[key] }));
    toast('Template restaurado al default', { icon: '↩️' });
  };

  const insertVar = (key, varName) => {
    setTemplates(t => ({ ...t, [key]: (t[key] || '') + varName }));
  };

  const currentTemplate = TEMPLATES.find(t => t.key === active);

  const s = {
    card: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 20 },
    label: { fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 },
    textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', padding: '14px', fontSize: '0.88rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6, boxSizing: 'border-box', minHeight: 200 },
    tab: (active) => ({ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s', background: active ? '#E8B84B' : 'rgba(255,255,255,0.05)', color: active ? '#000' : '#666', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }),
    varBtn: { padding: '4px 10px', borderRadius: 6, background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.25)', color: '#E8B84B', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E8B84B', marginBottom: 4 }}>Mensajes de WhatsApp</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Personalizá los mensajes automáticos que recibe el cliente. Usá las variables entre llaves para insertar datos dinámicos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Tabs laterales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TEMPLATES.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} style={s.tab(active === t.key)}>
              <span style={{ fontSize: '1rem' }}>{t.label.split(' ')[0]}</span>
              <span style={{ fontSize: '0.78rem' }}>{t.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>

        {/* Editor */}
        {currentTemplate && (
          <div>
            <div style={s.card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: 4 }}>{currentTemplate.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{currentTemplate.desc}</div>
              </div>

              {/* Variables disponibles */}
              <div style={{ marginBottom: 14 }}>
                <span style={s.label}>Variables disponibles — hacé clic para insertar al final</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentTemplate.vars.map(v => (
                    <button key={v} style={s.varBtn} onClick={() => insertVar(currentTemplate.key, v)}>{v}</button>
                  ))}
                </div>
              </div>

              <span style={s.label}>Mensaje</span>
              <textarea
                value={templates[currentTemplate.key] || ''}
                onChange={e => setTemplates(t => ({ ...t, [currentTemplate.key]: e.target.value }))}
                style={s.textarea}
                rows={10}
              />

              {/* Preview */}
              <div style={{ marginTop: 14, padding: '12px 16px', background: '#0a0a0a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Preview (ejemplo)</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {(templates[currentTemplate.key] || '')
                    .replace('{nombre}', 'Gianfranco')
                    .replace('{codigo}', 'jz-abc4')
                    .replace('{total}', '$15.000')
                    .replace('{items}', '  • CAVA Simple ×1 — $12.000\n  • JANZ Doble ×1 — $15.000')
                    .replace('{descuento}', '\n🎟️ Cupón JANZ10: -$1.500')
                    .replace('{metodoPago}', '\n💵 Tené listo $15.000 en efectivo.')
                    .replace('{alias}', 'janzburgers')
                    .replace('{tiempoEstimado}', '\n⏱️ Tiempo estimado: 25 minutos.')
                    .replace('{tipoEntrega}', 'delivery')
                  }
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => reset(currentTemplate.key)} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                  ↩️ Restaurar default
                </button>
                <button onClick={() => save(currentTemplate.key)} disabled={saving === currentTemplate.key} style={{ flex: 1, padding: '10px 18px', borderRadius: 10, background: saving === currentTemplate.key ? '#222' : '#E8B84B', border: 'none', color: saving === currentTemplate.key ? '#555' : '#000', fontWeight: 800, cursor: saving === currentTemplate.key ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                  {saving === currentTemplate.key ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)', borderRadius: 12, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              💡 <strong style={{ color: '#E8B84B' }}>Tip:</strong> El texto entre <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>*asteriscos*</code> se muestra en <strong>negrita</strong> en WhatsApp. Usá <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>_guiones bajos_</code> para <em>cursiva</em>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
