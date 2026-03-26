import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Settings, CheckCircle, Calendar, Users, Star, Zap, Plus, Trash2, Gift } from 'lucide-react';
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
  const [syncing, setSyncing] = useState(false);
  const [editConfig, setEditConfig] = useState(false);
  const [cfgForm, setCfgForm] = useState({});
  const [bonificaciones, setBonificaciones] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddBon, setShowAddBon] = useState(false);
  const [bonForm, setBonForm] = useState({ tipo: 'gasto_minimo', descripcion: '', montoMinimo: '', puntos: 1, productoId: '', productoNombre: '' });

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await API.post('/prode/fixture/sync');
      toast.success(`${r.data.synced} partidos sincronizados`);
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
        <div style={{ display: 'flex', gap: 8 }}>
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
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {[
            { id: 'ranking', label: 'Ranking' },
            { id: 'fixture', label: 'Fixture' },
            { id: 'bonificaciones', label: '🎁 Bonificaciones' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--gold)' : 'var(--gray)',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1,
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
              Object.entries(fixtureAgrupado).map(([grupo, matches]) => (
                <div key={grupo} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{grupo}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {matches.map(m => (
                      <MatchRow key={m._id} match={m} onSetResultado={handleSetResultado} statusBadge={statusBadge} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw' }}>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Configuración del Prode</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <input type="checkbox" checked={cfgForm.enabled || false}
                  onChange={e => setCfgForm(p => ({ ...p, enabled: e.target.checked }))} />
                Prode habilitado
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 12, color: 'var(--gray)', minWidth: 70 }}>{dateStr} {timeStr}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 500, color: 'var(--text)', textAlign: 'right', flex: 1 }}>{match.homeTeam}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: match.status === 'finished' ? 'var(--gold)' : 'var(--gray)', minWidth: 40, textAlign: 'center' }}>
          {match.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
        </span>
        <span style={{ fontWeight: 500, color: 'var(--text)', flex: 1 }}>{match.awayTeam}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {statusBadge(match.status)}
        {match.status === 'scheduled' && (
          editScore ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
                style={{ width: 46, padding: '4px 6px', fontSize: 13, textAlign: 'center' }} placeholder="0" />
              <span style={{ color: 'var(--gray)' }}>-</span>
              <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
                style={{ width: 46, padding: '4px 6px', fontSize: 13, textAlign: 'center' }} placeholder="0" />
              <button onClick={handleGuardar} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                <CheckCircle size={13} />
              </button>
              <button onClick={() => setEditScore(false)} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setEditScore(true)} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              Cargar resultado
            </button>
          )
        )}
      </div>
    </div>
  );
}
