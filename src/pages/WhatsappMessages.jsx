import { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

// ── Panel de conexión WhatsApp ────────────────────────────────────────────────
// Muestra el estado actual y permite iniciar la sesión bajo demanda.
// El botón solo está activo cuando WA está desconectado.
// Una vez conectado, se inhabilita automáticamente.
function WhatsAppConnector() {
  const [status, setStatus]     = useState(null); // { connected, hasQR, initiated }
  const [starting, setStarting] = useState(false);
  const [qrUrl, setQrUrl]       = useState(null);
  const intervalRef             = useRef(null);

  const fetchStatus = () =>
    API.get('/whatsapp/status')
      .then(r => setStatus(r.data))
      .catch(() => {});

  useEffect(() => {
    fetchStatus();
    // Polling cada 5 s para detectar cuando WA se conecta después de escanear el QR
    intervalRef.current = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleInitiate = async () => {
    setStarting(true);
    try {
      const r = await API.post('/whatsapp/initiate');
      setQrUrl(r.data.qrViewUrl || null);
      toast.success('WhatsApp iniciado. Abrí el link para escanear el QR.');
    } catch {
      toast.error('Error al iniciar WhatsApp');
    } finally {
      setStarting(false);
    }
  };

  if (!status) return null;

  const connected  = status.connected;
  const initiated  = status.initiated;
  const borderColor = connected ? 'rgba(34,197,94,0.25)' : initiated ? 'rgba(232,184,75,0.25)' : 'rgba(255,255,255,0.08)';
  const dotColor    = connected ? '#22c55e'               : initiated ? '#E8B84B'               : '#555';
  const labelColor  = connected ? '#22c55e'               : initiated ? '#E8B84B'               : 'rgba(255,255,255,0.5)';
  const label       = connected ? '✅ WhatsApp conectado' : initiated  ? '⏳ Esperando escaneo del QR...' : '⚠️ WhatsApp desconectado';
  const sublabel    = connected
    ? 'Los mensajes automáticos están activos.'
    : initiated
      ? 'Abrí el link de QR con el celular vinculado a WhatsApp Business.'
      : 'Apretá el botón para generar el link de conexión.';

  return (
    <div style={{ marginBottom: 28, padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${borderColor}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Indicador de estado */}
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: connected ? '0 0 6px #22c55e' : 'none' }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: labelColor, marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{sublabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Link al QR (solo visible cuando fue iniciado y no está conectado aún) */}
        {qrUrl && !connected && (
          <a
            href={qrUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.82rem', color: '#25D366', fontWeight: 700, textDecoration: 'none', padding: '8px 14px', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 9, background: 'rgba(37,211,102,0.07)' }}
          >
            📱 Abrir QR
          </a>
        )}

        {/* Botón principal: activo solo cuando está desconectado */}
        <button
          onClick={handleInitiate}
          disabled={connected || starting || initiated}
          style={{
            padding: '9px 20px', borderRadius: 10, border: 'none', fontWeight: 800,
            fontSize: '0.85rem', cursor: (connected || starting || initiated) ? 'not-allowed' : 'pointer',
            background: connected ? 'rgba(34,197,94,0.1)' : initiated ? 'rgba(255,255,255,0.05)' : '#E8B84B',
            color:      connected ? '#22c55e'               : initiated ? '#555'                  : '#000',
            transition: 'all 0.2s'
          }}
        >
          {starting ? 'Iniciando...' : connected ? 'Conectado ✓' : initiated ? 'Iniciado...' : '🔗 Generar link QR'}
        </button>
      </div>
    </div>
  );
}

const CATEGORIES = [
  {
    label: '📦 Pedidos',
    templates: [
      { key: 'orderReceived', label: '📥 Pedido recibido', desc: 'Se envía inmediatamente cuando el cliente confirma el pedido desde el formulario público.', vars: ['{nombre}', '{codigo}'] },
      { key: 'orderConfirmed', label: '✅ Confirmado por cocina', desc: 'Se envía cuando la cocina acepta el pedido y asigna tiempo estimado.', vars: ['{nombre}', '{codigo}', '{total}', '{items}', '{descuento}', '{metodoPago}', '{alias}', '{tiempoEstimado}'] },
      { key: 'orderReady', label: '🛵 Listo / en camino', desc: 'Se envía cuando el pedido pasa a "listo". Para delivery dice "en camino", para takeaway dice "listo para retirar".', vars: ['{nombre}', '{codigo}', '{total}', '{metodoPago}', '{alias}', '{tipoEntrega}'] },
      { key: 'orderCancelled', label: '❌ Pedido cancelado', desc: 'Se envía cuando el pedido es cancelado por falta de stock u otro motivo.', vars: ['{nombre}', '{codigo}'] },
    ],
  },
  {
    label: '⭐ Reseñas',
    templates: [
      { key: 'reviewRequest', label: '⭐ Solicitud de reseña', desc: 'Se envía automáticamente después de la entrega. Incluye el link personalizado para dejar la reseña.', vars: ['{nombre}', '{link}', '{codigo}'] },
    ],
  },
  {
    label: '🎟️ Referidos',
    templates: [
      { key: 'referralNotify', label: '🌟 Uso de cupón referido', desc: 'Se envía al dueño del cupón cuando alguien lo usa y el pedido fue entregado. Muestra el % acumulado.', vars: ['{nombre}', '{codigo}', '{clienteNuevo}', '{porcentajeNuevo}', '{totalAcumulado}', '{usosValidos}', '{tope}'], readonly: true, note: 'Definido en loyalty.js → notifyReferralOwner(). Editarlo directamente en el backend.' },
      { key: 'referralRedeem', label: '🎉 Recompensa canjeada', desc: 'Se envía al referente cuando se genera su cupón de recompensa al canjear su % acumulado.', vars: ['{nombre}', '{porcentaje}', '{tope}', '{codigoCupon}'], readonly: true, note: 'Definido en loyalty.js → redeemReferralReward(). Editarlo directamente en el backend.' },
    ],
  },
  {
    label: '🔁 Churn',
    templates: [
      { key: 'churnAlert', label: '💬 Cliente inactivo', desc: 'Enviado automáticamente a clientes que no pidieron en X días. El texto se configura en la página "Alerta de Churn".', vars: ['{nombre}', '{codigo}', '{descuento}', '{dias}'], readonly: true, note: 'Configurable en la página Alerta de Churn → campo "Mensaje".' },
    ],
  },
  {
    label: '🏆 Fidelización',
    templates: [
      { key: 'loyaltyReward', label: '🎉 Cupón por puntos', desc: 'Se envía cuando un cliente acumula suficientes puntos y se genera automáticamente su cupón.', vars: ['{nombre}', '{porcentaje}', '{codigo}'], readonly: true, note: 'Definido en loyalty.js → generateLoyaltyCoupon(). Editarlo directamente en el backend.' },
    ],
  },
];

const DEFAULTS = {
  orderReceived: `¡Hola {nombre}! 👋\n\nRecibimos tu pedido *{codigo}* ✅\n\nEn breve te confirmamos cuando la cocina lo apruebe.\n\n_Janz Burgers_ 🍔`,
  orderConfirmed: `¡Hola {nombre}! 🔥\n\nTu pedido *{codigo}* fue *confirmado por la cocina* y ya está en preparación.{tiempoEstimado}\n\n*Detalle del pedido:*\n{items}{descuento}\n\n💰 *Total: {total}*\n{metodoPago}\n\n_Janz Burgers_ 🍔`,
  orderReady: `¡Hola {nombre}! 🛵\n\nTu pedido *{codigo}* está *en camino*. ✅\n\nEn instantes llega a tu puerta.\n{metodoPago}\n\n_Janz Burgers_ 🍔`,
  orderCancelled: `¡Hola {nombre}! 😔\n\nTe avisamos que tu pedido *{codigo}* fue cancelado porque en este momento no contamos con stock suficiente.\n\nDisculpá las molestias. Podés volver a pedir en nuestra próxima jornada.\n\n_Janz Burgers_ 🍔`,
  reviewRequest: `¡Hola {nombre}! 🍔\n\n¿Cómo estuvo tu pedido de hoy?\n\nContanos qué te pareció y *te regalamos algo para la próxima* 🎁\n\n👉 {link}\n\n¡Solo tarda 30 segundos!\n\n_Janz Burgers_ 🍔`,
};

const PREVIEW = { nombre:'Gianfranco', codigo:'jz-abc4', total:'$15.000', items:'  • CAVA Simple ×1 — $12.000\n  • JANZ Doble ×1 — $15.000', descuento:'\n🎟️ Cupón RF-ABM37: -$1.500', metodoPago:'\n💵 Tené listo $15.000 en efectivo.', alias:'janzburgers', tiempoEstimado:'\n⏱️ Tiempo estimado: 25 minutos.', tipoEntrega:'delivery', link:'https://janzburgers.vercel.app/resena/jz-abc4', clienteNuevo:'María García', porcentajeNuevo:'5', totalAcumulado:'15', usosValidos:'3', tope:'$14.000', porcentaje:'15', codigoCupon:'RF-ABM37', dias:'25' };

function fillPreview(tpl) {
  if (!tpl) return '';
  return Object.entries(PREVIEW).reduce((m,[k,v]) => m.replace(new RegExp(`\\{${k}\\}`,'g'),v), tpl);
}

export default function WhatsappMessages() {
  const [templates, setTemplates] = useState({ ...DEFAULTS });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState('');
  const [activeKey, setActiveKey] = useState('orderReceived');

  useEffect(() => {
    API.get('/whatsapp-templates')
      .then(r => setTemplates({ ...DEFAULTS, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (key) => {
    setSaving(key);
    try { await API.put('/whatsapp-templates', { key, template: templates[key] }); toast.success('Mensaje guardado ✓'); }
    catch { toast.error('Error al guardar'); }
    finally { setSaving(''); }
  };

  const reset = (key) => { if (!DEFAULTS[key]) return; setTemplates(t => ({ ...t, [key]: DEFAULTS[key] })); toast('Restaurado al default', { icon: '↩️' }); };
  const insertVar = (key, v) => setTemplates(t => ({ ...t, [key]: (t[key]||'') + v }));

  const activeTemplate = CATEGORIES.flatMap(c => c.templates).find(t => t.key === activeKey);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E8B84B', marginBottom: 4 }}>Mensajes de WhatsApp</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Todos los mensajes automáticos del sistema. Los editables los personalizás acá; los de código están documentados para referencia.</p>
      </div>

      <WhatsAppConnector />

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 20 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px 6px' }}>{cat.label}</div>
              {cat.templates.map(t => (
                <button key={t.key} onClick={() => setActiveKey(t.key)} style={{
                  padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                  fontSize: '0.79rem', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
                  background: activeKey === t.key ? '#E8B84B' : 'rgba(255,255,255,0.04)',
                  color: activeKey === t.key ? '#000' : '#888',
                }}>
                  <span style={{ flex: 1 }}>{t.label.split(' ').slice(1).join(' ')}</span>
                  {t.readonly && <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.08)', color: '#555', padding: '1px 5px', borderRadius: 4 }}>código</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Editor */}
        {activeTemplate && (
          <div>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 14 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'white', marginBottom: 4 }}>{activeTemplate.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{activeTemplate.desc}</div>
              </div>

              {activeTemplate.readonly ? (
                <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Variables disponibles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {activeTemplate.vars.map(v => <span key={v} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(232,184,75,0.08)', border:'1px solid rgba(232,184,75,0.2)', color:'#E8B84B', fontSize:'0.75rem', fontWeight:700, fontFamily:'monospace' }}>{v}</span>)}
                  </div>
                  <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'rgba(232,184,75,0.05)', border:'1px solid rgba(232,184,75,0.15)', borderRadius:8 }}>
                    <span>🔒</span>
                    <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>{activeTemplate.note}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>Variables — clic para insertar</span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {activeTemplate.vars.map(v => <button key={v} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(232,184,75,0.1)', border:'1px solid rgba(232,184,75,0.25)', color:'#E8B84B', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'monospace' }} onClick={() => insertVar(activeTemplate.key, v)}>{v}</button>)}
                    </div>
                  </div>

                  <span style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>Mensaje</span>
                  <textarea
                    value={templates[activeTemplate.key] || ''}
                    onChange={e => setTemplates(t => ({ ...t, [activeTemplate.key]: e.target.value }))}
                    style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'white', padding:'14px', fontSize:'0.88rem', outline:'none', resize:'vertical', fontFamily:'monospace', lineHeight:1.6, boxSizing:'border-box', minHeight:180 }}
                    rows={9}
                  />

                  <div style={{ marginTop:14, padding:'12px 16px', background:'#0a0a0a', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.18)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Preview con datos de ejemplo</div>
                    <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>{fillPreview(templates[activeTemplate.key] || '')}</div>
                  </div>

                  <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button onClick={() => reset(activeTemplate.key)} style={{ padding:'10px 18px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#666', fontWeight:600, cursor:'pointer', fontSize:'0.85rem' }}>↩️ Default</button>
                    <button onClick={() => save(activeTemplate.key)} disabled={saving === activeTemplate.key} style={{ flex:1, padding:'10px 18px', borderRadius:10, background: saving === activeTemplate.key ? '#222' : '#E8B84B', border:'none', color: saving === activeTemplate.key ? '#555' : '#000', fontWeight:800, cursor: saving === activeTemplate.key ? 'not-allowed' : 'pointer', fontSize:'0.9rem' }}>
                      {saving === activeTemplate.key ? 'Guardando...' : '💾 Guardar cambios'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {!activeTemplate.readonly && (
              <div style={{ padding:'14px 18px', background:'rgba(232,184,75,0.05)', border:'1px solid rgba(232,184,75,0.15)', borderRadius:12, fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
                💡 <strong style={{ color:'#E8B84B' }}>Formato WhatsApp:</strong>{' '}
                <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 6px', borderRadius:4 }}>*texto*</code> = <strong>negrita</strong> · <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 6px', borderRadius:4 }}>_texto_</code> = <em>cursiva</em> · <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 6px', borderRadius:4 }}>~texto~</code> = <s>tachado</s>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
