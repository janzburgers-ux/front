import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Lock, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../utils/api';

// ── Paleta idéntica a PublicProde ──────────────────────────────────────────────
const C = {
  bg:       '#080808',
  surface:  '#101010',
  card:     '#141414',
  border:   '#1c1c1c',
  border2:  '#242424',
  yellow:   '#E8B84B',
  yellowBg: 'rgba(232,184,75,0.08)',
  yellowBg2:'rgba(232,184,75,0.15)',
  dim:      '#252525',
  green:    '#22c55e',
  red:      '#ef4444',
  blue:     '#3b82f6',
  purple:   '#a78bfa',
  text:     '#ffffff',
  text2:    '#888888',
  text3:    '#444444',
};

const STAGES = [
  { key: 'all',              label: 'Todo'        },
  { key: 'Fase de Grupos',   label: 'Grupos'      },
  { key: 'Ronda de 32',      label: 'R. de 32'    },
  { key: 'Octavos de Final', label: 'Octavos'     },
  { key: 'Cuartos de Final', label: 'Cuartos'     },
  { key: 'Semifinal',        label: 'Semis'       },
  { key: 'Tercer Puesto',    label: '3er Puesto'  },
  { key: 'Final',            label: 'Final'       },
];

const REVEAL_MS = 5 * 60 * 1000;

const WINNER_LABEL = { home: 'Local', away: 'Visitante', draw: 'Empate' };
const WINNER_COLOR = { home: C.blue,  away: C.purple,    draw: C.text2  };
const MEDALS       = ['🥇', '🥈', '🥉'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}
function fmtCountdown(ms) {
  if (ms <= 0) return '0:00';
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function isRevealed(matchDate) {
  return Date.now() >= new Date(matchDate).getTime() + REVEAL_MS;
}
function msToReveal(matchDate) {
  return new Date(matchDate).getTime() + REVEAL_MS - Date.now();
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
function TeamLogo({ logo, name, size = 32 }) {
  return logo
    ? <img src={logo} alt={name} style={{ width: size, height: size, objectFit: 'contain' }} />
    : <div style={{
        width: size, height: size, background: C.dim, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color: C.text3,
      }}>{initials(name)}</div>;
}

function StatusBadge({ status }) {
  const map = {
    live:      { label: '● EN VIVO',  color: C.green, bg: 'rgba(34,197,94,0.12)' },
    finished:  { label: 'Finalizado', color: C.text3, bg: 'transparent'           },
    scheduled: { label: 'Programado', color: C.text3, bg: 'transparent'           },
  };
  const s = map[status] || map.scheduled;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: s.color, background: s.bg,
      borderRadius: 99, padding: '3px 8px', letterSpacing: '0.04em',
    }}>{s.label}</span>
  );
}

function PredRow({ pred, match }) {
  const p = pred.prediccion;
  const isCorrect = match.winner && p?.winner === match.winner;
  const isExact   = isCorrect && p.home != null && p.away != null
                    && p.home === match.homeScore && p.away === match.awayScore;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: isExact  ? 'rgba(232,184,75,0.07)'
                : isCorrect ? 'rgba(34,197,94,0.05)'
                : 'transparent',
      borderLeft: isExact  ? `2px solid ${C.yellow}`
                : isCorrect ? `2px solid ${C.green}`
                : '2px solid transparent',
    }}>
      {/* Posición */}
      <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
        {pred.position <= 3
          ? <span style={{ fontSize: 14 }}>{MEDALS[pred.position - 1]}</span>
          : <span style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>{pred.position}</span>
        }
      </div>

      {/* Nombre */}
      <div style={{
        flex: 1, fontSize: 13, fontWeight: 600, color: C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{pred.apodo}</div>

      {/* Puntos */}
      <div style={{ fontSize: 11, color: C.yellow, fontWeight: 700, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
        {pred.totalPuntos}pts
      </div>

      {/* Predicción */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 84 }}>
        {!p
          ? <span style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>Sin pronóstico</span>
          : <>
              <div style={{ fontSize: 12, fontWeight: 700, color: WINNER_COLOR[p.winner] }}>
                {WINNER_LABEL[p.winner]}
              </div>
              {p.home != null && p.away != null && (
                <div style={{ fontSize: 11, color: C.text2 }}>{p.home} - {p.away}</div>
              )}
            </>
        }
      </div>
    </div>
  );
}

function MatchCard({ match, predictions, loadingPred, expanded, onToggle }) {
  const revealed    = isRevealed(match.matchDate);
  const msLeft      = msToReveal(match.matchDate);
  const hasStarted  = Date.now() >= new Date(match.matchDate).getTime();
  const showScore   = match.status === 'finished' || match.status === 'live';

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden', marginBottom: 10,
    }}>
      {/* Cabecera del partido */}
      <div
        style={{ padding: '12px 14px', cursor: revealed ? 'pointer' : 'default' }}
        onClick={revealed ? onToggle : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <StatusBadge status={match.status} />
          <span style={{ fontSize: 11, color: C.text3 }}>{fmtTime(match.matchDate)}</span>
        </div>

        {/* Equipos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TeamLogo logo={match.homeLogo} name={match.homeTeam} />
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {match.homeTeam}
            </div>
          </div>

          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
            {showScore
              ? <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2 }}>
                  {match.homeScore ?? '?'} - {match.awayScore ?? '?'}
                </div>
              : <div style={{ fontSize: 14, color: C.text3, fontWeight: 600 }}>VS</div>
            }
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TeamLogo logo={match.awayLogo} name={match.awayTeam} />
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {match.awayTeam}
            </div>
          </div>
        </div>

        {/* Indicador de candado o expandir */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {!revealed
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: hasStarted ? C.yellow : C.text3 }}>
                <Lock size={11} />
                {hasStarted
                  ? <span>Se revelan en <strong>{fmtCountdown(msLeft)}</strong></span>
                  : <span>Visible 5 min después del inicio</span>
                }
              </div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.yellow, fontWeight: 600 }}>
                <Eye size={11} />
                <span>Predicciones top 10</span>
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </div>
          }
        </div>
      </div>

      {/* Panel de predicciones */}
      {revealed && expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Encabezado de columnas */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ width: 24 }} />
            <div style={{ flex: 1, fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jugador</div>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 36, textAlign: 'right' }}>Pts</div>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 84, textAlign: 'right' }}>Pronóstico</div>
          </div>

          {loadingPred
            ? <div style={{ padding: 20, textAlign: 'center', color: C.text3, fontSize: 12 }}>Cargando predicciones…</div>
            : predictions?.length
              ? <div style={{ padding: '4px 6px 6px' }}>
                  {predictions.map(pred => (
                    <PredRow key={pred.position} pred={pred} match={match} />
                  ))}
                </div>
              : <div style={{ padding: 20, textAlign: 'center', color: C.text3, fontSize: 12 }}>
                  Nadie del top 10 pronosticó este partido.
                </div>
          }

          {/* Aclaración de privacidad */}
          <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.text3, textAlign: 'center' }}>
            Solo se muestra el primer nombre. Los datos de contacto permanecen privados.
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PrediccionesPublicas() {
  const [fixture,      setFixture     ] = useState([]);
  const [predictions,  setPredictions ] = useState({}); // matchId → [] (solo partidos revelados)
  const [expanded,     setExpanded    ] = useState({}); // matchId → bool
  const [stageFilter,  setStageFilter ] = useState('all');
  const [loading,      setLoading     ] = useState(true);
  const [, setTick] = useState(0); // dispara re-render cada segundo para el countdown
  const autoExpandedRef = useRef(new Set()); // matchIds ya auto-expandidos al revelarse

  // Carga el fixture una sola vez al montar
  useEffect(() => {
    API.get('/prode/fixture')
      .then(res => {
        setFixture(res.data);
        // Auto-expandir los partidos en vivo
        const auto = {};
        res.data.forEach(m => { if (m.status === 'live') auto[m._id] = true; });
        setExpanded(auto);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Trae en UNA sola request las predicciones de TODOS los partidos ya
  // revelados. Antes se pedía partido por partido (uno por cada partido ya
  // arrancado), lo que con el Mundial avanzado dispara docenas de requests
  // simultáneos apenas se entra a la página. Ahora siempre es 1 sola llamada.
  const fetchAllPredictions = useCallback(async () => {
    try {
      const res = await API.get('/prode/predicciones-publicas');
      const nuevas = {};
      for (const [matchId, data] of Object.entries(res.data)) {
        if (data.revealed) nuevas[matchId] = data.predicciones;
      }
      setPredictions(prev => ({ ...prev, ...nuevas }));
      // Auto-expandir la primera vez que aparecen las predicciones de cada partido
      setExpanded(prev => {
        const next = { ...prev };
        for (const matchId of Object.keys(nuevas)) {
          if (!autoExpandedRef.current.has(matchId)) {
            autoExpandedRef.current.add(matchId);
            next[matchId] = true;
          }
        }
        return next;
      });
    } catch { /* se reintenta solo en el próximo ciclo de 30s */ }
  }, []);

  // Carga inicial + refresco cada 30 segundos (para detectar partidos que
  // se acaban de revelar), pero siempre con UNA sola llamada al backend.
  useEffect(() => {
    if (fixture.length === 0) return;
    fetchAllPredictions();
    const id = setInterval(fetchAllPredictions, 30_000);
    return () => clearInterval(id);
  }, [fixture.length, fetchAllPredictions]);

  // Tick cada segundo para el countdown de los partidos próximos a revelarse
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Filtrado + agrupado por fecha
  const filtered = stageFilter === 'all'
    ? fixture
    : fixture.filter(m => m.stage === stageFilter);

  const grupos = [...filtered]
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
    .reduce((acc, m) => {
      const key = new Date(m.matchDate).toDateString();
      if (!acc[key]) acc[key] = { label: fmtDate(m.matchDate), matches: [] };
      acc[key].matches.push(m);
      return acc;
    }, {});

  const etapasDisponibles = new Set(fixture.map(m => m.stage));

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.text3, fontSize: 13 }}>Cargando partidos…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>

      {/* Header sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '14px 16px',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: C.yellow, letterSpacing: 1 }}>
              PREDICCIONES PÚBLICAS
            </div>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Prode Janz · Top 10
            </div>
          </div>
          <Trophy size={20} color={C.yellow} />
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 14px 40px' }}>

        {/* Banner explicativo */}
        <div style={{
          background: C.yellowBg, border: `1px solid rgba(232,184,75,0.2)`,
          borderRadius: 12, padding: '11px 14px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Eye size={15} color={C.yellow} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            Para garantizar transparencia, las predicciones de los&nbsp;
            <strong style={{ color: C.yellow }}>top 10</strong> se revelan&nbsp;
            <strong style={{ color: C.text }}>5 minutos después de que arranca cada partido</strong>,
            para que nadie pueda copiar lo que pusieron los punteros.
          </p>
        </div>

        {/* Filtro por etapa */}
        {fixture.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
            {STAGES
              .filter(s => s.key === 'all' || etapasDisponibles.has(s.key))
              .map(s => (
                <button
                  key={s.key}
                  onClick={() => setStageFilter(s.key)}
                  style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 99,
                    border: `1px solid ${stageFilter === s.key ? C.yellow : C.border2}`,
                    background: stageFilter === s.key ? C.yellowBg2 : C.surface,
                    color: stageFilter === s.key ? C.yellow : C.text2,
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >{s.label}</button>
              ))
            }
          </div>
        )}

        {/* Partidos agrupados por fecha */}
        {Object.values(grupos).map(grupo => (
          <div key={grupo.label} style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
            }}>
              {grupo.label}
            </div>
            {grupo.matches.map(match => (
              <MatchCard
                key={match._id}
                match={match}
                predictions={predictions[match._id]}
                loadingPred={isRevealed(match.matchDate) && predictions[match._id] === undefined}
                expanded={!!expanded[match._id]}
                onToggle={() => setExpanded(prev => ({ ...prev, [match._id]: !prev[match._id] }))}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.text3, fontSize: 13, padding: '48px 0' }}>
            No hay partidos para mostrar.
          </div>
        )}

        {/* Link de vuelta */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <a
            href="/prode-publico"
            style={{ fontSize: 12, color: C.text3, textDecoration: 'none' }}
          >
            ← Volver al prode
          </a>
        </div>
      </div>
    </div>
  );
}