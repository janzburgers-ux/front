import { useState, useEffect, useCallback } from 'react';
import { Send, Users, CheckCircle, XCircle, Eye, RefreshCw, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const UNSUB_PLACEHOLDER = '[link de cancelación]';

export default function Broadcast() {
  const [message, setMessage]         = useState('');
  const [preview, setPreview]         = useState(false);
  const [recipients, setRecipients]   = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending]         = useState(false);
  const [results, setResults]         = useState(null);
  const [testMode, setTestMode]       = useState(true);
  const [testPhone, setTestPhone]     = useState('');

  const fetchRecipients = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.get('/broadcast/list');
      setRecipients(data.clients || []);
    } catch {
      toast.error('No se pudo cargar la lista de destinatarios');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const fullPreview = message.trim()
    ? (testMode
        ? `🧪 *MENSAJE DE PRUEBA*\n\n${message.trim()}\n\n_[PRUEBA] Si no deseás recibir más estos mensajes, cancelá la suscripción._`
        : `${message.trim()}\n\n_Si no deseás recibir más estos mensajes, ingresá a: ${UNSUB_PLACEHOLDER}_`)
    : '';

  const handleSend = async () => {
    if (!message.trim()) return toast.error('Escribí el mensaje antes de enviar');
    if (testMode) {
      if (!testPhone.trim()) return toast.error('Ingresá el número de WhatsApp para la prueba');
    } else {
      if (!recipients.length) return toast.error('No hay destinatarios disponibles');
      const ok = window.confirm(
        `¿Confirmás el envío REAL a ${recipients.length} cliente${recipients.length !== 1 ? 's' : ''}?\n\nEsta acción no se puede deshacer.`
      );
      if (!ok) return;
    }

    setSending(true);
    setResults(null);
    try {
      const data = await api.post('/broadcast/send', {
        message,
        testMode,
        testPhone: testMode ? testPhone.trim() : undefined
      });
      setResults(data);
      if (data.testMode) {
        data.sent > 0 ? toast.success('✅ Prueba enviada') : toast.error('❌ No se pudo enviar la prueba');
      } else {
        if (data.sent > 0)   toast.success(`✅ Enviado a ${data.sent} cliente${data.sent !== 1 ? 's' : ''}`);
        if (data.failed > 0) toast.error(`⚠️ ${data.failed} fallido${data.failed !== 1 ? 's' : ''}`);
      }
    } catch (err) {
      toast.error('Error: ' + (err.message || 'desconocido'));
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim() && (testMode ? testPhone.trim() : recipients.length > 0);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Difusión por WhatsApp</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14 }}>
        Enviá un mensaje a todos los clientes que pidieron al menos una vez y no se dieron de baja.
      </p>

      {/* Toggle modo prueba */}
      <div style={{
        padding: '14px 16px',
        background: testMode ? 'var(--color-background-warning)' : 'var(--color-background-secondary)',
        border: `1px solid ${testMode ? 'var(--color-border-warning)' : 'var(--color-border-tertiary)'}`,
        borderRadius: 10, marginBottom: 20, transition: 'all 0.2s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: testMode ? 12 : 0 }}>
          <FlaskConical size={16} style={{ color: testMode ? 'var(--color-text-warning)' : 'var(--color-text-secondary)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Modo prueba</span>
          {/* Toggle switch */}
          <div
            onClick={() => { setTestMode(v => !v); setResults(null); }}
            style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer', flexShrink: 0,
              background: testMode ? '#F59E0B' : 'var(--color-border-secondary)',
              position: 'relative', transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              left: testMode ? 18 : 2
            }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {testMode ? 'Activo — solo enviará a tu número' : 'Desactivado — enviará a todos los clientes'}
          </span>
        </div>

        {testMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 26 }}>
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="Ej: 1165432100"
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--color-border-tertiary)',
                background: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)', width: 180
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              WhatsApp donde llega la prueba
            </span>
          </div>
        )}
      </div>

      {/* Contador destinatarios — solo modo real */}
      {!testMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20
        }}>
          <Users size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          {loadingList
            ? <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Cargando...</span>
            : <span style={{ fontSize: 14 }}><strong>{recipients.length}</strong> destinatario{recipients.length !== 1 ? 's' : ''}</span>
          }
          <button onClick={fetchRecipients} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Textarea */}
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Mensaje</label>
      <textarea
        value={message}
        onChange={e => { setMessage(e.target.value); setResults(null); }}
        placeholder={'Ej: ¡Esta semana tenemos nueva burger! 🍔 Vení a probarla.\n\nMirá el menú en: janzburgers.com/pedido'}
        rows={6}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 8,
          border: '1px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
          fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'var(--font-sans)'
        }}
      />
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
        {testMode
          ? 'La prueba incluye el prefijo "MENSAJE DE PRUEBA" para que lo identifiques.'
          : 'Al final se agrega automáticamente el link para cancelar la suscripción.'}
      </p>

      {/* Preview */}
      {message.trim() && (
        <button
          onClick={() => setPreview(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
            background: 'none', border: '1px solid var(--color-border-tertiary)',
            borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)'
          }}
        >
          <Eye size={14} />
          {preview ? 'Ocultar preview' : 'Ver preview del mensaje'}
        </button>
      )}

      {preview && fullPreview && (
        <div style={{
          marginTop: 12, padding: '14px 16px',
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 10, fontSize: 13, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)'
        }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, marginTop: 0 }}>ASÍ LO VERÁ EL CLIENTE</p>
          {fullPreview}
        </div>
      )}

      {/* Botón enviar */}
      <button
        onClick={handleSend}
        disabled={sending || !canSend}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '11px 24px',
          background: !canSend || sending ? 'var(--color-border-tertiary)' : testMode ? '#F59E0B' : '#25D366',
          color: testMode && canSend ? '#1a1a1a' : '#fff',
          border: 'none', borderRadius: 10,
          cursor: !canSend || sending ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 500
        }}
      >
        {testMode ? <FlaskConical size={16} /> : <Send size={16} />}
        {sending ? 'Enviando...' : testMode ? 'Enviar prueba a mi número' : `Enviar a ${recipients.length} clientes`}
      </button>

      {/* Resultados */}
      {results && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
            {results.testMode ? 'Resultado de la prueba' : 'Resultado del envío'}
          </h2>
          {results.testMode && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Si el mensaje llegó bien, desactivá el modo prueba y envialo al resto de los clientes.
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              background: 'var(--color-background-success)', color: 'var(--color-text-success)', fontSize: 14
            }}>
              <CheckCircle size={16} />{results.sent} enviado{results.sent !== 1 ? 's' : ''}
            </div>
            {results.failed > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', fontSize: 14
              }}>
                <XCircle size={16} />{results.failed} fallido{results.failed !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {results.failed > 0 && (
            <div style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
              {results.results.filter(r => r.status !== 'enviado').map((r, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--color-border-tertiary)' : 'none', fontSize: 13
                }}>
                  <XCircle size={14} style={{ color: 'var(--color-text-danger)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{r.whatsapp}</span>
                  {r.reason && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 'auto', fontSize: 12 }}>{r.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
