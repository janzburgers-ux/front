import { useState, useEffect, useRef } from 'react';
import { Trophy, Star, Lock, ChevronDown, ChevronUp, LogOut, Zap, Award, Target } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

// ── Storage helpers: localStorage + cookie como respaldo para Safari/iOS ────────
// Safari con ITP puede borrar localStorage si el link se abre desde WhatsApp.
// Usamos cookies como segundo almacenamiento; sobreviven mucho mejor en iOS.
const PRODE_KEY   = 'janz_prode_client';
const PRODE_BASES = 'janz_prode_bases';
const COOKIE_DAYS = 90;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function removeCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
  setCookie(key, value, COOKIE_DAYS);
}
function storageGet(key) {
  try {
    const ls = localStorage.getItem(key);
    if (ls) return ls;
  } catch {}
  return getCookie(key); // fallback a cookie (Safari/iOS)
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
  removeCookie(key);
}

// ── Paleta ─────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080808',
  surface: '#101010',
  card:    '#141414',
  border:  '#1c1c1c',
  border2: '#242424',
  yellow:  '#E8B84B',
  yellowD: '#c9992e',
  yellowBg:'rgba(232,184,75,0.08)',
  yellowBg2:'rgba(232,184,75,0.15)',
  muted:   '#3a3a3a',
  dim:     '#252525',
  green:   '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  red:     '#ef4444',
  redBg:   'rgba(239,68,68,0.08)',
  text:    '#ffffff',
  text2:   '#888',
  text3:   '#444',
};

// ── ETAPAS para el filtro ──────────────────────────────────────────────────────
const STAGES = [
  { key: 'all',              label: 'Todo',    short: 'Todo'  },
  { key: 'Fase de Grupos',   label: 'Grupos',  short: 'Grp'   },
  { key: 'Ronda de 32',      label: 'R. de 32',short: 'R32'  },
  { key: 'Octavos de Final', label: 'Octavos', short: 'Oct'   },
  { key: 'Cuartos de Final', label: 'Cuartos', short: 'Cuar'  },
  { key: 'Semifinal',        label: 'Semis',   short: 'Semi'  },
  { key: 'Tercer Puesto',    label: '3er Puesto',short:'3°'   },
  { key: 'Final',            label: 'Final',   short: 'Final' },
];

// ── Formato de fecha hora Argentina ───────────────────────────────────────────
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── BasesSection — reutilizable, fuera del componente para evitar remounts ─────
function BasesSection({ n, title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{n}. {title}</div>
      <div>{children}</div>
    </div>
  );
}

// ── BasesModal — fuera del componente para no recrearse en cada render ─────────
function BasesModal({ config, aceptoBases, setAceptoBases, setShowBases }) {
  const C = {
    bg: '#080808', surface: '#101010', card: '#141414', border: '#1c1c1c',
    yellow: '#E8B84B', dim: '#252525', text: '#ffffff', text2: '#888', text3: '#444',
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#0e0e0e', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
        <div style={{ padding: '20px 20px 0', position: 'sticky', top: 0, background: '#0e0e0e', zIndex: 1 }}>
          <div style={{ width: 36, height: 4, background: C.dim, borderRadius: 99, margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, letterSpacing: 1, marginBottom: 4 }}>
            BASES Y CONDICIONES
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PRODE JANZ — EL MUNDIAL SE JUEGA EN CASA
          </div>
          <div style={{ height: 1, background: C.border }} />
        </div>

        <div style={{ padding: '16px 20px', fontSize: 13, color: '#888', lineHeight: 1.7 }}>
          <BasesSection n="1" title="¿Quiénes pueden participar?">
            Cualquier persona mayor de edad puede registrarse con nombre y WhatsApp.
            Si ya compraste en Janz, ingresá con tu número. Si nunca compraste, registrate como invitado.
          </BasesSection>
          <BasesSection n="2" title="Sistema de puntos (ranking)">
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><b style={{ color: C.yellow }}>Acierto ganador / empate:</b> {config?.pointsWinner ?? 3} punto{(config?.pointsWinner ?? 3) !== 1 ? 's' : ''}.</li>
              <li><b style={{ color: C.yellow }}>Marcador exacto:</b> {(config?.pointsWinner ?? 3) + (config?.pointsExact ?? 3)} puntos en total (incluye el acierto de ganador).</li>
              <li><b style={{ color: C.yellow }}>Bonus categoría:</b> +3 pts al pasar a Cliente (1.ª compra entregada) y +3 pts al llegar a VIP (2 entregas en el Mundial). Máximo 6 pts por compras.</li>
            </ul>
          </BasesSection>
          <BasesSection n="3" title="Cómo pronosticar">
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Ingresá el <b style={{ color: C.text }}>marcador exacto</b> que creés que va a quedar (ej: 2–1). El sistema deduce automáticamente quién gana o si es empate.</li>
              <li>Los pronósticos cierran <b style={{ color: C.yellow }}>{config?.cutoffMinutes ?? 30} minutos</b> antes de cada partido.</li>
              <li>Las compras cuentan cuando el pedido es <b style={{ color: C.text }}>entregado</b>.</li>
            </ul>
          </BasesSection>
          <BasesSection n="4" title="Premios">
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>🎟️ <b style={{ color: C.yellow }}>Invitados:</b> {config?.prizeInvitado || 'Cupón 20% en tu primera compra'}.</li>
              <li>🍔 <b style={{ color: C.yellow }}>Clientes (sin compras en el Mundial):</b> {config?.prizeCliente || 'Combo doble a elección'}.</li>
              <li>🥇 <b style={{ color: C.yellow }}>1° Puesto (competidores):</b> {config?.prize1 || 'Premio mayor a definir'}.</li>
              <li>🥈 <b style={{ color: '#aaa' }}>2° Puesto:</b> {config?.prize2 || 'Premio medio a definir'}.</li>
              <li>🥉 <b style={{ color: '#cd7f32' }}>3° Puesto:</b> {config?.prize3 || 'Premio menor a definir'}.</li>
            </ul>
          </BasesSection>
          <BasesSection n="5" title="Empates">
            En caso de empate en el ranking: (1) mayor cantidad de exactos, (2) pregunta del dueño.
          </BasesSection>
          {config?.termsExtra && (
            <BasesSection n="6" title="Condiciones adicionales">
              <div style={{ whiteSpace: 'pre-wrap' }}>{config.termsExtra}</div>
            </BasesSection>
          )}
        </div>

        <div style={{ padding: '16px 20px 28px', borderTop: `1px solid ${C.border}`, position: 'sticky', bottom: 0, background: '#0e0e0e' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptoBases} onChange={e => setAceptoBases(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.yellow, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: C.text2 }}>Leí y acepto las bases y condiciones</span>
          </label>
          <button disabled={!aceptoBases}
            onClick={() => { storageSet(PRODE_BASES, '1'); setShowBases(false); }}
            style={{ width: '100%', background: aceptoBases ? C.yellow : C.dim, color: aceptoBases ? '#000' : C.text3, border: 'none', borderRadius: 12, padding: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: 1, cursor: aceptoBases ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            PARTICIPAR →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublicProde() {
  const [fase,        setFase       ] = useState('loading');
  const [loginMode,   setLoginMode  ] = useState('cliente');
  const [regNombre,   setRegNombre  ] = useState('');
  const [whatsapp,    setWhatsapp   ] = useState('');
  const [loginLoading,setLoginLoading] = useState(false);
  const [otpCode,     setOtpCode    ] = useState('');
  const [otpNombre,   setOtpNombre  ] = useState('');
  const [resendSecs,  setResendSecs ] = useState(0);
  const resendTimerRef = useRef(null);
  const [clientId,    setClientId   ] = useState(null);
  const [nombre,      setNombre     ] = useState('');
  const [fixture,     setFixture    ] = useState([]);
  const [pronosticos, setPronosticos] = useState({});
  const [puntos,      setPuntos     ] = useState({ total: 0, historial: [] });
  const [config,      setConfig     ] = useState(null);
  const [saving,      setSaving     ] = useState(null);
  const [ranking,     setRanking    ] = useState([]);
  const [estado,      setEstado     ] = useState(null);
  const [showBases,   setShowBases  ] = useState(false);
  const [aceptoBases, setAceptoBases] = useState(false);
  const [tab,         setTab        ] = useState('fixture'); // 'fixture' | 'ranking' | 'puntos'
  const [stageFilter, setStageFilter] = useState('all');
  const stageRef = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    API.get('/prode/ranking/publico').then(r => setRanking(r.data)).catch(() => {});
    API.get('/prode/config').then(r => {
      setConfig(r.data);
      if (!r.data?.enabled) { setFase('inactivo'); return; }
      const saved = storageGet(PRODE_KEY);
      if (saved) {
        try {
          const { clientId: cid, nombre: nom } = JSON.parse(saved);
          setClientId(cid); setNombre(nom);
          setFase('cargando_prode');
          cargarProde(cid);
          return;
        } catch {}
      }
      const basesAceptadas = storageGet(PRODE_BASES);
      if (!basesAceptadas) setShowBases(true);
      setFase('login');
    }).catch(() => setFase('login'));
  }, []);

  const cargarProde = async (cid) => {
    try {
      const [fRes, pRes, ptsRes, rankRes, estRes] = await Promise.allSettled([
        API.get('/prode/fixture'),
        API.get(`/prode/pronosticos/${cid}`),
        API.get(`/prode/puntos/${cid}`),
        API.get('/prode/ranking/publico'),
        API.get(`/prode/estado/${cid}`),
      ]);

      if (fRes.status === 'rejected') {
        toast.error('Error cargando el prode');
        setFase('login');
        return;
      }

      setFixture(fRes.value.data);

      if (pRes.status === 'fulfilled') {
        const pMap = {};
        pRes.value.data.forEach(pr => { pMap[pr.matchId?._id || pr.matchId] = pr; });
        setPronosticos(pMap);
      }

      if (ptsRes.status === 'fulfilled') {
        setPuntos(ptsRes.value.data);
      }

      if (rankRes.status === 'fulfilled') {
        setRanking(rankRes.value.data);
      }

      if (estRes.status === 'fulfilled') {
        setEstado(estRes.value.data);
      }

      setFase('prode');
    } catch {
      toast.error('Error cargando el prode');
      setFase('login');
    }
  };

  // Iniciar countdown para reenvío
  const startResendTimer = () => {
    setResendSecs(60);
    clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendSecs(s => {
        if (s <= 1) { clearInterval(resendTimerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  // Paso 1 — validar WA y enviar código OTP
  const handleSolicitarCodigo = async () => {
    if (!whatsapp.trim()) return;
    if (loginMode === 'invitado' && !regNombre.trim()) {
      toast.error('Ingresá tu nombre');
      return;
    }
    setLoginLoading(true);
    try {
      if (loginMode === 'invitado') {
        const res = await API.post('/prode/registro', { nombre: regNombre.trim(), whatsapp });
        setOtpNombre(res.data.nombre);
        if (res.data.cuponInvitado) toast.success(`Cupón: ${res.data.cuponInvitado}`, { duration: 5000 });
      } else {
        const res = await API.post('/prode/acceso/codigo', { whatsapp });
        setOtpNombre(res.data.nombre);
      }
      setOtpCode('');
      setFase('otp');
      startResendTimer();
    } catch (e) {
      if (e.response?.data?.code === 'CLIENT_NOT_FOUND' && loginMode === 'cliente') {
        toast.error('No encontramos tu número. Probá registrarte como invitado.');
      } else {
        toast.error(e.response?.data?.message || 'Error al enviar código');
      }
    } finally { setLoginLoading(false); }
  };

  // Paso 2 — verificar código OTP
  const handleVerificarCodigo = async () => {
    if (otpCode.trim().length < 4) return;
    setLoginLoading(true);
    try {
      const res = await API.post('/prode/acceso/verificar', { whatsapp, code: otpCode });
      const { clientId: cid, nombre: nom, estado: est } = res.data;
      setClientId(cid); setNombre(nom);
      if (est) setEstado(est);
      storageSet(PRODE_KEY, JSON.stringify({ clientId: cid, nombre: nom }));
      clearInterval(resendTimerRef.current);
      setFase('cargando_prode');
      await cargarProde(cid);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Código incorrecto');
      setOtpCode('');
    } finally { setLoginLoading(false); }
  };

  // Reenviar código
  const handleReenviarCodigo = async () => {
    if (resendSecs > 0) return;
    setLoginLoading(true);
    try {
      if (loginMode === 'invitado') {
        await API.post('/prode/registro', { nombre: regNombre.trim(), whatsapp });
      } else {
        await API.post('/prode/acceso/codigo', { whatsapp });
      }
      setOtpCode('');
      toast.success('Nuevo código enviado 👍');
      startResendTimer();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al reenviar');
    } finally { setLoginLoading(false); }
  };

  // Mantener retrocompat: handleLogin → solicitar código
  const handleLogin = handleSolicitarCodigo;

  const handlePronostico = async (matchId, predictedWinner, predictedHome = null, predictedAway = null) => {
    setSaving(matchId);
    try {
      const res = await API.post('/prode/pronosticos', { clientId, matchId, predictedWinner, predictedHome, predictedAway });
      setPronosticos(p => ({ ...p, [matchId]: res.data }));
      toast.success('Pronóstico guardado ✅');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error guardando pronóstico');
    } finally { setSaving(null); }
  };

  const handleLogout = () => {
    storageRemove(PRODE_KEY);
    setClientId(null); setNombre(''); setFase('login');
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const ptsPronosticos = puntos.historial.filter(h => h.tipo === 'pronostico').reduce((s, h) => s + h.puntos, 0);
  const ptsBonus       = puntos.historial.filter(h => h.tipo === 'bonificacion').reduce((s, h) => s + h.puntos, 0);

  const pronosticados   = Object.keys(pronosticos).length;
  const posicion        = ranking.findIndex(r => String(r._id) === String(clientId)) + 1 || null;

  const fixtureFiltrado = stageFilter === 'all'
    ? fixture
    : fixture.filter(m => m.stage === stageFilter);

  // Agrupar fixture filtrado por fecha
  const grupos = [...fixtureFiltrado]
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
    .reduce((acc, m) => {
      const d = new Date(m.matchDate);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD como clave de orden
      if (!acc[key]) acc[key] = { label: d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' }), matches: [] };
      acc[key].matches.push(m);
      return acc;
    }, {});

  // Próximo partido sin pronosticar
  const proximo = fixture.find(m =>
    m.status === 'scheduled' && !pronosticos[m._id] &&
    new Date(m.matchDate) > new Date()
  );

  // Etapas disponibles en el fixture actual
  const etapasDisponibles = new Set(fixture.map(m => m.stage));

  // ── ESTADOS SIMPLES ───────────────────────────────────────────────────────
  if (fase === 'loading' || fase === 'cargando_prode') return (
    <div style={S.fullCenter}>
      <div style={S.spinner} />
    </div>
  );

  if (fase === 'inactivo') return (
    <div style={S.fullCenter}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: C.yellow, letterSpacing: 2 }}>PRODE JANZ</div>
      <p style={{ color: C.text2, fontSize: 14, marginTop: 8 }}>El prode todavía no está disponible.</p>
    </div>
  );





  // ── LOGIN / LANDING ───────────────────────────────────────────────────────
  if (fase === 'login') return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      {showBases && <BasesModal config={config} aceptoBases={aceptoBases} setAceptoBases={setAceptoBases} setShowBases={setShowBases} />}

      {/* Hero */}
      <div style={{ position: 'relative', padding: '48px 24px 32px', overflow: 'hidden' }}>
        {/* Glow de fondo */}
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,184,75,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.yellowBg2, border: `1px solid ${C.yellow}44`, borderRadius: 99, padding: '6px 14px', marginBottom: 20 }}>
            <span style={{ fontSize: 12 }}>⚽</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.yellow, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mundial 2026</span>
          </div>

          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 64, lineHeight: 0.9, letterSpacing: 2, marginBottom: 6 }}>
            PRODE
            <br />
            <span style={{ color: C.yellow }}>JANZ BURGERS</span>
          </div>

          <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
            Pronosticá el Mundial y ganá premios reales.<br />
            Ranking por aciertos + bonus al comprar en Janz.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 20px 24px', maxWidth: 400, margin: '0 auto' }}>
        {[
          { n: '104', label: 'Partidos' },
          { n: '3', label: 'Premios' },
          { n: 'Real', label: 'Fixture' },
        ].map(({ n, label }) => (
          <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: C.yellow, letterSpacing: 1 }}>{n}</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Form login */}
      <div style={{ padding: '0 20px 12px', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'cliente', label: 'Ya me registré' },
            { key: 'invitado', label: 'Soy nuevo' },
          ].map(m => (
            <button key={m.key} onClick={() => setLoginMode(m.key)}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${loginMode === m.key ? C.yellow : C.border2}`, background: loginMode === m.key ? C.yellowBg2 : C.surface, color: loginMode === m.key ? C.yellow : C.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {loginMode === 'cliente' ? '¿Ya te registraste?' : 'Registrate al prode'}
          </div>
          <p style={{ color: C.text2, fontSize: 12, marginTop: 0, marginBottom: 18, lineHeight: 1.5 }}>
            {loginMode === 'cliente'
              ? 'Ingresá con el WhatsApp que usaste al registrarte (o al pedir en Janz). Te mandamos un código de verificación.'
              : 'Solo nombre y WhatsApp. Si ya compraste en Janz antes, usá la opción "Ya me registré". Recibís cupón 15% para tu primera compra.'}
          </p>

          {loginMode === 'invitado' && (
            <>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Tu nombre
              </label>
              <input
                type="text"
                value={regNombre}
                onChange={e => setRegNombre(e.target.value)}
                placeholder="Ej: Juan"
                style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, color: C.text, padding: '13px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
            </>
          )}

          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Tu WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSolicitarCodigo()}
            placeholder="Ej: 1134567890"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, color: C.text, padding: '13px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button onClick={handleSolicitarCodigo} disabled={loginLoading || !whatsapp.trim()}
            style={{ width: '100%', background: loginLoading || !whatsapp.trim() ? C.dim : C.yellow, color: loginLoading || !whatsapp.trim() ? C.text3 : '#000', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: 1, cursor: loginLoading || !whatsapp.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {loginLoading ? 'ENVIANDO...' : 'ENVIAR CÓDIGO →'}
          </button>

          <button onClick={() => setShowBases(true)}
            style={{ width: '100%', background: 'none', border: 'none', color: C.text3, fontSize: 11, cursor: 'pointer', marginTop: 12, textDecoration: 'underline' }}>
            Ver bases y condiciones
          </button>
        </div>
      </div>

      {/* Premios preview */}
      <div style={{ padding: '8px 20px 0', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>Premios</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { pos: '🎟️', txt: config?.prizeInvitado || 'Cupón 20% invitados' },
            { pos: '🍔', txt: config?.prizeCliente || 'Combo doble (clientes sin compras en el Mundial)' },
            { pos: '🥇', txt: config?.prize1 || 'Top 3 — premio 1° puesto' },
          ].map(({ pos, txt }) => (
            <div key={pos} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{pos}</span>
              <span style={{ fontSize: 12, color: C.text2 }}>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking preview */}
      {ranking.length > 0 && (
        <div style={{ padding: '20px 20px 40px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>Top 10 actual</div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {ranking.slice(0, 10).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < ranking.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, minWidth: 22 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.nombre}</span>
                </div>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: C.yellow, letterSpacing: 1 }}>{r.totalPuntos} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── OTP — pantalla de verificación ───────────────────────────────────────
  if (fase === 'otp') return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>

      {/* Card central */}
      <div style={{ width: '100%', maxWidth: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f1a08 0%, #0a1205 100%)', borderBottom: `1px solid ${C.border}`, padding: '28px 24px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(232,184,75,0.1)', border: `1px solid ${C.yellow}44`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>
            💬
          </div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, letterSpacing: 1, marginBottom: 6 }}>
            CÓDIGO ENVIADO
          </div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
            {otpNombre ? `¡Hola, ${otpNombre}! ` : ''}Te mandamos un código de 6 dígitos por WhatsApp al número{' '}
            <span style={{ color: C.text, fontWeight: 500 }}>
              {whatsapp.replace(/(\d{2})(\d+)(\d{4})/, (_, a, m, e) => `${a}${'*'.repeat(m.length)}${e}`)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 28px' }}>
          {/* Input del código */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Código de verificación
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && handleVerificarCodigo()}
              autoFocus
              placeholder="0000"
              style={{
                width: '100%', background: C.card, border: `2px solid ${otpCode.length === 4 ? C.yellow : C.border2}`,
                borderRadius: 14, color: C.text, padding: '16px 20px', fontSize: 28, letterSpacing: '0.5em',
                outline: 'none', boxSizing: 'border-box', textAlign: 'center', fontFamily: 'monospace',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Botón verificar */}
          <button
            onClick={handleVerificarCodigo}
            disabled={loginLoading || otpCode.length < 4}
            style={{ width: '100%', background: loginLoading || otpCode.length < 4 ? C.dim : C.yellow, color: loginLoading || otpCode.length < 4 ? C.text3 : '#000', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: 1, cursor: loginLoading || otpCode.length < 4 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginBottom: 16 }}
          >
            {loginLoading ? 'VERIFICANDO...' : 'INGRESAR AL PRODE →'}
          </button>

          {/* Reenviar y cambiar número */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleReenviarCodigo}
              disabled={resendSecs > 0 || loginLoading}
              style={{ background: 'none', border: 'none', color: resendSecs > 0 ? C.text3 : C.yellow, fontSize: 13, cursor: resendSecs > 0 ? 'not-allowed' : 'pointer', padding: 0 }}
            >
              {resendSecs > 0 ? `Reenviar en ${resendSecs}s` : 'Reenviar código'}
            </button>
            <button
              onClick={() => { setFase('login'); setOtpCode(''); clearInterval(resendTimerRef.current); }}
              style={{ background: 'none', border: 'none', color: C.text3, fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Cambiar número
            </button>
          </div>

          {/* Hint */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.text3, lineHeight: 1.5 }}>
            ⏱ El código expira en <b style={{ color: C.text2 }}>5 minutos</b>. Si no lo recibiste, revisá que el número sea el mismo con el que pediste.
          </div>
        </div>
      </div>

      {/* Logo abajo */}
      <div style={{ marginTop: 24, fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, color: C.text3, letterSpacing: 2 }}>JANZ BURGERS 🍔</div>
    </div>
  );

  // ── PRODE PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif', paddingBottom: 72 }}>

      {showBases && <BasesModal config={config} aceptoBases={aceptoBases} setAceptoBases={setAceptoBases} setShowBases={setShowBases} />}

      {/* Header sticky */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: C.yellowBg2, border: `1px solid ${C.yellow}44`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🏆</div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: C.yellow, lineHeight: 1, letterSpacing: 1 }}>PRODE JANZ</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Hola, {nombre} 👋 {estado?.categoriaLabel && <span style={{ color: C.yellow, fontWeight: 700 }}>· {estado.categoriaLabel}</span>}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowBases(true)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}>
            Bases
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, lineHeight: 1, letterSpacing: 1 }}>{puntos.total}</div>
            <div style={{ fontSize: 10, color: C.text3 }}>pts</div>
          </div>
          {/* Botones PDF e imprimir */}
          <a
            href={`${API.defaults.baseURL}/prode/pdf/${clientId}?download=1`}
            download={`prode-janz-${clientId}.pdf`}
            title="Descargar mis pronósticos en PDF"
            style={{ background: 'rgba(232,184,75,0.08)', border: `1px solid rgba(232,184,75,0.35)`, color: C.yellow, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            📄 Descargar PDF
          </a>
          <a
            href={`${API.defaults.baseURL}/prode/pdf/${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Imprimir mis pronósticos"
            style={{ background: 'rgba(232,184,75,0.05)', border: `1px solid rgba(232,184,75,0.2)`, color: C.yellow, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            🖨️ Imprimir
          </a>
          <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${C.border2}`, color: C.text3, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Categoría y progreso */}
      {estado && (
        <div style={{ margin: '12px 14px 0', background: C.yellowBg, border: `1px solid ${C.yellow}33`, borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow, marginBottom: 4 }}>
            {estado.categoriaLabel} · {estado.premioDescripcion}
          </div>
          <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{estado.proximoPaso}</div>
          {estado.cuponInvitado && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.text }}>
              🎟️ Cupón invitado: <b style={{ color: C.yellow }}>{estado.cuponInvitado}</b>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, borderBottom: `1px solid ${C.border}`, background: C.border, marginTop: 12 }}>
        {[
          { val: puntos.total,       label: 'Total',    color: C.yellow  },
          { val: ptsPronosticos,     label: 'Pronóst.', color: '#a78bfa' },
          { val: ptsBonus,           label: 'Bonus',    color: C.green   },
          { val: `${pronosticados}/${fixture.length}`, label: 'Hechos', color: C.text2 },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ background: C.surface, padding: '10px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color, letterSpacing: 0.5 }}>{val}</div>
            <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Content según tab */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* TAB FIXTURE */}
        {tab === 'fixture' && (
          <div>
            {/* Próximo partido sin pronosticar */}
            {proximo && (
              <div style={{ margin: '14px 14px 4px', background: `linear-gradient(135deg, ${C.yellowBg2} 0%, ${C.surface} 100%)`, border: `1px solid ${C.yellow}33`, borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Zap size={12} color={C.yellow} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.yellow, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sin pronosticar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, background: C.card, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 11, fontWeight: 700, color: C.yellow }}>
                      {proximo.homeLogo ? <img src={proximo.homeLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : initials(proximo.homeTeam)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{proximo.homeTeam}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0 8px' }}>
                    <div style={{ fontSize: 10, color: C.text2 }}>{fmtDate(proximo.matchDate)}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: C.text3, letterSpacing: 2, margin: '2px 0' }}>VS</div>
                    <div style={{ fontSize: 12, color: C.yellow, fontWeight: 700 }}>{fmtTime(proximo.matchDate)}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, background: C.card, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 11, fontWeight: 700, color: C.yellow }}>
                      {proximo.awayLogo ? <img src={proximo.awayLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : initials(proximo.awayTeam)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{proximo.awayTeam}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros de etapa */}
            <div ref={stageRef} style={{ display: 'flex', gap: 6, padding: '14px 14px 6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {STAGES.filter(s => s.key === 'all' || etapasDisponibles.has(s.key)).map(s => (
                <button key={s.key} onClick={() => setStageFilter(s.key)}
                  style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: `1px solid ${stageFilter === s.key ? C.yellow : C.border2}`, background: stageFilter === s.key ? C.yellowBg2 : C.surface, color: stageFilter === s.key ? C.yellow : C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Lista de partidos */}
            <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fixtureFiltrado.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.text3, padding: 40, fontSize: 13 }}>
                  No hay partidos en esta etapa todavía.
                </div>
              ) : (
                Object.entries(grupos).map(([dateKey, { label, matches }]) => (
                  <div key={dateKey}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 2px 6px' }}>
                      {label} · <span style={{ color: C.text2 }}>{matches.filter(m => pronosticos[m._id]).length}/{matches.length}</span>
                    </div>
                    {matches.map(m => (
                      <MatchCard key={m._id} match={m} pronostico={pronosticos[m._id]}
                        onPronostico={handlePronostico} saving={saving === m._id} config={config} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB RANKING */}
        {tab === 'ranking' && (
          <div style={{ padding: 14 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: C.yellow, letterSpacing: 2, marginBottom: 14 }}>RANKING GENERAL</div>
            {ranking.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Aún no hay participantes.</div>
            ) : (() => {
              const top10     = ranking.slice(0, 10);
              const myIndex   = ranking.findIndex(r => String(r._id) === String(clientId));
              const inTop10    = myIndex !== -1 && myIndex < 10;
              const myEntry   = myIndex !== -1 ? ranking[myIndex] : null;

              const renderRow = (r, i, forceHighlight = false) => {
                const isMe  = String(r._id) === String(clientId);
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div key={i} style={{ background: (isMe || forceHighlight) ? C.yellowBg2 : C.surface, border: `1px solid ${(isMe || forceHighlight) ? C.yellow + '44' : C.border}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, minWidth: 32, textAlign: 'center', color: medal ? C.text : C.text3, letterSpacing: 0 }}>
                      {medal || `${i + 1}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: (isMe || forceHighlight) ? C.yellow : C.text }}>
                        {r.nombre} {isMe && <span style={{ fontSize: 10, background: C.yellowBg2, color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 99, padding: '2px 7px', marginLeft: 4, fontWeight: 600 }}>vos</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, letterSpacing: 1 }}>
                      {r.totalPuntos}
                    </div>
                  </div>
                );
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {top10.map((r, i) => renderRow(r, i))}

                  {/* Si el cliente existe y está fuera del top 10, mostrarlo separado */}
                  {!inTop10 && myEntry && (
                    <>
                      <div style={{ textAlign: 'center', color: C.text3, fontSize: 18, letterSpacing: 2, padding: '2px 0' }}>···</div>
                      {renderRow(myEntry, myIndex)}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB MIS PUNTOS */}
        {tab === 'puntos' && (
          <div style={{ padding: 14 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: C.yellow, letterSpacing: 2, marginBottom: 14 }}>MIS PUNTOS</div>

            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 14px' }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total acumulado</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: C.yellow, letterSpacing: 1 }}>{puntos.total}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pronósticos</div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#a78bfa' }}>{ptsPronosticos} pts</div>
                </div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bonus categoría</div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.green }}>{ptsBonus} pts</div>
                </div>
              </div>
            </div>

            {/* Posición si está en top10 */}
            {posicion > 0 && (
              <div style={{ background: C.yellowBg, border: `1px solid ${C.yellow}33`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.text2 }}>Tu posición actual</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: C.yellow, letterSpacing: 1 }}>#{posicion}</div>
              </div>
            )}

            {/* Historial */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Últimos movimientos
            </div>
            {puntos.historial.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.text3, padding: 32, fontSize: 13 }}>
                Aún no tenés puntos registrados.<br />¡Empezá a pronosticar!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {puntos.historial.map((h, i) => (
                  <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>{h.descripcion || 'Puntos'}</div>
                      <div style={{ fontSize: 10, color: C.text3 }}>
                        {h.tipo === 'pronostico' ? '⚽ Pronóstico' : h.tipo === 'bonificacion' ? '🎁 Bonus' : h.tipo === 'compra' ? '🍔 Compra (legacy)' : '⭐ Otro'}
                        {' · '}
                        {new Date(h.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: h.puntos > 0 ? C.yellow : C.red, letterSpacing: 0.5 }}>
                      +{h.puntos}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 10, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { key: 'fixture', icon: '⚽', label: 'Fixture' },
          { key: 'ranking', icon: '🏆', label: 'Ranking' },
          { key: 'puntos',  icon: '⭐', label: 'Mis puntos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '10px 0 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 18, opacity: tab === t.key ? 1 : 0.4 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: tab === t.key ? C.yellow : C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.label}</span>
            {tab === t.key && <div style={{ width: 20, height: 2, background: C.yellow, borderRadius: 99 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── SPINNER ────────────────────────────────────────────────────────────────────
const S = {
  fullCenter: { minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 },
  spinner:    { width: 32, height: 32, border: '3px solid #1c1c1c', borderTopColor: '#E8B84B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};

// Inyectar keyframes globalmente (solo una vez)
if (!document.getElementById('prode-spin-style')) {
  const style = document.createElement('style');
  style.id = 'prode-spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

// ── MATCH CARD — resultado unificado obligatorio ───────────────────────────────
function MatchCard({ match, pronostico, onPronostico, saving, config }) {
  const [homeGoals, setHomeGoals] = useState(
    pronostico?.predictedHome != null ? String(pronostico.predictedHome) : ''
  );
  const [awayGoals, setAwayGoals] = useState(
    pronostico?.predictedAway != null ? String(pronostico.predictedAway) : ''
  );
  // Sincronizar si llega un pronóstico nuevo desde afuera (eg. reload)
  useEffect(() => {
    if (pronostico?.predictedHome != null) setHomeGoals(String(pronostico.predictedHome));
    if (pronostico?.predictedAway != null) setAwayGoals(String(pronostico.predictedAway));
  }, [pronostico]);

  const cutoffMs  = (config?.cutoffMinutes || 30) * 60 * 1000;
  const teamsOk   = match.teamsConfirmed !== false;
  const locked    = !teamsOk || match.status !== 'scheduled' || (new Date(match.matchDate) - new Date() < cutoffMs);
  const evaluated = pronostico?.evaluated;
  const pts       = pronostico?.pointsEarned || 0;
  const isLive    = match.status === 'live';

  // Derivar ganador del marcador ingresado (vacío = 0)
  const h = homeGoals !== '' ? Number(homeGoals) : 0;
  const a = awayGoals !== '' ? Number(awayGoals) : 0;
  const derivedWinner = h > a ? 'home' : a > h ? 'away' : 'draw';

  const hasPrev    = pronostico?.predictedHome != null;
  // Si el usuario cambió algún número respecto al guardado → mostrar GUARDAR
  const isModified = hasPrev
    ? (homeGoals !== String(pronostico.predictedHome) || awayGoals !== String(pronostico.predictedAway))
    : true;

  const canSave = !locked && !saving;

  const handleSave = () => {
    if (!canSave) return;
    onPronostico(match._id, derivedWinner, h, a);
  };

  // Colores del pronóstico guardado
  const savedWinner = pronostico?.predictedWinner;
  const statusColor = evaluated
    ? (pts > 0 ? '#22c55e' : '#ef4444')
    : '#E8B84B';
  const statusBg = evaluated
    ? (pts > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)')
    : 'rgba(232,184,75,0.06)';

  return (
    <div style={{
      background: '#101010',
      border: `1px solid ${isLive ? 'rgba(232,184,75,0.3)' : '#1c1c1c'}`,
      borderRadius: 14, padding: '12px 14px', marginBottom: 6,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: '#444' }}>
          {fmtDate(match.matchDate)} · {fmtTime(match.matchDate)}
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {isLive && (
            <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700, letterSpacing: '0.06em' }}>
              EN VIVO
            </span>
          )}
          {!isLive && locked && !evaluated && <Lock size={10} color="#252525" />}
          {evaluated && pts > 0 && (
            <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
              +{pts} ✓
            </span>
          )}
          {evaluated && pts === 0 && (
            <span style={{ background: '#141414', color: '#444', fontSize: 10, padding: '2px 8px', borderRadius: 99 }}>
              0 pts
            </span>
          )}
        </div>
      </div>

      {/* Equipos + marcador */}
      {!teamsOk ? (
        <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>⏳</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', lineHeight: 1.2 }}>Equipos por confirmar</div>
            <div style={{ fontSize: 10, color: '#333', marginTop: 2, lineHeight: 1.4 }}>Los pronósticos se habilitan cuando se definan los clasificados</div>
          </div>
        </div>
      ) : (
        <>
          {/* Fila de equipos y marcador oficial (si terminó) o inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {/* Equipo local */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 28, height: 28, flexShrink: 0 }}>
                {match.homeLogo
                  ? <img src={match.homeLogo} alt={match.homeTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#444' }}>{initials(match.homeTeam)}</div>
                }
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, color: '#fff' }}>{match.homeTeam}</span>
            </div>

            {/* Centro: marcador oficial o inputs */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, minWidth: 100, justifyContent: 'center' }}>
              {match.status === 'finished' ? (
                /* Resultado final */
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: '#E8B84B', letterSpacing: 2 }}>
                    {match.homeScore ?? '?'} — {match.awayScore ?? '?'}
                  </div>
                  <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final</div>
                </div>
              ) : match.status === 'live' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#ef4444', letterSpacing: 2 }}>
                    {match.homeScore ?? 0} — {match.awayScore ?? 0}
                  </div>
                  <div style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>En vivo</div>
                </div>
              ) : locked ? (
                /* Bloqueado — mostrar pronóstico si existe, si no guiones */
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: hasPrev ? '#E8B84B' : '#252525', letterSpacing: 2 }}>
                    {hasPrev ? `${pronostico.predictedHome} — ${pronostico.predictedAway}` : '— vs —'}
                  </div>
                  {!hasPrev && <div style={{ fontSize: 9, color: '#333', marginTop: 2 }}>sin pronóstico</div>}
                </div>
              ) : (
                /* Inputs editables */
                <>
                  <input
                    type="number" min={0} max={20}
                    value={homeGoals}
                    onChange={e => setHomeGoals(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    style={{
                      width: 44, textAlign: 'center', background: '#141414',
                      border: `1px solid ${homeGoals !== '' ? '#E8B84B44' : '#1c1c1c'}`,
                      borderRadius: 8, color: '#fff', padding: '8px 4px', fontSize: 22,
                      fontFamily: 'Bebas Neue, sans-serif', outline: 'none',
                      WebkitAppearance: 'none', MozAppearance: 'textfield',
                    }}
                  />
                  <span style={{ color: '#252525', fontWeight: 900, fontSize: 18, userSelect: 'none' }}>—</span>
                  <input
                    type="number" min={0} max={20}
                    value={awayGoals}
                    onChange={e => setAwayGoals(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    style={{
                      width: 44, textAlign: 'center', background: '#141414',
                      border: `1px solid ${awayGoals !== '' ? '#E8B84B44' : '#1c1c1c'}`,
                      borderRadius: 8, color: '#fff', padding: '8px 4px', fontSize: 22,
                      fontFamily: 'Bebas Neue, sans-serif', outline: 'none',
                      WebkitAppearance: 'none', MozAppearance: 'textfield',
                    }}
                  />
                </>
              )}
            </div>

            {/* Equipo visitante */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 28, height: 28, flexShrink: 0 }}>
                {match.awayLogo
                  ? <img src={match.awayLogo} alt={match.awayTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#444' }}>{initials(match.awayTeam)}</div>
                }
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, color: '#fff' }}>{match.awayTeam}</span>
            </div>
          </div>

          {/* Botón guardar o estado guardado */}
          {!locked && (
            hasPrev && !isModified ? (
              /* ── Estado: guardado sin cambios ── */
              <div style={{
                width: '100%', background: 'rgba(34,197,94,0.10)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 10, padding: '10px 0',
                fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: 1,
                color: '#22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                ✓ GUARDADO —{' '}
                {savedWinner === 'home'
                  ? `GANA ${match.homeTeam.split(' ')[0].toUpperCase()}`
                  : savedWinner === 'away'
                    ? `GANA ${match.awayTeam.split(' ')[0].toUpperCase()}`
                    : 'EMPATE'}
              </div>
            ) : (
              /* ── Estado: primer guardado o resultado modificado ── */
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  width: '100%',
                  background: canSave ? '#E8B84B' : '#141414',
                  color: canSave ? '#000' : '#333',
                  border: `1px solid ${canSave ? '#E8B84B' : '#1c1c1c'}`,
                  borderRadius: 10, padding: '10px 0',
                  fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: 1,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {saving ? 'GUARDANDO...' : (
                  derivedWinner === 'home'
                    ? `✓ GUARDAR — GANA ${match.homeTeam.split(' ')[0].toUpperCase()}`
                    : derivedWinner === 'away'
                      ? `✓ GUARDAR — GANA ${match.awayTeam.split(' ')[0].toUpperCase()}`
                      : '✓ GUARDAR — EMPATE'
                )}
              </button>
            )
          )}

          {/* Pronóstico guardado (bloqueado o evaluado) */}
          {(locked || evaluated) && hasPrev && (
            <div style={{
              marginTop: 6, background: statusBg,
              border: `1px solid ${statusColor}22`,
              borderRadius: 8, padding: '7px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: '#555' }}>Tu pronóstico</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>
                {pronostico.predictedHome} — {pronostico.predictedAway}
                {' · '}
                {savedWinner === 'home'
                  ? `Gana ${match.homeTeam.split(' ')[0]}`
                  : savedWinner === 'away'
                    ? `Gana ${match.awayTeam.split(' ')[0]}`
                    : 'Empate'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}