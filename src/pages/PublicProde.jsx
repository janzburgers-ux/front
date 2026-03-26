import { useState, useEffect } from 'react';
import { Trophy, Star, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function PublicProde() {
  const [fase, setFase] = useState('loading'); // 'loading' | 'login' | 'prode' | 'inactivo'
  const [whatsapp, setWhatsapp] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [fixture, setFixture] = useState([]);
  const [pronosticos, setPronosticos] = useState({});
  const [puntos, setPuntos] = useState({ total: 0, historial: [] });
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(null);
  const [expandGroup, setExpandGroup] = useState({});
  const [ranking, setRanking] = useState([]);
  const [verRanking, setVerRanking] = useState(false);
  const [showBases, setShowBases] = useState(false);
  const [aceptoBases, setAceptoBases] = useState(false);

  useEffect(() => {
    // Cargar ranking público siempre
    API.get('/prode/ranking/publico').then(r => setRanking(r.data)).catch(() => {});

    API.get('/prode/config').then(r => {
      setConfig(r.data);
      if (!r.data?.enabled) { setFase('inactivo'); return; }
      // Ver si tiene sesión guardada en localStorage
      const saved = localStorage.getItem('janz_prode_client');
      if (saved) {
        try {
          const { clientId: cid, nombre: nom } = JSON.parse(saved);
          setClientId(cid);
          setNombre(nom);
          setFase('cargando_prode');
          cargarProde(cid);
          return;
        } catch {}
      }
      // Verificar si ya aceptó las bases
      const basesAceptadas = localStorage.getItem('janz_prode_bases');
      if (!basesAceptadas) setShowBases(true);
      setFase('login');
    }).catch(() => setFase('login'));
  }, []);

  const cargarProde = async (cid) => {
    try {
      const [f, p, pts] = await Promise.all([
        API.get('/prode/fixture'),
        API.get(`/prode/pronosticos/${cid}`),
        API.get(`/prode/puntos/${cid}`),
      ]);
      setFixture(f.data);
      const pMap = {};
      p.data.forEach(pr => { pMap[pr.matchId?._id || pr.matchId] = pr; });
      setPronosticos(pMap);
      setPuntos(pts.data);
      const groups = [...new Set(f.data.map(m => m.group || m.stage || 'Fixture'))];
      if (groups[0]) setExpandGroup({ [groups[0]]: true });
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
      setClientId(cid);
      setNombre(nom);
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

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (fase === 'loading' || fase === 'cargando_prode') return (
    <div style={pageStyle}>
      <Trophy size={40} color="#E8B84B" style={{ marginBottom: 16 }} />
      <p style={{ color: '#555', fontSize: 14 }}>Cargando...</p>
    </div>
  );

  // ── INACTIVO ───────────────────────────────────────────────────────────────
  if (fase === 'inactivo') return (
    <div style={pageStyle}>
      <Trophy size={48} color="#E8B84B" style={{ marginBottom: 16 }} />
      <h1 style={{ color: '#E8B84B', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Prode Janz — Mundial 2026</h1>
      <p style={{ color: '#555', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>El prode todavía no está disponible. ¡Volvé pronto!</p>
    </div>
  );

  // ── BASES Y CONDICIONES (modal) ───────────────────────────────────────────
  const BasesModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#111', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', border: '1px solid #1e1e1e', borderBottom: 'none' }}>
        <div style={{ padding: '20px 20px 0', position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
          <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E8B84B', lineHeight: 1.2 }}>BASES Y CONDICIONES</div>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>PRODE JANZ — EL MUNDIAL SE JUEGA EN CASA</div>
          <div style={{ height: 1, background: '#1e1e1e' }} />
        </div>

        <div style={{ padding: '16px 20px', fontSize: 13, color: '#aaa', lineHeight: 1.7 }}>
          <Section n="1" title="¿Quiénes pueden participar?">
            Podrán participar todos los clientes de Janz Burgers que realicen sus pronósticos a través del prode oficial de JANZ.
          </Section>
          <Section n="2" title="El Sistema de Puntos (La Calculadora Janz)">
            Para ganar, no solo necesitás saber de fútbol, también tenés que tener hambre. Los puntos se distribuyen así:
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><b style={{ color: '#E8B84B' }}>Acierto Ganador/Empate:</b> 3 puntos.</li>
              <li><b style={{ color: '#E8B84B' }}>Resultado Exacto (Pleno):</b> 7 puntos.</li>
              <li><b style={{ color: '#E8B84B' }}>Puntos por Compra (El MVP):</b> Cada combo comprado suma 10 puntos directos a tu tabla.</li>
            </ul>
            <div style={{ marginTop: 8, fontSize: 12, color: '#555', fontStyle: 'italic' }}>Dato para los analistas: Una burger te acomoda en la tabla más que un hackeo a la FIFA.</div>
          </Section>
          <Section n="3" title="Mecánica del Juego">
            Los pronósticos de cada fecha se cierran 1 hora antes cada partido.
            <div style={{ marginTop: 6 }}><b style={{ color: '#fff' }}>Condición de Oro:</b> Para ser elegible para cualquiera de los 3 premios finales, el participante deberá haber realizado al menos 3 compras durante la duracion del torneo.</div>
          </Section>
          <Section n="4" title="Los Premios (El Podio)">
            Habrá 3 ganadores basados en la tabla general al finalizar el Mundial:
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>🥇 <b style={{ color: '#E8B84B' }}>Campeón:</b> ¡Un mes de Janz Burgers gratis! (1 combo doble por semana durante 4 semanas, cualquier combo + Mini pelota oficial del mundial).</li>
              <li>🥈 <b style={{ color: '#aaa' }}>Subcampeón:</b> Mini pelota oficial del mundial + 1 Combo a elección doble.</li>
              <li>🥉 <b style={{ color: '#cd7f32' }}>Tercer Puesto:</b> 1 Combo a elección por el bronce.</li>
            </ul>
          </Section>
          <Section n="5" title="Empates y Dudas">
            En caso de empate en puntos al final del torneo, el ganador se definirá por:
            <ul style={{ marginTop: 8, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Mayor cantidad de resultados exactos</li>
              <li>Si persiste, mayor cantidad de compras registradas.</li>
              <li>Si siguen iguales, decide el dueño de Janz a través de una pregunta.</li>
            </ul>
          </Section>
        </div>

        <div style={{ padding: '16px 20px 24px', borderTop: '1px solid #1e1e1e', position: 'sticky', bottom: 0, background: '#111' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptoBases} onChange={e => setAceptoBases(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#E8B84B', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#777' }}>Leí y acepto las bases y condiciones</span>
          </label>
          <button
            disabled={!aceptoBases}
            onClick={() => {
              localStorage.setItem('janz_prode_bases', '1');
              setShowBases(false);
            }}
            style={{ width: '100%', background: aceptoBases ? '#E8B84B' : '#1a1a1a', color: aceptoBases ? '#000' : '#333', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 800, cursor: aceptoBases ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            Participar →
          </button>
        </div>
      </div>
    </div>
  );

  const Section = ({ n, title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{n}. {title}</div>
      <div>{children}</div>
    </div>
  );

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (fase === 'login') return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      {showBases && <BasesModal />}
      <div style={{ width: '100%', maxWidth: 360 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(232,184,75,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>🏆</div>
          <h1 style={{ color: '#E8B84B', fontSize: 24, fontWeight: 900, margin: '0 0 6px', letterSpacing: -0.5 }}>Prode Janz</h1>
          <p style={{ color: '#555', fontSize: 13, margin: 0 }}>Mundial 2026 · Pronosticá y ganá</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 24 }}>
          <p style={{ color: '#777', fontSize: 13, marginBottom: 20, lineHeight: 1.5, marginTop: 0 }}>
            Ingresá con el número de WhatsApp que usaste al comprar.
          </p>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Tu número de WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ej: 1134567890"
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button
            onClick={handleLogin}
            disabled={loginLoading || !whatsapp.trim()}
            style={{ width: '100%', background: loginLoading ? '#333' : '#E8B84B', color: loginLoading ? '#666' : '#000', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 800, cursor: loginLoading ? 'not-allowed' : 'pointer' }}>
            {loginLoading ? 'Verificando...' : 'Entrar al Prode →'}
          </button>
          <p style={{ color: '#2a2a2a', fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
            Solo pueden participar clientes con al menos tres pedidos realizado.
          </p>
        </div>

        {/* Ranking público */}
        <button onClick={() => setVerRanking(v => !v)} style={{ width: '100%', background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', marginTop: 16, marginBottom: 4, textDecoration: 'underline' }}>
          {verRanking ? 'Ocultar ranking' : '🏅 Ver ranking actual'}
        </button>

        {verRanking && ranking.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Top 5 — Ranking actual</div>
            {ranking.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < ranking.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, minWidth: 24 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}°`}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.nombre}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#E8B84B' }}>{r.totalPuntos} pts</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { pts: `+${config?.pointsWinner || 1} pt`,     label: 'Acertás ganador' },
            { pts: `+${config?.pointsExact || 5} pts`,     label: 'Resultado exacto' },
            { pts: `+${config?.pointsPerOrder || 1} pt`,   label: 'Por cada compra' },
          ].map(({ pts, label }) => (
            <div key={label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ color: '#E8B84B', fontWeight: 800, fontSize: 16 }}>{pts}</div>
              <div style={{ color: '#333', fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── PRODE ──────────────────────────────────────────────────────────────────
  const groups = fixture.reduce((acc, m) => {
    const key = m.group || m.stage || 'Fixture';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const ptsPronosticos = puntos.historial.filter(h => h.tipo === 'pronostico').reduce((s, h) => s + h.puntos, 0);
  const ptsCompras     = puntos.historial.filter(h => h.tipo === 'compra').reduce((s, h) => s + h.puntos, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Header sticky */}
      <div style={{ background: '#111', borderBottom: '1px solid #1e1e1e', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#E8B84B', lineHeight: 1 }}>Prode Janz</div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Hola, {nombre} 👋</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#E8B84B', lineHeight: 1 }}>{puntos.total}</div>
            <div style={{ fontSize: 10, color: '#444' }}>pts totales</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #222', color: '#444', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Resumen puntos */}
      <div style={{ padding: '12px 16px', background: '#0d0d0d', borderBottom: '1px solid #161616', display: 'flex', gap: 8 }}>
        {[
          { val: ptsPronosticos, label: 'pronósticos', color: '#a78bfa' },
          { val: ptsCompras,     label: 'compras',     color: '#86efac' },
          { val: puntos.total,   label: 'total',       color: '#E8B84B', highlight: true },
        ].map(({ val, label, color, highlight }) => (
          <div key={label} style={{ flex: 1, background: highlight ? '#1a1200' : '#111', border: `1px solid ${highlight ? '#E8B84B22' : '#1e1e1e'}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>pts {label}</div>
          </div>
        ))}
      </div>

      {/* Fixture */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
        {fixture.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#333', padding: 40, fontSize: 14 }}>
            El fixture todavía no está cargado. ¡Volvé pronto!
          </div>
        ) : (
          Object.entries(groups).map(([grupo, matches]) => (
            <div key={grupo} style={{ marginBottom: 10 }}>
              <button
                onClick={() => setExpandGroup(p => ({ ...p, [grupo]: !p[grupo] }))}
                style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                <span>{grupo}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#333' }}>
                    {matches.filter(m => pronosticos[m._id]).length}/{matches.length}
                  </span>
                  {expandGroup[grupo] ? <ChevronUp size={14} color="#333" /> : <ChevronDown size={14} color="#333" />}
                </div>
              </button>

              {expandGroup[grupo] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {matches.map(m => (
                    <MatchCard
                      key={m._id}
                      match={m}
                      pronostico={pronosticos[m._id]}
                      onPronostico={handlePronostico}
                      saving={saving === m._id}
                      config={config}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' };

// ── Tarjeta de partido ─────────────────────────────────────────────────────────
function MatchCard({ match, pronostico, onPronostico, saving, config }) {
  const [showExact, setShowExact] = useState(false);
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  // Ganador seleccionado localmente (para cuando showExact está abierto)
  const [localWinner, setLocalWinner] = useState(null);

  const d = new Date(match.matchDate);
  const dateStr = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const cutoffMs = (config?.cutoffMinutes || 30) * 60 * 1000;
  const locked    = match.status !== 'scheduled' || (new Date(match.matchDate) - new Date() < cutoffMs);
  const selected  = pronostico?.predictedWinner;
  const evaluated = pronostico?.evaluated;
  const pts       = pronostico?.pointsEarned || 0;

  // Cuando showExact se abre, inicializar localWinner con el pronóstico guardado
  const handleToggleExact = () => {
    if (!showExact) setLocalWinner(selected || null);
    setShowExact(s => !s);
  };

  const handleGuardarConExacto = () => {
    if (!localWinner) return;
    const h = homeGoals !== '' ? Number(homeGoals) : null;
    const a = awayGoals !== '' ? Number(awayGoals) : null;
    onPronostico(match._id, localWinner, h, a);
  };

  // Estilo del botón según si showExact está abierto o no
  const btnStyle = (val) => {
    const isSelected = showExact ? localWinner === val : selected === val;
    return {
      flex: 1, padding: '10px 6px', border: 'none', borderRadius: 8,
      cursor: locked ? 'default' : 'pointer',
      fontWeight: 700, fontSize: 12, lineHeight: 1.3, textAlign: 'center',
      background: isSelected ? (evaluated && !showExact ? (pts > 0 ? '#166534' : '#1a0505') : '#1a1200') : '#1a1a1a',
      color:      isSelected ? (evaluated && !showExact ? (pts > 0 ? '#86efac' : '#ef4444') : '#E8B84B') : '#444',
      border:     `1px solid ${isSelected ? (evaluated && !showExact ? (pts > 0 ? '#34d39933' : '#ef444433') : '#E8B84B33') : '#222'}`,
      opacity: locked && !isSelected ? 0.35 : 1,
    };
  };

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#333' }}>{dateStr} · {timeStr}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {locked && <Lock size={10} color="#2a2a2a" />}
          {evaluated && pts > 0 && <span style={{ background: '#166534', color: '#86efac', fontSize: 10, padding: '2px 7px', borderRadius: 99 }}>+{pts} pts ✓</span>}
          {evaluated && pts === 0 && <span style={{ background: '#1a1a1a', color: '#444', fontSize: 10, padding: '2px 7px', borderRadius: 99 }}>0 pts</span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>
        <span style={{ flex: 1, textAlign: 'right' }}>{match.homeTeam}</span>
        <span style={{ color: match.status === 'finished' ? '#E8B84B' : '#222', fontSize: 15, fontWeight: 900, minWidth: 40, textAlign: 'center' }}>
          {match.status === 'finished' ? `${match.homeScore}-${match.awayScore}` : 'vs'}
        </span>
        <span style={{ flex: 1 }}>{match.awayTeam}</span>
      </div>

      {/* Botones de ganador — en modo exacto solo seleccionan, no guardan */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={btnStyle('home')} disabled={saving}
          onClick={() => !locked && (showExact ? setLocalWinner('home') : onPronostico(match._id, 'home'))}>
          {match.homeTeam.split(' ')[0]}<br/>gana
        </button>
        <button style={btnStyle('draw')} disabled={saving}
          onClick={() => !locked && (showExact ? setLocalWinner('draw') : onPronostico(match._id, 'draw'))}>
          Empate
        </button>
        <button style={btnStyle('away')} disabled={saving}
          onClick={() => !locked && (showExact ? setLocalWinner('away') : onPronostico(match._id, 'away'))}>
          {match.awayTeam.split(' ')[0]}<br/>gana
        </button>
      </div>

      {!locked && (
        <>
          <button onClick={handleToggleExact} style={{ width: '100%', background: 'none', border: '1px solid #1a1a1a', borderRadius: 8, padding: 7, fontSize: 11, color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }}>
            <Star size={10} color="#E8B84B" />
            {showExact ? 'Ocultar marcador exacto' : `Marcador exacto (+${config?.pointsExact || 5} pts extra)`}
          </button>

          {showExact && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                <input type="number" min={0} max={20} value={homeGoals} onChange={e => setHomeGoals(e.target.value)} placeholder="0"
                  style={{ width: 52, textAlign: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: 8, fontSize: 18 }} />
                <span style={{ color: '#2a2a2a', fontWeight: 700 }}>—</span>
                <input type="number" min={0} max={20} value={awayGoals} onChange={e => setAwayGoals(e.target.value)} placeholder="0"
                  style={{ width: 52, textAlign: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: 8, fontSize: 18 }} />
              </div>
              <button
                onClick={handleGuardarConExacto}
                disabled={!localWinner || saving}
                style={{ width: '100%', marginTop: 8, background: localWinner ? '#E8B84B' : '#1a1a1a', color: localWinner ? '#000' : '#333', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 800, cursor: localWinner ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Guardando...' : localWinner ? '✓ Guardar pronóstico con marcador' : 'Seleccioná un ganador primero'}
              </button>
            </>
          )}
        </>
      )}

      {selected && !evaluated && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#333', textAlign: 'center' }}>
          Pronóstico: <span style={{ color: '#E8B84B' }}>
            {selected === 'home' ? `${match.homeTeam} gana` : selected === 'away' ? `${match.awayTeam} gana` : 'Empate'}
            {pronostico?.predictedHome != null ? ` · ${pronostico.predictedHome}-${pronostico.predictedAway}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}