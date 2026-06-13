import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Settings, CheckCircle, Calendar, Users, Star, Zap, Plus, Trash2, Gift, Eye, FileText, Search } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => Number(n || 0).toLocaleString('es-AR');
const fmtPeso = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

const TIPO_LABELS = {
  gasto_minimo: { label: 'Gasto mínimo', desc: 'gastar ≥ $X = +N pts', emoji: '💰' },
  por_cada_x:   { label: 'Por cada $X',  desc: 'cada $X gastado = +N pts', emoji: '🔁' },
  producto:     { label: 'Producto',     desc: 'comprar X producto = +N pts', emoji: '🍔' },
};

const STAGE_LABELS = {
  'Fase de Grupos': 'Fase de Grupos',
  'Round of 16': 'Octavos',
  'Quarter-final': 'Cuartos',
  'Semi-final': 'Semifinal',
  'Final': 'Final',
};

export default function Prode() {
  const [tab, setTab] = useState('ranking');
  const [ranking, setRanking] = useState([]);
  const [fixture, setFixture] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugResult, setDebugResult] = useState(null);
  const [debugging, setDebugging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editConfig, setEditConfig] = useState(false);
  const [cfgForm, setCfgForm] = useState({});
  const [bonificaciones, setBonificaciones] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddBon, setShowAddBon] = useState(false);
  const [bonForm, setBonForm] = useState({ tipo: 'gasto_minimo', descripcion: '', montoMinimo: '', puntos: 1, productoId: '', productoNombre: '' });

  // ── Predicciones (vista admin) ───────────────────────────────────────────────
  const [predsMatchId,  setPredsMatchId ] = useState('');
  const [predsData,     setPredsData    ] = useState([]);
  const [predsLoading,  setPredsLoading ] = useState(false);

  // ── Reset de datos de prueba ─────────────────────────────────────────────────
  const [resetClientId,   setResetClientId  ] = useState('');
  const [resetLoading,    setResetLoading   ] = useState(false);
  const [confirmNuclear,  setConfirmNuclear ] = useState(false);
  const [nuclearLoading,  setNuclearLoading ] = useState(false);

  // ── Participantes ─────────────────────────────────────────────────────────────
  const [participantes,   setParticipantes  ] = useState([]);
  const [partsLoading,    setPartsLoading   ] = useState(false);
  const [expandedPart,    setExpandedPart   ] = useState(null);      // clientId expandido
  const [partPreds,       setPartPreds      ] = useState({});         // { clientId: { loading, data } }
  const [partFilter,      setPartFilter     ] = useState('all');      // 'all' | 'ok' | 'nok'

  // ── Test states ─────────────────────────────────────────────────────────────
  const [testEstado,       setTestEstado      ] = useState(null);
  const [testLoadingEstado,setTestLoadingEstado] = useState(false);
  const [simPartido,       setSimPartido      ] = useState({ matchId: '', homeScore: '', awayScore: '' });
  const [simResult,        setSimResult       ] = useState(null);
  const [simLoading,       setSimLoading      ] = useState(false);
  const [simCompra,        setSimCompra       ] = useState({ clientId: '', total: '5000' });
  const [simCompraResult,  setSimCompraResult ] = useState(null);
  const [simCompraLoading, setSimCompraLoading] = useState(false);
  const [cleanResult,      setCleanResult     ] = useState(null);
  const [cleanLoading,     setCleanLoading    ] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f, s, c, b, p] = await Promise.all([
        API.get('/prode/ranking'),
        API.get('/prode/fixture'),
        API.get('/prode/stats'),
        API.get('/prode/config'),
        API.get('/prode/bonificaciones'),
        API.get('/products'),
      ]);
      setRanking(r.data);
      setFixture(f.data);
      setStats(s.data);
      setConfig(c.data);
      setCfgForm(c.data);
      setBonificaciones(b.data);
      setProducts(p.data.filter(p => p.active));
    } catch { toast.error('Error cargando datos del prode'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDebugApi = async () => {
    setDebugging(true);
    setDebugResult(null);
    try {
      const r = await API.get('/prode/fixture/debug-api');
      setDebugResult(r.data);
    } catch (e) {
      setDebugResult({ ok: false, problema: e.response?.data?.message || e.message });
    } finally { setDebugging(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await API.post('/prode/fixture/sync', {}, { timeout: 30000 });
      toast.success(`${r.data.synced} partidos sincronizados (${r.data.insertados} nuevos, ${r.data.actualizados} actualizados)`);
      load();
    } catch { toast.error('Error sincronizando fixture'); }
    finally { setSyncing(false); }
  };

  const handleSeedMock = async () => {
    try {
      await API.post('/prode/fixture/seed-mock');
      toast.success('Fixture de prueba cargado');
      load();
    } catch { toast.error('Error cargando fixture de prueba'); }
  };

  const handleDeleteMock = async () => {
    try {
      const r = await API.delete('/prode/fixture/mock');
      toast.success(`${r.data.deleted} partidos de prueba eliminados`);
      load();
    } catch { toast.error('Error eliminando partidos de prueba'); }
  };

  const handleSaveConfig = async () => {
    try {
      await API.put('/prode/config', cfgForm);
      setConfig(cfgForm);
      setEditConfig(false);
      toast.success('Configuración guardada');
    } catch { toast.error('Error guardando configuración'); }
  };

  const handleSetResultado = async (matchId, homeScore, awayScore) => {
    try {
      await API.put(`/prode/fixture/${matchId}/resultado`, { homeScore: Number(homeScore), awayScore: Number(awayScore) });
      toast.success('Resultado cargado y pronósticos evaluados');
      load();
    } catch { toast.error('Error cargando resultado'); }
  };

  const handleAddBonificacion = async () => {
    if (!bonForm.puntos || bonForm.puntos < 1) return toast.error('Los puntos deben ser ≥ 1');
    if ((bonForm.tipo === 'gasto_minimo' || bonForm.tipo === 'por_cada_x') && !bonForm.montoMinimo) return toast.error('Ingresá el monto');
    if (bonForm.tipo === 'producto' && !bonForm.productoId) return toast.error('Seleccioná un producto');
    try {
      const res = await API.post('/prode/bonificaciones', bonForm);
      setBonificaciones(prev => [...prev, res.data]);
      setShowAddBon(false);
      setBonForm({ tipo: 'gasto_minimo', descripcion: '', montoMinimo: '', puntos: 1, productoId: '', productoNombre: '' });
      toast.success('Bonificación agregada');
    } catch { toast.error('Error al agregar bonificación'); }
  };

  const handleToggleBon = async (idx, activa) => {
    try {
      await API.put(`/prode/bonificaciones/${idx}`, { activa });
      setBonificaciones(prev => prev.map((b, i) => i === idx ? { ...b, activa } : b));
    } catch { toast.error('Error al actualizar'); }
  };

  const handleDeleteBon = async (idx) => {
    try {
      await API.delete(`/prode/bonificaciones/${idx}`);
      setBonificaciones(prev => prev.filter((_, i) => i !== idx));
      toast.success('Bonificación eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const loadPrediccionesByMatch = async (matchId) => {
    if (!matchId) return;
    setPredsLoading(true);
    setPredsData([]);
    try {
      const r = await API.get(`/prode/pronosticos-admin?matchId=${matchId}`);
      setPredsData(r.data);
    } catch { toast.error('Error cargando predicciones'); }
    finally { setPredsLoading(false); }
  };

  const loadParticipantes = async () => {
    setPartsLoading(true);
    try {
      const r = await API.get('/prode/participantes');
      setParticipantes(r.data);
    } catch { toast.error('Error cargando participantes'); }
    finally { setPartsLoading(false); }
  };

  const loadPartPreds = async (clientId) => {
    if (expandedPart === clientId) { setExpandedPart(null); return; }
    setExpandedPart(clientId);
    if (partPreds[clientId]?.data) return; // ya cargado
    setPartPreds(prev => ({ ...prev, [clientId]: { loading: true, data: null } }));
    try {
      const r = await API.get(`/prode/pronosticos/${clientId}`);
      setPartPreds(prev => ({ ...prev, [clientId]: { loading: false, data: r.data } }));
    } catch {
      toast.error('Error cargando predicciones del participante');
      setPartPreds(prev => ({ ...prev, [clientId]: { loading: false, data: [] } }));
    }
  };

  const handleResetCliente = async () => {
    if (!resetClientId) return;
    const cliente = ranking.find(r => String(r.clientId) === resetClientId);
    if (!window.confirm(`¿Borrar TODAS las predicciones y puntos de ${cliente?.nombre || resetClientId}? Esta acción no se puede deshacer.`)) return;
    setResetLoading(true);
    try {
      const r = await API.delete(`/prode/reset-cliente/${resetClientId}`);
      toast.success(`✓ ${r.data.pronosticosEliminados} pronósticos y ${r.data.puntosEliminados} puntos eliminados`);
      setResetClientId('');
      // Refrescar ranking
      const rankRes = await API.get('/prode/ranking');
      setRanking(rankRes.data);
    } catch { toast.error('Error al resetear'); }
    finally { setResetLoading(false); }
  };

  const handleNuclearReset = async () => {
    setNuclearLoading(true);
    try {
      const r = await API.delete('/prode/reset-all');
      toast.success(`💥 Reset completo — ${r.data.pronosticosEliminados} pronósticos y ${r.data.puntosEliminados} puntos eliminados`);
      setConfirmNuclear(false);
      const rankRes = await API.get('/prode/ranking');
      setRanking(rankRes.data);
    } catch { toast.error('Error en reset nuclear'); }
    finally { setNuclearLoading(false); }
  };

  // Agrupar fixture por stage/group
  const fixtureAgrupado = fixture.reduce((acc, m) => {
    const key = m.group || m.stage || 'Fixture';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const statusBadge = (status) => {
    if (status === 'finished') return <span style={{ background: '#166534', color: '#bbf7d0', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Finalizado</span>;
    if (status === 'live')     return <span style={{ background: '#7f1d1d', color: '#fca5a5', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>En vivo</span>;
    return <span style={{ background: '#1e3a5f', color: '#93c5fd', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Programado</span>;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>Cargando prode...</div>;

  return (
    <>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={22} color="var(--gold)" /> Prode Mundial 2026
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleDebugApi} disabled={debugging} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {debugging ? '...' : '🔍 Debug API'}
          </button>
          <button className="btn btn-secondary" onClick={() => setEditConfig(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={15} /> Configurar
          </button>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} className={syncing ? 'spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sync Fixture'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Stats cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Participantes', value: stats.totalParticipantes, icon: Users, color: '#E8B84B' },
              { label: 'Partidos', value: stats.totalPartidos, icon: Calendar, color: '#60a5fa' },
              { label: 'Pronósticos', value: stats.totalPronosticos, icon: Star, color: '#a78bfa' },
              { label: 'Líder', value: stats.lider?.nombre?.split(' ')[0] || '—', icon: Trophy, color: '#34d399' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray)' }}>{label}</span>
                  <Icon size={15} color={color} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Panel debug API — API-Football v3 */}
        {debugResult && (
          <div style={{
            background: debugResult.ok ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${debugResult.ok ? '#34d399' : '#ef4444'}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: debugResult.ok ? '#34d399' : '#ef4444' }}>
                {debugResult.ok ? '✅ API-Football responde' : '❌ Problema detectado'}
              </span>
              <button onClick={() => setDebugResult(null)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {debugResult.problema && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#ef4444', fontWeight: 500 }}>Problema: </span>
                <span style={{ color: 'var(--text)' }}>{debugResult.problema}</span>
              </div>
            )}
            {debugResult.url && (
              <div style={{ marginBottom: 8, color: 'var(--gray)', fontSize: 12 }}>
                URL: <code style={{ color: 'var(--text)' }}>{debugResult.url}</code>
              </div>
            )}
            {debugResult.ok && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <span style={{ color: 'var(--gray)' }}>Partidos encontrados: </span>
                  <span style={{ fontWeight: 600, color: '#34d399' }}>{debugResult.cantidad}</span>
                </div>
                {debugResult.primer_partido && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--gray)', fontSize: 12 }}>Ver primer partido (raw)</summary>
                    <pre style={{ fontSize: 11, color: 'var(--text)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginTop: 8, overflowX: 'auto', maxHeight: 300 }}>
                      {JSON.stringify(debugResult.primer_partido, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
            {debugResult.apiResponse && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--gray)', fontSize: 12 }}>Ver respuesta de error</summary>
                <pre style={{ fontSize: 11, color: '#ef4444', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginTop: 8, overflowX: 'auto' }}>
                  {JSON.stringify(debugResult.apiResponse, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Estado del prode */}
        {config && (
          <div style={{
            background: config.enabled ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${config.enabled ? '#34d399' : '#ef4444'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
          }}>
            <Zap size={16} color={config.enabled ? '#34d399' : '#ef4444'} />
            <span style={{ color: config.enabled ? '#34d399' : '#ef4444', fontWeight: 500 }}>
              Prode {config.enabled ? 'ACTIVO' : 'INACTIVO'}
            </span>
            {config.startDate && config.endDate && (
              <span style={{ color: 'var(--gray)', fontSize: 13 }}>
                · Período compras: {new Date(config.startDate).toLocaleDateString('es-AR')} → {new Date(config.endDate).toLocaleDateString('es-AR')}
              </span>
            )}
            {config.enabled && (
              <span style={{ color: 'var(--gray)', fontSize: 13 }}>
                · {config.pointsWinner} pt ganador · +{config.pointsExact} pts resultado exacto · {config.pointsPerOrder} pt por compra
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[
            { id: 'ranking',       label: '🏆 Ranking'    },
            { id: 'fixture',       label: '📅 Fixture'    },
            { id: 'predicciones',  label: '👁 Predicciones' },
            { id: 'participantes', label: '👥 Participantes' },
            { id: 'bonificaciones',label: '🎁 Bonificaciones' },
            { id: 'terminos',      label: '📋 Términos & Premios' },
            { id: 'testing',       label: '🧪 Testing'    },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--gold)' : 'var(--gray)',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Ranking */}
        {tab === 'ranking' && (
          <div>
            {ranking.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>
                Todavía no hay puntos registrados
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Cliente', 'Pts Prode', 'Pts Compras', 'Total', 'Pedidos'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--gray)', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.clientId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: i === 0 ? '#E8B84B' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : 'var(--gray)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--text)' }}>{r.nombre}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#2d1b69', color: '#a78bfa', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>
                          {r.puntosPronosticos} pts
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#14532d', color: '#86efac', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>
                          {r.puntosCompras} pts
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#713f12', color: '#fde68a', fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
                          {r.totalPuntos} pts
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray)', fontSize: 13 }}>{r.pedidosEnPeriodo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: Fixture */}
        {tab === 'fixture' && (
          <div>
            {fixture.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>
                <p style={{ marginBottom: 12 }}>No hay partidos cargados</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={handleSync}>Sync desde API</button>
                  <button className="btn btn-secondary" onClick={handleSeedMock}>Cargar fixture de prueba</button>
                </div>
              </div>
            ) : (
              <>
                {fixture.some(m => m.apiId?.startsWith('mock-')) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleDeleteMock}
                      style={{ fontSize: 12, color: '#ef4444', borderColor: '#ef444433' }}
                    >
                      🗑 Eliminar partidos de prueba ({fixture.filter(m => m.apiId?.startsWith('mock-')).length})
                    </button>
                  </div>
                )}
                {Object.entries(fixtureAgrupado).map(([grupo, matches]) => (
                  <div key={grupo} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{grupo}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {matches.map(m => (
                        <MatchRow key={m._id} match={m} onSetResultado={handleSetResultado} statusBadge={statusBadge} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* TAB: Participantes */}
        {tab === 'participantes' && (() => {
          const minPedidos = cfgForm.condicionMinPedidos ?? 0;
          const filtered = participantes.filter(p =>
            partFilter === 'ok'  ? p.pedidosEnPeriodo >= minPedidos :
            partFilter === 'nok' ? p.pedidosEnPeriodo <  minPedidos : true
          );
          const totalParts = participantes.length;
          const elegibles  = participantes.filter(p => p.pedidosEnPeriodo >= minPedidos).length;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Condición de premio ────────────────────────────────────── */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏅 Condición para reclamar premio
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 14 }}>
                  Los participantes que no cumplan esta condición quedarán marcados como "No elegibles" aunque tengan puntos.
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>Mínimo</span>
                  <input
                    type="number" min={0} max={99}
                    value={minPedidos}
                    onChange={e => setCfgForm(p => ({ ...p, condicionMinPedidos: Number(e.target.value) }))}
                    style={{ width: 64, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>compra{minPedidos !== 1 ? 's' : ''} durante el Mundial</span>
                  <button className="btn btn-primary" onClick={handleSaveConfig} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                    <CheckCircle size={13} /> Guardar condición
                  </button>
                </div>
              </div>

              {/* ── Stats globales + botón cargar ──────────────────────────── */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {participantes.length === 0 ? (
                  <button className="btn btn-primary" disabled={partsLoading} onClick={loadParticipantes}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> {partsLoading ? 'Cargando...' : 'Cargar participantes'}
                  </button>
                ) : (
                  <>
                    {[
                      { label: 'Total participantes', value: totalParts,              color: '#E8B84B' },
                      { label: 'Elegibles',            value: elegibles,              color: '#34d399' },
                      { label: 'No elegibles',         value: totalParts - elegibles, color: '#f87171' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 110 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                    <button className="btn btn-secondary" onClick={loadParticipantes} disabled={partsLoading}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <RefreshCw size={12} className={partsLoading ? 'spin' : ''} /> Actualizar
                    </button>
                  </>
                )}
              </div>

              {participantes.length > 0 && (
                <>
                  {/* Filtro */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'ok',  label: '✅ Elegibles' },
                      { id: 'nok', label: '❌ No elegibles' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setPartFilter(f.id)}
                        style={{ background: partFilter === f.id ? 'var(--gold)' : 'var(--card)', color: partFilter === f.id ? '#000' : 'var(--gray)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: partFilter === f.id ? 600 : 400 }}>
                        {f.label}
                      </button>
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--gray)', alignSelf: 'center', marginLeft: 6 }}>
                      {filtered.length} de {totalParts}
                    </span>
                  </div>

                  {/* Tabla */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {['#', 'Nombre', 'WhatsApp', 'Puntos', 'Pronósticos', 'Compras', 'Elegible', ''].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--gray)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((p, i) => {
                            const elegible  = p.pedidosEnPeriodo >= minPedidos;
                            const isExpanded = expandedPart === String(p.clientId);
                            const preds     = partPreds[String(p.clientId)];
                            return (
                              <>
                                <tr key={p.clientId}
                                  style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', background: isExpanded ? 'rgba(232,184,75,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', cursor: 'pointer' }}
                                  onClick={() => loadPartPreds(String(p.clientId))}
                                >
                                  <td style={{ padding: '11px 12px', color: 'var(--gray)', fontWeight: 600 }}>
                                    {i + 1 <= 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                                  </td>
                                  <td style={{ padding: '11px 12px', fontWeight: 500 }}>{p.nombre}</td>
                                  <td style={{ padding: '11px 12px', color: 'var(--gray)', fontSize: 12 }}>
                                    {p.whatsapp || '—'}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{p.puntos}</span>
                                    <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 4 }}>
                                      ({p.puntosPronostico}p + {p.puntosCompra}c)
                                    </span>
                                  </td>
                                  <td style={{ padding: '11px 12px', color: 'var(--text)' }}>
                                    <span style={{ fontWeight: 500 }}>{p.pronosticos.total}</span>
                                    <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 4 }}>
                                      ({p.pronosticos.acertados}✓ {p.pronosticos.exactos}⭐)
                                    </span>
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    <span style={{
                                      fontWeight: 700,
                                      color: minPedidos > 0
                                        ? (p.pedidosEnPeriodo >= minPedidos ? '#34d399' : '#f87171')
                                        : 'var(--text)',
                                    }}>
                                      {p.pedidosEnPeriodo}
                                    </span>
                                    {minPedidos > 0 && (
                                      <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 4 }}>
                                        / {minPedidos} min
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '11px 12px' }}>
                                    {minPedidos === 0 ? (
                                      <span style={{ fontSize: 11, color: 'var(--gray)' }}>Sin condición</span>
                                    ) : elegible ? (
                                      <span style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>✅ Elegible</span>
                                    ) : (
                                      <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>❌ No cumple</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                                    <span style={{ color: isExpanded ? 'var(--gold)' : 'var(--gray)', fontSize: 16 }}>
                                      {isExpanded ? '▲' : '▼'}
                                    </span>
                                  </td>
                                </tr>

                                {/* ── Predicciones expandidas ── */}
                                {isExpanded && (
                                  <tr key={`${p.clientId}-preds`} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td colSpan={8} style={{ padding: '0 0 0 24px', background: 'rgba(232,184,75,0.03)' }}>
                                      {preds?.loading ? (
                                        <div style={{ padding: '16px 0', color: 'var(--gray)', fontSize: 13 }}>Cargando predicciones...</div>
                                      ) : preds?.data?.length === 0 ? (
                                        <div style={{ padding: '16px 0', color: 'var(--gray)', fontSize: 13 }}>Sin predicciones registradas.</div>
                                      ) : preds?.data ? (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 4 }}>
                                          <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                              {['Partido', 'Fecha', 'Predicción', 'Marcador exact.', 'Resultado real', 'Estado', 'Pts'].map(h => (
                                                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--gray)', fontWeight: 500, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {preds.data.map(pr => {
                                              const m = pr.matchId;
                                              const winLabel = pr.predictedWinner === 'home' ? m?.homeTeam : pr.predictedWinner === 'away' ? m?.awayTeam : 'Empate';
                                              const real = m?.status === 'finished' && m?.homeScore !== null
                                                ? `${m.homeScore}–${m.awayScore}`
                                                : m?.status === 'live' ? '🔴 En vivo' : 'Pendiente';
                                              const acerto = pr.evaluated && pr.pointsEarned > 0;
                                              const esExacto = pr.evaluated && pr.predictedHome !== null && pr.predictedHome === m?.homeScore && pr.predictedAway === m?.awayScore;
                                              return (
                                                <tr key={pr._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                    {m?.homeTeam} vs {m?.awayTeam}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                                                    {m?.matchDate ? new Date(m.matchDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}
                                                  </td>
                                                  <td style={{ padding: '8px 10px' }}>
                                                    <span style={{ color: pr.predictedWinner === 'home' ? '#93c5fd' : pr.predictedWinner === 'away' ? '#fca5a5' : '#d1d5db', fontWeight: 500 }}>
                                                      {winLabel}
                                                    </span>
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: 'var(--gray)' }}>
                                                    {pr.predictedHome !== null ? `${pr.predictedHome}–${pr.predictedAway}` : '—'}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: 'var(--gray)' }}>{real}</td>
                                                  <td style={{ padding: '8px 10px' }}>
                                                    {!pr.evaluated
                                                      ? <span style={{ color: 'var(--gray)', fontSize: 11 }}>Pendiente</span>
                                                      : esExacto
                                                        ? <span style={{ color: '#a78bfa', fontWeight: 600 }}>⭐ Exacto</span>
                                                        : acerto
                                                          ? <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Acertó</span>
                                                          : <span style={{ color: '#ef4444' }}>✗ Falló</span>
                                                    }
                                                  </td>
                                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: pr.pointsEarned > 0 ? 'var(--gold)' : 'var(--gray)' }}>
                                                    {pr.evaluated ? (pr.pointsEarned > 0 ? `+${pr.pointsEarned}` : '0') : '—'}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      ) : null}
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filtered.length === 0 && (
                      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--gray)' }}>
                        No hay participantes en este filtro.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* TAB: Bonificaciones */}
        {tab === 'bonificaciones' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Bonificaciones de puntos</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 3 }}>
                  Se evalúan automáticamente al confirmar cada pedido durante el período activo del prode.
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddBon(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Nueva
              </button>
            </div>

            {bonificaciones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <Gift size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin bonificaciones configuradas</div>
                <div style={{ fontSize: 13 }}>Agregá condiciones para dar puntos extra a los clientes</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bonificaciones.map((bon, idx) => (
                  <div key={idx} style={{
                    background: 'var(--card)', border: `1px solid ${bon.activa ? 'var(--border)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                    opacity: bon.activa ? 1 : 0.5,
                  }}>
                    <div style={{ fontSize: 22 }}>{TIPO_LABELS[bon.tipo]?.emoji || '🎁'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                        {bon.descripcion || TIPO_LABELS[bon.tipo]?.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                        {bon.tipo === 'gasto_minimo' && `Gastar ≥ ${fmtPeso(bon.montoMinimo)} → +${bon.puntos} pts`}
                        {bon.tipo === 'por_cada_x' && `Cada ${fmtPeso(bon.montoMinimo)} gastado → +${bon.puntos} pts`}
                        {bon.tipo === 'producto' && `Comprar "${bon.productoNombre}" → +${bon.puntos} pts`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: bon.activa ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)',
                        color: bon.activa ? '#34d399' : '#ef4444',
                        fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600
                      }}>
                        {bon.activa ? 'Activa' : 'Inactiva'}
                      </span>
                      <input
                        type="checkbox"
                        checked={bon.activa}
                        onChange={e => handleToggleBon(idx, e.target.checked)}
                        title={bon.activa ? 'Desactivar' : 'Activar'}
                        style={{ cursor: 'pointer' }}
                      />
                      <button onClick={() => handleDeleteBon(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Predicciones */}
        {tab === 'predicciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Selector de partido */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} color="var(--gold)" /> Ver predicciones por partido
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16 }}>
                Seleccioná un partido para ver qué pronosticó cada cliente. Los pronósticos del cliente son datos propios de la plataforma y su consulta es completamente válida.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Partido</label>
                  <select
                    value={predsMatchId}
                    onChange={e => { setPredsMatchId(e.target.value); setPredsData([]); }}
                    style={{ width: '100%' }}
                  >
                    <option value="">— Seleccioná un partido —</option>
                    {fixture.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.homeTeam} vs {m.awayTeam} · {new Date(m.matchDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · {m.status === 'finished' ? (m.homeScore !== null && m.awayScore !== null ? `${m.homeScore}-${m.awayScore}` : 'FIN (sin score)') : m.status === 'live' ? '🔴 EN VIVO' : 'Programado'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={!predsMatchId || predsLoading}
                  onClick={() => loadPrediccionesByMatch(predsMatchId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  <Search size={14} />
                  {predsLoading ? 'Cargando...' : 'Ver predicciones'}
                </button>
              </div>
            </div>

            {/* Resultados */}
            {predsLoading && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                Cargando predicciones...
              </div>
            )}

            {!predsLoading && predsData.length > 0 && (() => {
              const match = fixture.find(m => m._id === predsMatchId);
              const total = predsData.length;
              const homeVotes  = predsData.filter(p => p.predictedWinner === 'home').length;
              const awayVotes  = predsData.filter(p => p.predictedWinner === 'away').length;
              const drawVotes  = predsData.filter(p => p.predictedWinner === 'draw').length;
              const exactos    = predsData.filter(p => p.pointsEarned >= (config?.pointsWinner || 1) + (config?.pointsExact || 5)).length;
              const acertaron  = predsData.filter(p => p.evaluated && p.pointsEarned > 0).length;

              return (
                <>
                  {/* Resumen estadístico */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {[
                      { label: 'Total pronósticos', value: total, color: '#E8B84B' },
                      { label: match?.homeTeam || 'Local',  value: `${homeVotes} (${total ? Math.round(homeVotes/total*100) : 0}%)`, color: '#60a5fa' },
                      { label: 'Empate',             value: `${drawVotes} (${total ? Math.round(drawVotes/total*100) : 0}%)`, color: '#9ca3af' },
                      { label: match?.awayTeam || 'Visitante', value: `${awayVotes} (${total ? Math.round(awayVotes/total*100) : 0}%)`, color: '#f87171' },
                      ...(match?.status === 'finished' ? [
                        { label: 'Acertaron ganador', value: acertaron, color: '#34d399' },
                        { label: 'Exacto',            value: exactos,   color: '#a78bfa' },
                      ] : []),
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tabla */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {match?.homeTeam} vs {match?.awayTeam}
                        {match?.status === 'finished' && (
                          <span style={{ marginLeft: 10, color: 'var(--gold)', fontSize: 13 }}>
                            Resultado: {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} – ${match.awayScore}` : 'Pendiente'}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--gray)' }}>{total} pronósticos</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {['Cliente', 'WhatsApp', 'Pronóstico', 'Marcador exacto', 'Estado', 'Puntos'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--gray)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {predsData.map((p, i) => {
                            const winnerLabel =
                              p.predictedWinner === 'home' ? match?.homeTeam :
                              p.predictedWinner === 'away' ? match?.awayTeam : 'Empate';
                            const acerto = p.evaluated && p.pointsEarned > 0;
                            const esExacto = p.evaluated && p.predictedHome !== null &&
                              p.predictedHome === match?.homeScore && p.predictedAway === match?.awayScore;
                            return (
                              <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                <td style={{ padding: '11px 14px', fontWeight: 500, color: 'var(--text)' }}>
                                  {p.client?.name || <span style={{ color: 'var(--gray)' }}>Desconocido</span>}
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--gray)', fontSize: 12 }}>
                                  {p.client?.whatsapp || p.client?.phone || '—'}
                                </td>
                                <td style={{ padding: '11px 14px' }}>
                                  <span style={{
                                    background: p.predictedWinner === 'home' ? 'rgba(96,165,250,0.12)' : p.predictedWinner === 'away' ? 'rgba(248,113,113,0.12)' : 'rgba(156,163,175,0.12)',
                                    color: p.predictedWinner === 'home' ? '#93c5fd' : p.predictedWinner === 'away' ? '#fca5a5' : '#d1d5db',
                                    fontSize: 12, padding: '3px 10px', borderRadius: 99, fontWeight: 500,
                                  }}>
                                    {winnerLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--gray)', fontSize: 13 }}>
                                  {p.predictedHome !== null ? `${p.predictedHome} – ${p.predictedAway}` : <span style={{ opacity: 0.4 }}>—</span>}
                                </td>
                                <td style={{ padding: '11px 14px' }}>
                                  {!p.evaluated ? (
                                    <span style={{ fontSize: 12, color: 'var(--gray)' }}>Pendiente</span>
                                  ) : esExacto ? (
                                    <span style={{ fontSize: 12, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '3px 10px', borderRadius: 99 }}>⭐ Exacto</span>
                                  ) : acerto ? (
                                    <span style={{ fontSize: 12, background: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '3px 10px', borderRadius: 99 }}>✓ Acertó</span>
                                  ) : (
                                    <span style={{ fontSize: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 10px', borderRadius: 99 }}>✗ Falló</span>
                                  )}
                                </td>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: p.pointsEarned > 0 ? 'var(--gold)' : 'var(--gray)' }}>
                                  {p.evaluated ? `${p.pointsEarned > 0 ? '+' : ''}${p.pointsEarned}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

            {!predsLoading && predsMatchId && predsData.length === 0 && !predsLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <Eye size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600 }}>Sin pronósticos aún</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Ningún cliente ha pronosticado este partido</div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Términos & Premios */}
        {tab === 'terminos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Premios */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏆 Premios
              </h3>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16 }}>
                Estos textos aparecen en la sección "Premios" de las bases y condiciones que ven los clientes.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'prize1', label: '🥇 1° Puesto', placeholder: 'ej: 1 mes de Janz gratis (1 combo doble/semana × 4 semanas) + mini pelota oficial' },
                  { key: 'prize2', label: '🥈 2° Puesto', placeholder: 'ej: Mini pelota oficial + 1 combo doble a elección' },
                  { key: 'prize3', label: '🥉 3° Puesto', placeholder: 'ej: 1 combo doble a elección' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input
                      type="text"
                      value={cfgForm[key] || ''}
                      onChange={e => setCfgForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Términos */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color="var(--gold)" /> Condición de Oro
              </h3>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
                Requisito para ser elegible a los premios (ej: "al menos 3 compras durante el torneo").
              </div>
              <input
                type="text"
                value={cfgForm.condicionOro || ''}
                onChange={e => setCfgForm(p => ({ ...p, condicionOro: e.target.value }))}
                placeholder="ej: haber realizado al menos 3 compras durante el torneo"
                style={{ width: '100%', marginBottom: 20 }}
              />

              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color="var(--gold)" /> Términos personalizados
              </h3>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
                Texto libre que aparece en las bases. Podés usar saltos de línea.
              </div>
              <textarea
                value={cfgForm.termsExtra || ''}
                onChange={e => setCfgForm(p => ({ ...p, termsExtra: e.target.value }))}
                rows={8}
                placeholder="Agregá aclaraciones, reglas extra, datos de contacto, etc..."
                style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveConfig} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={15} /> Guardar términos y premios
              </button>
            </div>
          </div>
        )}

        {/* TAB: Testing */}
        {tab === 'testing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Reset de datos de prueba ─────────────────────────────────── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🧹</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Limpiar datos de prueba</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Por cliente */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8, fontWeight: 500 }}>Borrar predicciones de un cliente específico</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={resetClientId}
                      onChange={e => setResetClientId(e.target.value)}
                      style={{ flex: 1, minWidth: 180 }}
                    >
                      <option value="">— Seleccioná un cliente —</option>
                      {ranking.map(r => (
                        <option key={r.clientId} value={r.clientId}>
                          {r.nombre} — {r.puntos} pts ({r.pronosticos} pronósticos)
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary"
                      disabled={!resetClientId || resetLoading}
                      onClick={handleResetCliente}
                      style={{ whiteSpace: 'nowrap', color: resetClientId ? '#ef4444' : undefined, borderColor: resetClientId ? 'rgba(239,68,68,0.3)' : undefined }}
                    >
                      {resetLoading ? 'Borrando...' : '🗑 Borrar predicciones'}
                    </button>
                  </div>
                  {ranking.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 6, fontStyle: 'italic' }}>No hay participantes aún en el ranking.</div>
                  )}
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Nuclear */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8, fontWeight: 500 }}>Reset nuclear — borrar TODOS los pronósticos y puntos</div>
                  {!confirmNuclear ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmNuclear(true)}
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      💥 Reset completo del prode
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 12, fontWeight: 500 }}>
                        ⚠️ Esto borra <b>todos</b> los pronósticos y puntos del prode (no los partidos ni el fixture). ¿Estás seguro?
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn"
                          disabled={nuclearLoading}
                          onClick={handleNuclearReset}
                          style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          {nuclearLoading ? 'Borrando todo...' : 'Sí, borrar todo'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setConfirmNuclear(false)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banner advertencia */}
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: 2 }}>Modo testing — solo visible en desarrollo</div>
                <div style={{ color: 'var(--gray)' }}>Estas herramientas simulan eventos reales sin afectar pedidos. Desactivadas automáticamente en producción (<code>NODE_ENV=production</code>).</div>
              </div>
            </div>

            {/* 1. Estado del prode */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>📊 Estado del prode</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>Resumen completo: config, fixture, pronósticos, ranking.</div>
                </div>
                <button className="btn btn-secondary"
                  disabled={testLoadingEstado}
                  onClick={async () => {
                    setTestLoadingEstado(true);
                    try {
                      const r = await API.get('/prode-test/estado');
                      setTestEstado(r.data);
                    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
                    finally { setTestLoadingEstado(false); }
                  }}>
                  {testLoadingEstado ? 'Cargando...' : '🔍 Ver estado'}
                </button>
              </div>
              {testEstado && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { label: 'Enabled', val: testEstado.config.enabled ? '✅' : '❌' },
                      { label: 'Partidos', val: testEstado.fixture.total },
                      { label: 'Pronósticos', val: testEstado.pronosticos },
                      { label: 'Participantes', val: testEstado.rankingParticipantes },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{val}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--gray)' }}>
                    {Object.entries(testEstado.fixture.porEstado || {}).map(([k, v]) => (
                      <span key={k} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 10px' }}>
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                  {testEstado.ranking.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 6 }}>Top ranking actual:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {testEstado.ranking.map(r => (
                          <div key={r.pos} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                            <span style={{ color: 'var(--gray)', minWidth: 20 }}>{r.pos}°</span>
                            <span style={{ flex: 1 }}>{r.nombre}</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{r.total} pts</span>
                            <span style={{ color: 'var(--gray)', fontSize: 11 }}>({r.pronos} pronos + {r.compras} compras)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Simular resultado */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>⚽ Simular resultado de partido</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 14 }}>Marca un partido como terminado y evalúa pronósticos automáticamente.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Partido (seleccioná del fixture)</label>
                  <select
                    value={simPartido.matchId}
                    onChange={e => setSimPartido(p => ({ ...p, matchId: e.target.value }))}
                    style={{ width: '100%' }}>
                    <option value="">— Seleccioná un partido —</option>
                    {fixture.filter(m => m.status === 'scheduled').map(m => (
                      <option key={m._id} value={m._id}>
                        {m.homeTeam} vs {m.awayTeam} · {new Date(m.matchDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                      {simPartido.matchId ? fixture.find(m => m._id === simPartido.matchId)?.homeTeam || 'Local' : 'Local'}
                    </label>
                    <input type="number" min={0} max={20} placeholder="0"
                      value={simPartido.homeScore}
                      onChange={e => setSimPartido(p => ({ ...p, homeScore: e.target.value }))}
                      style={{ textAlign: 'center', fontSize: 18 }} />
                  </div>
                  <div style={{ color: 'var(--gray)', fontSize: 20, fontWeight: 700, paddingTop: 22 }}>–</div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                      {simPartido.matchId ? fixture.find(m => m._id === simPartido.matchId)?.awayTeam || 'Visitante' : 'Visitante'}
                    </label>
                    <input type="number" min={0} max={20} placeholder="0"
                      value={simPartido.awayScore}
                      onChange={e => setSimPartido(p => ({ ...p, awayScore: e.target.value }))}
                      style={{ textAlign: 'center', fontSize: 18 }} />
                  </div>
                </div>
              </div>
              <button className="btn btn-primary"
                disabled={simLoading || !simPartido.matchId || simPartido.homeScore === '' || simPartido.awayScore === ''}
                onClick={async () => {
                  setSimLoading(true); setSimResult(null);
                  try {
                    const r = await API.post('/prode-test/simular-resultado', {
                      matchId: simPartido.matchId,
                      homeScore: Number(simPartido.homeScore),
                      awayScore: Number(simPartido.awayScore),
                    });
                    setSimResult(r.data);
                    load();
                    toast.success('Resultado simulado y pronósticos evaluados');
                  } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
                  finally { setSimLoading(false); }
                }}>
                {simLoading ? 'Simulando...' : '▶ Simular resultado'}
              </button>
              {simResult && (
                <div style={{ marginTop: 14, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: 14, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#34d399', marginBottom: 8 }}>✅ {simResult.partido}</div>
                  <div style={{ color: 'var(--gray)', marginBottom: 8 }}>
                    Pronósticos evaluados: <b style={{ color: 'var(--text)' }}>{simResult.pronosticosEvaluados}</b> ·
                    Acertaron: <b style={{ color: '#34d399' }}>{simResult.acertaron}</b>
                  </div>
                  {simResult.detalle?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {simResult.detalle.map((d, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 8px', background: 'var(--bg)', borderRadius: 5 }}>
                          <span style={{ color: d.puntos > 0 ? '#34d399' : '#ef4444', fontWeight: 700, minWidth: 50 }}>
                            {d.puntos > 0 ? `+${d.puntos} pts` : '0 pts'}
                          </span>
                          <span style={{ color: 'var(--gray)' }}>{d.predictedWinner} {d.predictedScore ? `· ${d.predictedScore}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setSimPartido({ matchId: '', homeScore: '', awayScore: '' }); setSimResult(null); }}
                    style={{ marginTop: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--gray)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                    Nueva simulación
                  </button>
                </div>
              )}
            </div>

            {/* 3. Simular compra */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🍔 Simular puntos por compra</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 14 }}>Asigna puntos de compra a un cliente usando el mismo sistema que las órdenes reales (incluye bonificaciones).</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Cliente (del ranking)</label>
                  <select
                    value={simCompra.clientId}
                    onChange={e => setSimCompra(p => ({ ...p, clientId: e.target.value }))}
                    style={{ width: '100%' }}>
                    <option value="">— Seleccioná cliente —</option>
                    {ranking.map(r => (
                      <option key={r.clientId} value={r.clientId}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Total del pedido ($)</label>
                  <input type="number" min={0} placeholder="5000"
                    value={simCompra.total}
                    onChange={e => setSimCompra(p => ({ ...p, total: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary"
                disabled={simCompraLoading || !simCompra.clientId || !simCompra.total}
                onClick={async () => {
                  setSimCompraLoading(true); setSimCompraResult(null);
                  try {
                    const r = await API.post('/prode-test/simular-compra', {
                      clientId: simCompra.clientId,
                      total: Number(simCompra.total),
                    });
                    setSimCompraResult(r.data);
                    load();
                    toast.success(`+${r.data.puntosAsignados} puntos asignados`);
                  } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
                  finally { setSimCompraLoading(false); }
                }}>
                {simCompraLoading ? 'Simulando...' : '▶ Simular compra'}
              </button>
              {simCompraResult && (
                <div style={{ marginTop: 14, background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 8, padding: 14, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 6 }}>+{simCompraResult.puntosAsignados} pts asignados</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {simCompraResult.detalles?.map((d, i) => (
                      <div key={i} style={{ color: 'var(--gray)', fontSize: 12 }}>· {d}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Herramientas de limpieza */}
            <div style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#ef4444' }}>🗑 Resetear datos de testing</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 14 }}>Para volver a testear desde cero.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                  disabled={cleanLoading}
                  onClick={async () => {
                    if (!window.confirm('¿Borrar TODOS los puntos y resetear pronósticos evaluados?')) return;
                    setCleanLoading(true); setCleanResult(null);
                    try {
                      const r = await API.delete('/prode-test/limpiar-puntos');
                      setCleanResult(r.data);
                      load();
                      toast.success('Datos de testing limpiados');
                    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
                    finally { setCleanLoading(false); }
                  }}>
                  Limpiar todos los puntos
                </button>
                <button className="btn btn-secondary"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                  disabled={cleanLoading || !simPartido.matchId}
                  onClick={async () => {
                    if (!simPartido.matchId) { toast.error('Seleccioná un partido arriba'); return; }
                    if (!window.confirm('¿Resetear este partido a scheduled?')) return;
                    setCleanLoading(true);
                    try {
                      await API.post('/prode-test/resetear-partido', { matchId: simPartido.matchId });
                      setSimResult(null);
                      load();
                      toast.success('Partido reseteado a scheduled');
                    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
                    finally { setCleanLoading(false); }
                  }}>
                  Resetear partido seleccionado
                </button>
              </div>
              {cleanResult && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gray)' }}>
                  Puntos eliminados: <b style={{ color: 'var(--text)' }}>{cleanResult.puntosEliminados}</b> ·
                  Pronósticos reseteados: <b style={{ color: 'var(--text)' }}>{cleanResult.pronosticosReseteados}</b>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Modal: Nueva bonificación */}
      {showAddBon && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: 20, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={18} color="var(--gold)" /> Nueva bonificación
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Tipo de bonificación</label>
                <select value={bonForm.tipo} onChange={e => setBonForm(p => ({ ...p, tipo: e.target.value, productoId: '', productoNombre: '' }))} style={{ width: '100%' }}>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label} — {v.desc}</option>
                  ))}
                </select>
              </div>

              {(bonForm.tipo === 'gasto_minimo' || bonForm.tipo === 'por_cada_x') && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                    {bonForm.tipo === 'gasto_minimo' ? 'Monto mínimo ($)' : 'Cada cuántos pesos ($)'}
                  </label>
                  <input type="number" min={1} value={bonForm.montoMinimo}
                    onChange={e => setBonForm(p => ({ ...p, montoMinimo: e.target.value }))}
                    placeholder={bonForm.tipo === 'gasto_minimo' ? 'ej: 5000' : 'ej: 1000'} />
                </div>
              )}

              {bonForm.tipo === 'producto' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Producto</label>
                  <select value={bonForm.productoId}
                    onChange={e => {
                      const p = products.find(p => p._id === e.target.value);
                      setBonForm(prev => ({ ...prev, productoId: e.target.value, productoNombre: p?.name || '' }));
                    }}
                    style={{ width: '100%' }}>
                    <option value="">— Seleccioná un producto —</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} {p.variant}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Puntos a otorgar</label>
                <input type="number" min={1} value={bonForm.puntos}
                  onChange={e => setBonForm(p => ({ ...p, puntos: Number(e.target.value) }))} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Descripción (opcional)</label>
                <input type="text" value={bonForm.descripcion}
                  onChange={e => setBonForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="ej: Bonus por gastar más de $5000" />
              </div>

            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
              <button className="btn btn-secondary" onClick={() => setShowAddBon(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddBonificacion}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal configuración */}
      {editConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Configuración del Prode</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <input type="checkbox" checked={cfgForm.enabled || false}
                  onChange={e => setCfgForm(p => ({ ...p, enabled: e.target.checked }))} />
                Prode habilitado
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Fecha inicio (compras)</label>
                  <input type="date" value={cfgForm.startDate ? cfgForm.startDate.split('T')[0] : ''}
                    onChange={e => setCfgForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Fecha fin (compras)</label>
                  <input type="date" value={cfgForm.endDate ? cfgForm.endDate.split('T')[0] : ''}
                    onChange={e => setCfgForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Pts por ganador</label>
                  <input type="number" min={1} value={cfgForm.pointsWinner || 1}
                    onChange={e => setCfgForm(p => ({ ...p, pointsWinner: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Pts extra exacto</label>
                  <input type="number" min={0} value={cfgForm.pointsExact || 5}
                    onChange={e => setCfgForm(p => ({ ...p, pointsExact: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Pts por compra</label>
                  <input type="number" min={1} value={cfgForm.pointsPerOrder || 1}
                    onChange={e => setCfgForm(p => ({ ...p, pointsPerOrder: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Bloqueo pronósticos (minutos antes del partido)</label>
                <input type="number" min={0} value={cfgForm.cutoffMinutes || 30}
                  onChange={e => setCfgForm(p => ({ ...p, cutoffMinutes: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setEditConfig(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveConfig}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente fila de partido ────────────────────────────────────────────────
function MatchRow({ match, onSetResultado, statusBadge }) {
  const [editScore, setEditScore] = useState(false);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const d = new Date(match.matchDate);
  const dateStr = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const handleGuardar = () => {
    const h = home !== '' ? Number(home) : 0;
    const a = away !== '' ? Number(away) : 0;
    onSetResultado(match._id, h, a);
    setEditScore(false);
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--gray)', minWidth: 64, flexShrink: 0, lineHeight: 1.4 }}>{dateStr}<br/>{timeStr}</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
          <span style={{ fontWeight: 500, color: 'var(--text)', textAlign: 'right', flex: 1, fontSize: 13 }}>{match.homeTeam}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: match.status === 'finished' ? 'var(--gold)' : 'var(--gray)', minWidth: 44, textAlign: 'center', flexShrink: 0 }}>
            {match.status === 'finished'
              ? (match.homeScore !== null && match.awayScore !== null
                  ? `${match.homeScore}–${match.awayScore}`
                  : '— FIN —')
              : match.status === 'live'
                ? '🔴'
                : 'vs'}
          </span>
          <span style={{ fontWeight: 500, color: 'var(--text)', flex: 1, fontSize: 13 }}>{match.awayTeam}</span>
        </div>
        <div style={{ flexShrink: 0 }}>{statusBadge(match.status)}</div>
      </div>
      {match.status === 'scheduled' && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {editScore ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--gray)' }}>Resultado:</span>
              <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
                style={{ width: 52, padding: '5px 6px', fontSize: 14, textAlign: 'center' }} placeholder="0" />
              <span style={{ color: 'var(--gray)', fontWeight: 700 }}>–</span>
              <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
                style={{ width: 52, padding: '5px 6px', fontSize: 14, textAlign: 'center' }} placeholder="0" />
              <button onClick={handleGuardar} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> Guardar
              </button>
              <button onClick={() => setEditScore(false)} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setEditScore(true)} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
              + Cargar resultado
            </button>
          )}
        </div>
      )}
    </div>
  );
}