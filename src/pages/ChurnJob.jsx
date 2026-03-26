import { useState, useEffect } from 'react';
import { Save, Play, Clock, MessageSquare, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const DEFAULT_CONFIG = {
  enabled: true,
  daysThreshold: 21,
  minOrders: 2,
  generateCoupon: true,
  couponPercent: 10,
  schedule: '0 10 * * 1',
  message: `¡Hola {nombre}! 🍔\n\n¿Todo bien? Hace un tiempo que no pedís y nos re extrañás jaja.\n\nTe mandamos un regalito: usá el código *{codigo}* y te hacemos un *{descuento}% de descuento* en tu próximo pedido. 🎁\n\n¡Nos vemos pronto!\n_Janz Burgers_ 🔥`
};

const SCHEDULE_PRESETS = [
  { label: 'Todos los lunes a las 10am',    value: '0 10 * * 1' },
  { label: 'Lunes y jueves a las 11am',     value: '0 11 * * 1,4' },
  { label: 'Todos los días a las 9am',      value: '0 9 * * *' },
  { label: 'Cada 3 días a las 10am',        value: '0 10 */3 * *' },
  { label: 'Manual (solo disparo a mano)',  value: 'manual' },
];

const VAR_TAGS = [
  { tag: '{nombre}',   desc: 'Primer nombre del cliente' },
  { tag: '{codigo}',   desc: 'Código del cupón generado' },
  { tag: '{descuento}',desc: 'Porcentaje de descuento' },
  { tag: '{dias}',     desc: 'Días sin pedir' },
];

export default function ChurnJobPage() {
  const [config, setConfig]     = useState(DEFAULT_CONFIG);
  const [lastRun, setLastRun]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [running, setRunning]   = useState(false);
  const [preview, setPreview]   = useState('');

  useEffect(() => {
    API.get('/churn-job/config')
      .then(r => {
        setConfig({ ...DEFAULT_CONFIG, ...r.data.config });
        setLastRun(r.data.lastRun);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Preview en tiempo real
    const msg = config.message
      .replace(/{nombre}/g, 'Gianfra')
      .replace(/{codigo}/g, 'VOLVISTE-GIANFRA-428')
      .replace(/{descuento}/g, config.couponPercent)
      .replace(/{dias}/g, config.daysThreshold);
    setPreview(msg);
  }, [config.message, config.couponPercent, config.daysThreshold]);

  const save = async () => {
    setSaving(true);
    try {
      await API.put('/churn-job/config', config);
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await API.post('/churn-job/run');
      toast.success(`Job ejecutado: ${r.data.sent} mensajes enviados`);
      // Refrescar lastRun
      const updated = await API.get('/churn-job/config');
      setLastRun(updated.data.lastRun);
    } catch { toast.error('Error ejecutando el job'); }
    finally { setRunning(false); }
  };

  const insertTag = (tag) => {
    setConfig(c => ({ ...c, message: c.message + tag }));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1>📲 Alerta de Churn automática</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={runNow}
            disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {running ? <div className="spinner spinner-sm" /> : <Play size={14} />}
            {running ? 'Enviando...' : 'Ejecutar ahora'}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <div className="spinner spinner-sm" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ gap: 24 }}>

          {/* ── Columna izquierda: config ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Activar / desactivar */}
            <div className="card">
              <div className="section-header">
                <div className="section-title"><Settings size={13} /> Estado del job</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem', fontWeight: 500, color: 'var(--white)' }}>
                <div
                  onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
                  style={{
                    width: 44, height: 24, borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
                    background: config.enabled ? 'linear-gradient(135deg, var(--gold-dark), var(--gold))' : 'var(--border-light)',
                    position: 'relative', flexShrink: 0
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: config.enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                  }} />
                </div>
                {config.enabled ? 'Activado — envía mensajes automáticamente' : 'Desactivado — solo podés ejecutarlo a mano'}
              </label>
            </div>

            {/* Disparador */}
            <div className="card">
              <div className="section-header">
                <div className="section-title"><Clock size={13} /> Frecuencia de envío</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cuándo se ejecuta</label>
                <select
                  value={config.schedule}
                  onChange={e => setConfig(c => ({ ...c, schedule: e.target.value }))}
                >
                  {SCHEDULE_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parámetros */}
            <div className="card">
              <div className="section-header">
                <div className="section-title"><AlertTriangle size={13} /> Criterios de riesgo</div>
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Días sin pedir</label>
                  <input
                    type="number" min={7} max={90}
                    value={config.daysThreshold}
                    onChange={e => setConfig(c => ({ ...c, daysThreshold: parseInt(e.target.value) }))}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Contactar si lleva más de N días</div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Pedidos mínimos hist.</label>
                  <input
                    type="number" min={1} max={10}
                    value={config.minOrders}
                    onChange={e => setConfig(c => ({ ...c, minOrders: parseInt(e.target.value) }))}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Solo clientes con N+ pedidos</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', fontSize: '0.88rem', fontWeight: 500, color: 'var(--white)', marginBottom: 12 }}>
                  <div
                    onClick={() => setConfig(c => ({ ...c, generateCoupon: !c.generateCoupon }))}
                    style={{
                      width: 36, height: 20, borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
                      background: config.generateCoupon ? 'linear-gradient(135deg, var(--gold-dark), var(--gold))' : 'var(--border-light)',
                      position: 'relative', flexShrink: 0
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: config.generateCoupon ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                  Generar cupón automático
                </label>
                {config.generateCoupon && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>% de descuento del cupón</label>
                    <input
                      type="number" min={5} max={50}
                      value={config.couponPercent}
                      onChange={e => setConfig(c => ({ ...c, couponPercent: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Último run */}
            {lastRun && (
              <div className="card">
                <div className="section-title" style={{ marginBottom: 14 }}><CheckCircle size={13} /> Último envío</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fecha</div>
                    <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.88rem' }}>{new Date(lastRun.date).toLocaleString('es-AR')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enviados</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--green)', lineHeight: 1, marginTop: 2 }}>{lastRun.sent}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sin WA / errores</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gray)', lineHeight: 1, marginTop: 2 }}>{lastRun.skipped}</div>
                  </div>
                </div>
                {lastRun.results?.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lastRun.results.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>{r.name}</span>
                        <span style={{ color: r.status === 'enviado' ? 'var(--green)' : 'var(--red)' }}>
                          {r.status === 'enviado' ? `✓ ${r.coupon}` : '✗ error'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Columna derecha: mensaje ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="section-header">
                <div className="section-title"><MessageSquare size={13} /> Mensaje de WhatsApp</div>
              </div>

              {/* Variable tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {VAR_TAGS.map(v => (
                  <button
                    key={v.tag}
                    onClick={() => insertTag(v.tag)}
                    title={v.desc}
                    style={{
                      background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.3)',
                      color: 'var(--gold)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.2s'
                    }}
                  >
                    {v.tag}
                  </button>
                ))}
                <span style={{ fontSize: '0.7rem', color: 'var(--gray)', alignSelf: 'center' }}>← clickeá para insertar</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Texto del mensaje</label>
                <textarea
                  rows={10}
                  value={config.message}
                  onChange={e => setConfig(c => ({ ...c, message: e.target.value }))}
                  style={{ fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.6, resize: 'vertical' }}
                  placeholder="Escribí el mensaje. Usá *texto* para negrita en WhatsApp."
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 4 }}>
                  Tip: *texto* = <strong>negrita</strong> · _texto_ = <em>cursiva</em> en WhatsApp
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>👁️ Preview del mensaje</div>
              <div style={{
                background: '#075e54',
                borderRadius: 12, padding: '14px 16px',
                fontFamily: "'Inter', sans-serif", fontSize: '0.88rem',
                lineHeight: 1.65, color: '#fff', whiteSpace: 'pre-wrap',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: -8, left: 16, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #075e54' }} />
                {preview}
                <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                  ahora ✓✓
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--gray)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span>ℹ️</span>
                <span>El preview usa datos de ejemplo. El mensaje real usa el nombre y cupón real de cada cliente.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
