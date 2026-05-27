import { useState, useEffect, useRef } from 'react';
import { Trophy, Star, Lock, ChevronDown, ChevronUp, LogOut, Zap, Award, Target } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

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
export default function PublicProde() {
  const [fase,        setFase       ] = useState('loading');
  const [whatsapp,    setWhatsapp   ] = useState('');
  const [loginLoading,setLoginLoading] = useState(false);
  const [clientId,    setClientId   ] = useState(null);
  const [nombre,      setNombre     ] = useState('');
  const [fixture,     setFixture    ] = useState([]);
  const [pronosticos, setPronosticos] = useState({});
  const [puntos,      setPuntos     ] = useState({ total: 0, historial: [] });
  const [config,      setConfig     ] = useState(null);
  const [saving,      setSaving     ] = useState(null);
  const [ranking,     setRanking    ] = useState([]);
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
      const saved = localStorage.getItem('janz_prode_client');
      if (saved) {
        try {
          const { clientId: cid, nombre: nom } = JSON.parse(saved);
          setClientId(cid); setNombre(nom);
          setFase('cargando_prode');
          cargarProde(cid);
          return;
        } catch {}
      }
      const basesAceptadas = localStorage.getItem('janz_prode_bases');
      if (!basesAceptadas) setShowBases(true);
      setFase('login');
    }).catch(() => setFase('login'));
  }, []);

  const cargarProde = async (cid) => {
    try {
      const [f, p, pts, rank] = await Promise.all([
        API.get('/prode/fixture'),
        API.get(`/prode/pronosticos/${cid}`),
        API.get(`/prode/puntos/${cid}`),
        API.get('/prode/ranking/publico'),
      ]);
      setRanking(rank.data);
      setFixture(f.data);
      const pMap = {};
      p.data.forEach(pr => { pMap[pr.matchId?._id || pr.matchId] = pr; });
      setPronosticos(pMap);
      setPuntos(pts.data);
      setFase('prode');
    } catch {
      toast.error('Error cargando el prode');
      setFase('login');
    }
  };

  const handleLogin = async () => {
    if (!whatsapp.trim()) return;
    setLoginLoading(true);
    try {
      const res = await API.post('/prode/acceso', { whatsapp });
      const { clientId: cid, nombre: nom } = res.data;
      setClientId(cid); setNombre(nom);
      localStorage.setItem('janz_prode_client', JSON.stringify({ clientId: cid, nombre: nom }));
      setFase('cargando_prode');
      await cargarProde(cid);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al ingresar');
    } finally { setLoginLoading(false); }
  };

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
    localStorage.removeItem('janz_prode_client');
    setClientId(null); setNombre(''); setFase('login');
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const ptsPronosticos = puntos.historial.filter(h => h.tipo === 'pronostico').reduce((s, h) => s + h.puntos, 0);
  const ptsCompras     = puntos.historial.filter(h => h.tipo === 'compra').reduce((s, h) => s + h.puntos, 0);

  const pronosticados   = Object.keys(pronosticos).length;
  const posicion        = ranking.findIndex(r => String(r._id) === String(clientId)) + 1 || null;

  const fixtureFiltrado = stageFilter === 'all'
    ? fixture
    : fixture.filter(m => m.stage === stageFilter);

  // Agrupar fixture filtrado
  const grupos = fixtureFiltrado.reduce((acc, m) => {
    const key = m.group && m.group !== '' ? m.group : m.stage || 'Fixture';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
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

  // ── BASES MODAL ───────────────────────────────────────────────────────────
  const BasesModal = () => (
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
            Todos los clientes de Janz Burgers con al menos un pedido realizado pueden participar gratuitamente.
          </BasesSection>
          <BasesSection n="2" title="Sistema de puntos">
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><b style={{ color: C.yellow }}>Acierto ganador / empate:</b> {config?.pointsWinner ?? 1} punto{(config?.pointsWinner ?? 1) !== 1 ? 's' : ''}.</li>
              <li><b style={{ color: C.yellow }}>Marcador exacto:</b> +{config?.pointsExact ?? 5} puntos extra.</li>
              <li><b style={{ color: C.yellow }}>Puntos por compra:</b> Cada pedido suma {config?.pointsPerOrder ?? 1} punto{(config?.pointsPerOrder ?? 1) !== 1 ? 's' : ''} automáticamente.</li>
            </ul>
          </BasesSection>
          <BasesSection n="3" title="Mecánica">
            Los pronósticos cierran {config?.cutoffMinutes ?? 30} minutos antes de cada partido. No se pueden modificar una vez cerrados.
            <br/><br/><b style={{ color: C.text }}>Condición de Oro:</b> Para ser elegible a los premios finales, el participante debe haber realizado al menos 3 compras durante el torneo.
          </BasesSection>
          <BasesSection n="4" title="Premios">
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>🥇 <b style={{ color: C.yellow }}>1° Puesto:</b> 1 mes de Janz gratis (1 combo doble/semana × 4 semanas) + mini pelota oficial.</li>
              <li>🥈 <b style={{ color: '#aaa' }}>2° Puesto:</b> Mini pelota oficial + 1 combo doble a elección.</li>
              <li>🥉 <b style={{ color: '#cd7f32' }}>3° Puesto:</b> 1 combo doble a elección.</li>
            </ul>
          </BasesSection>
          <BasesSection n="5" title="Empates">
            En caso de empate: (1) mayor cantidad de exactos, (2) mayor cantidad de compras, (3) pregunta del dueño.
          </BasesSection>
        </div>

        <div style={{ padding: '16px 20px 28px', borderTop: `1px solid ${C.border}`, position: 'sticky', bottom: 0, background: '#0e0e0e' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptoBases} onChange={e => setAceptoBases(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.yellow, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: C.text2 }}>Leí y acepto las bases y condiciones</span>
          </label>
          <button disabled={!aceptoBases}
            onClick={() => { localStorage.setItem('janz_prode_bases', '1'); setShowBases(false); }}
            style={{ width: '100%', background: aceptoBases ? C.yellow : C.dim, color: aceptoBases ? '#000' : C.text3, border: 'none', borderRadius: 12, padding: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: 1, cursor: aceptoBases ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            PARTICIPAR →
          </button>
        </div>
      </div>
    </div>
  );

  const BasesSection = ({ n, title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.yellow, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{n}. {title}</div>
      <div>{children}</div>
    </div>
  );

  // ── LOGIN / LANDING ───────────────────────────────────────────────────────
  if (fase === 'login') return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      {showBases && <BasesModal />}

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
            Pronosticá los 104 partidos del Mundial.<br />
            Cada burger suma puntos. Ganá premios reales.
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
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>¿Ya compraste en Janz?</div>
          <p style={{ color: C.text2, fontSize: 12, marginTop: 0, marginBottom: 18, lineHeight: 1.5 }}>
            Ingresá con el número de WhatsApp que usaste al pedir.
          </p>

          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Tu WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ej: 1134567890"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, color: C.text, padding: '13px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button onClick={handleLogin} disabled={loginLoading || !whatsapp.trim()}
            style={{ width: '100%', background: loginLoading || !whatsapp.trim() ? C.dim : C.yellow, color: loginLoading || !whatsapp.trim() ? C.text3 : '#000', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: 1, cursor: loginLoading || !whatsapp.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {loginLoading ? 'VERIFICANDO...' : 'ENTRAR AL PRODE →'}
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
            { pos: '🥇', txt: '1 mes de Janz gratis + Mini pelota oficial' },
            { pos: '🥈', txt: 'Mini pelota oficial + Combo doble' },
            { pos: '🥉', txt: 'Combo doble a elección' },
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
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>Top 5 actual</div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {ranking.map((r, i) => (
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

  // ── PRODE PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif', paddingBottom: 72 }}>

      {/* Header sticky */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: C.yellowBg2, border: `1px solid ${C.yellow}44`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🏆</div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: C.yellow, lineHeight: 1, letterSpacing: 1 }}>PRODE JANZ</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Hola, {nombre} 👋</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, lineHeight: 1, letterSpacing: 1 }}>{puntos.total}</div>
            <div style={{ fontSize: 10, color: C.text3 }}>pts</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${C.border2}`, color: C.text3, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, borderBottom: `1px solid ${C.border}`, background: C.border }}>
        {[
          { val: puntos.total,       label: 'Total',    color: C.yellow  },
          { val: ptsPronosticos,     label: 'Pronóst.', color: '#a78bfa' },
          { val: ptsCompras,         label: 'Compras',  color: C.green   },
          { val: `${pronosticados}/${fixture.length}`, label: 'Pronost.', color: C.text2 },
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
                Object.entries(grupos).map(([grupo, matches]) => (
                  <div key={grupo}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 2px 6px' }}>
                      {grupo} · <span style={{ color: C.text2 }}>{matches.filter(m => pronosticos[m._id]).length}/{matches.length}</span>
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ranking.map((r, i) => {
                  const isMe = String(r._id) === String(clientId);
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                  return (
                    <div key={i} style={{ background: isMe ? C.yellowBg2 : C.surface, border: `1px solid ${isMe ? C.yellow + '44' : C.border}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, minWidth: 32, textAlign: 'center', color: medal ? C.text : C.text3, letterSpacing: 0 }}>
                        {medal || `${i + 1}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? C.yellow : C.text }}>
                          {r.nombre} {isMe && <span style={{ fontSize: 10, background: C.yellowBg2, color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 99, padding: '2px 7px', marginLeft: 4, fontWeight: 600 }}>vos</span>}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.yellow, letterSpacing: 1 }}>
                        {r.totalPuntos}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <div style={{ fontSize: 9, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compras</div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: C.green }}>{ptsCompras} pts</div>
                </div>
              </div>
            </div>

            {/* Posición si está en top5 */}
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
                        {h.tipo === 'pronostico' ? '⚽ Pronóstico' : h.tipo === 'compra' ? '🍔 Compra' : '⭐ Bonificación'}
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

// ── MATCH CARD ─────────────────────────────────────────────────────────────────
function MatchCard({ match, pronostico, onPronostico, saving, config }) {
  const [showExact,  setShowExact ] = useState(false);
  const [homeGoals,  setHomeGoals ] = useState('');
  const [awayGoals,  setAwayGoals ] = useState('');
  const [localWinner,setLocalWinner] = useState(null);

  const cutoffMs = (config?.cutoffMinutes || 30) * 60 * 1000;
  const locked    = match.status !== 'scheduled' || (new Date(match.matchDate) - new Date() < cutoffMs);
  const selected  = pronostico?.predictedWinner;
  const evaluated = pronostico?.evaluated;
  const pts       = pronostico?.pointsEarned || 0;

  const handleToggleExact = () => {
    if (!showExact) setLocalWinner(selected || null);
    setShowExact(s => !s);
  };
  const handleGuardarConExacto = () => {
    if (!localWinner) return;
    onPronostico(match._id, localWinner, homeGoals !== '' ? Number(homeGoals) : null, awayGoals !== '' ? Number(awayGoals) : null);
    setShowExact(false);
  };

  const btnBg = (val) => {
    const isSelected = showExact ? localWinner === val : selected === val;
    if (!isSelected) return '#141414';
    if (evaluated) return pts > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)';
    return 'rgba(232,184,75,0.12)';
  };
  const btnColor = (val) => {
    const isSelected = showExact ? localWinner === val : selected === val;
    if (!isSelected) return '#333';
    if (evaluated) return pts > 0 ? '#22c55e' : '#ef4444';
    return '#E8B84B';
  };
  const btnBorder = (val) => {
    const isSelected = showExact ? localWinner === val : selected === val;
    if (!isSelected) return '1px solid #1c1c1c';
    if (evaluated) return pts > 0 ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.2)';
    return '1px solid rgba(232,184,75,0.3)';
  };

  const isLive = match.status === 'live';

  return (
    <div style={{ background: '#101010', border: `1px solid ${isLive ? 'rgba(232,184,75,0.3)' : '#1c1c1c'}`, borderRadius: 14, padding: '12px 14px', marginBottom: 6 }}>
      {/* Header de la card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: '#333' }}>
          {fmtDate(match.matchDate)} · {fmtTime(match.matchDate)}
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {isLive && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700, letterSpacing: '0.06em' }}>EN VIVO</span>}
          {locked && !isLive && !evaluated && <Lock size={10} color="#252525" />}
          {evaluated && pts > 0 && <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>+{pts} ✓</span>}
          {evaluated && pts === 0 && <span style={{ background: '#141414', color: '#333', fontSize: 10, padding: '2px 8px', borderRadius: 99 }}>0 pts</span>}
        </div>
      </div>

      {/* Equipos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {/* Logo local */}
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          {match.homeLogo
            ? <img src={match.homeLogo} alt={match.homeTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#444' }}>{initials(match.homeTeam)}</div>
          }
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, textAlign: 'right', lineHeight: 1.2 }}>{match.homeTeam}</span>
        <span style={{ fontSize: match.status === 'finished' ? 15 : 12, fontWeight: 900, color: match.status === 'finished' ? '#E8B84B' : '#1c1c1c', minWidth: 44, textAlign: 'center', fontFamily: match.status === 'finished' ? 'Bebas Neue, sans-serif' : 'inherit', letterSpacing: match.status === 'finished' ? 1 : 0 }}>
          {match.status === 'finished' ? `${match.homeScore}—${match.awayScore}` : 'vs'}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{match.awayTeam}</span>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          {match.awayLogo
            ? <img src={match.awayLogo} alt={match.awayTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#444' }}>{initials(match.awayTeam)}</div>
          }
        </div>
      </div>

      {/* Botones pronóstico */}
      <div style={{ display: 'flex', gap: 5 }}>
        {['home', 'draw', 'away'].map(opt => (
          <button key={opt}
            disabled={locked || saving}
            onClick={() => !locked && (showExact ? setLocalWinner(opt) : onPronostico(match._id, opt))}
            style={{ flex: opt === 'draw' ? 0.8 : 1, padding: '9px 4px', border: btnBorder(opt), borderRadius: 8, cursor: locked ? 'default' : 'pointer', fontWeight: 700, fontSize: 11, lineHeight: 1.3, textAlign: 'center', background: btnBg(opt), color: btnColor(opt), opacity: locked && (showExact ? localWinner !== opt : selected !== opt) ? 0.3 : 1, transition: 'all 0.15s' }}>
            {opt === 'home' ? <>{match.homeTeam.split(' ')[0]}<br/>gana</> : opt === 'draw' ? 'Empate' : <>{match.awayTeam.split(' ')[0]}<br/>gana</>}
          </button>
        ))}
      </div>

      {/* Marcador exacto */}
      {!locked && (
        <>
          <button onClick={handleToggleExact}
            style={{ width: '100%', background: 'none', border: '1px solid #181818', borderRadius: 8, padding: '6px', fontSize: 10, color: '#2a2a2a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 7 }}>
            <Star size={9} color="#E8B84B" fill={showExact ? "#E8B84B" : "none"} />
            {showExact ? 'Ocultar marcador exacto' : `Marcador exacto (+${config?.pointsExact || 5} pts extra)`}
          </button>
          {showExact && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                <input type="number" min={0} max={20} value={homeGoals} onChange={e => setHomeGoals(e.target.value)} placeholder="0"
                  style={{ width: 52, textAlign: 'center', background: '#141414', border: '1px solid #1c1c1c', borderRadius: 8, color: '#fff', padding: 8, fontSize: 18, outline: 'none' }} />
                <span style={{ color: '#1c1c1c', fontWeight: 900, fontSize: 18 }}>—</span>
                <input type="number" min={0} max={20} value={awayGoals} onChange={e => setAwayGoals(e.target.value)} placeholder="0"
                  style={{ width: 52, textAlign: 'center', background: '#141414', border: '1px solid #1c1c1c', borderRadius: 8, color: '#fff', padding: 8, fontSize: 18, outline: 'none' }} />
              </div>
              <button onClick={handleGuardarConExacto} disabled={!localWinner || saving}
                style={{ width: '100%', background: localWinner ? '#E8B84B' : '#141414', color: localWinner ? '#000' : '#333', border: 'none', borderRadius: 8, padding: 10, fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: 1, cursor: localWinner ? 'pointer' : 'not-allowed' }}>
                {saving ? 'GUARDANDO...' : localWinner ? '✓ GUARDAR CON MARCADOR' : 'SELECCIONÁ UN GANADOR'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Pronóstico actual sin evaluar */}
      {selected && !evaluated && (
        <div style={{ marginTop: 7, fontSize: 10, color: '#252525', textAlign: 'center' }}>
          Tu pronóstico: <span style={{ color: '#E8B84B' }}>
            {selected === 'home' ? `${match.homeTeam} gana` : selected === 'away' ? `${match.awayTeam} gana` : 'Empate'}
            {pronostico?.predictedHome != null ? ` · ${pronostico.predictedHome}-${pronostico.predictedAway}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}