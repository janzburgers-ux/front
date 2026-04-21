import { useState, useEffect } from 'react';
import { Star, Gift, TrendingUp, Users, Award, ChevronRight } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmt  = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const fmtN = n => Number(n || 0).toLocaleString('es-AR');

function StatCard({ label, value, sub, icon, color = 'var(--gold)' }) {
  return (
    <div className="stat-card">
      <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {label}
      </div>
      <div className="stat-value" style={{ fontSize: '1.6rem', color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function Loyalty() {
  const [clients, setClients] = useState([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [awardModal, setAwardModal] = useState(null);
  const [awardPoints, setAwardPoints] = useState('');
  const [filter, setFilter] = useState('all'); // all | near | ready
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/clients'),
      API.get('/config')
    ]).then(([clientsRes, cfgRes]) => {
      setClients(clientsRes.data);
      setLoyaltyConfig(cfgRes.data?.loyalty);
    }).finally(() => setLoading(false));
  }, []);

  const threshold   = loyaltyConfig?.redeemThreshold || 500;
  const pointsRatio = loyaltyConfig?.pointsPerPeso || 1;

  // Clientes con puntos (cualquier cantidad)
  const withPoints = clients.filter(c => (c.loyaltyPoints || 0) > 0);

  // Filtros
  const filtered = clients.filter(c => {
    const pts = c.loyaltyPoints || 0;
    if (filter === 'near')  return pts >= threshold * 0.7 && pts < threshold;
    if (filter === 'ready') return pts >= threshold;
    return pts > 0;
  }).sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));

  // Stats generales
  const totalPoints  = clients.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
  const readyCount   = clients.filter(c => (c.loyaltyPoints || 0) >= threshold).length;
  const nearCount    = clients.filter(c => { const p = c.loyaltyPoints || 0; return p >= threshold * 0.7 && p < threshold; }).length;

  const handleAward = async () => {
    if (!awardPoints || Number(awardPoints) <= 0) { toast.error('Ingresá una cantidad válida'); return; }
    try {
      await API.post('/coupons/loyalty/award', { clientId: awardModal._id, points: Number(awardPoints) });
      toast.success(`${awardPoints} puntos acreditados a ${awardModal.name}`);
      // Refrescar clientes
      const res = await API.get('/clients');
      setClients(res.data);
      setAwardModal(null);
      setAwardPoints('');
    } catch { toast.error('Error al acreditar puntos'); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  );

  return (
    <>
      <div className="page-header">
        <h1><Star size={22} style={{ display: 'inline', marginRight: 10 }} color="var(--gold)" />Fidelización</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/gestion/configuracion')}>
          ⚙️ Configurar
        </button>
      </div>

      <div className="page-body">

        {/* Estado del sistema */}
        {loyaltyConfig && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            background: loyaltyConfig.enabled ? 'rgba(232,184,75,0.06)' : 'var(--card)',
            border: `1px solid ${loyaltyConfig.enabled ? 'rgba(232,184,75,0.3)' : 'var(--border)'}`,
            borderRadius: 12, marginBottom: 24
          }}>
            <span style={{ fontSize: '1.8rem' }}>{loyaltyConfig.enabled ? '🟢' : '⚪'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {loyaltyConfig.enabled ? 'Sistema de puntos activo' : 'Sistema de puntos inactivo'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                {loyaltyConfig.enabled
                  ? `1 punto cada $${fmtN(pointsRatio)} gastados · Cupón al llegar a ${fmtN(threshold)} pts · ${loyaltyConfig.couponPercent}% de descuento`
                  : 'Activalo desde Configuración → Fidelización'}
              </div>
            </div>
            {!loyaltyConfig.enabled && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/gestion/configuracion')}>
                Activar <ChevronRight size={14}/>
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <StatCard
            label="Clientes con puntos"
            value={withPoints.length}
            icon={<Users size={14}/>}
            sub={`de ${clients.length} clientes totales`}
          />
          <StatCard
            label="Puntos acumulados"
            value={fmtN(totalPoints)}
            icon={<TrendingUp size={14}/>}
            sub="en todos los clientes"
          />
          <StatCard
            label="Listos para canjear"
            value={readyCount}
            icon={<Award size={14}/>}
            color={readyCount > 0 ? '#22c55e' : 'var(--gold)'}
            sub={readyCount > 0 ? '¡Tienen cupón disponible!' : 'Nadie llegó al umbral aún'}
          />
          <StatCard
            label="Cerca del umbral"
            value={nearCount}
            icon={<Gift size={14}/>}
            color={nearCount > 0 ? '#f59e0b' : 'var(--gold)'}
            sub={`≥ ${Math.round(threshold * 0.7)} puntos`}
          />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'all',   label: `Todos con puntos (${withPoints.length})` },
            { key: 'near',  label: `Cerca del umbral (${nearCount})` },
            { key: 'ready', label: `Listos para canjear (${readyCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de clientes */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
              {filter === 'ready' ? '🏆' : filter === 'near' ? '⭐' : '🎯'}
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', marginBottom: 6 }}>
              {filter === 'ready' ? 'Nadie listo para canjear aún'
               : filter === 'near' ? 'Nadie cerca del umbral todavía'
               : loyaltyConfig?.enabled ? 'Sin clientes con puntos aún'
               : 'Activá el sistema de puntos para empezar'}
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              {!loyaltyConfig?.enabled && 'Los puntos se acumulan automáticamente con cada entrega'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((client, idx) => {
              const pts  = client.loyaltyPoints || 0;
              const pct  = Math.min(100, Math.round((pts / threshold) * 100));
              const ready = pts >= threshold;
              const near  = pts >= threshold * 0.7;
              const barColor = ready ? '#22c55e' : near ? '#f59e0b' : 'var(--gold)';

              return (
                <div key={client._id} style={{
                  background: 'var(--card)',
                  border: `1px solid ${ready ? 'rgba(34,197,94,0.3)' : near ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '16px 20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    {/* Info cliente */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: ready ? 'rgba(34,197,94,0.15)' : 'rgba(232,184,75,0.1)',
                        border: `2px solid ${ready ? '#22c55e' : 'var(--gold)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Bebas Neue', fontSize: '1rem',
                        color: ready ? '#22c55e' : 'var(--gold)'
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {client.name}
                          {ready && <span style={{ fontSize: '0.68rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '1px 7px', borderRadius: 100, fontWeight: 700 }}>🎉 Listo para canjear</span>}
                          {!ready && near && <span style={{ fontSize: '0.68rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 7px', borderRadius: 100, fontWeight: 700 }}>⭐ Cerca</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 1 }}>
                          {client.totalOrders} pedidos · {fmt(client.totalSpent)} gastados
                          {client.whatsapp && <span style={{ marginLeft: 8 }}>· {client.whatsapp}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Puntos y acción */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: barColor, lineHeight: 1 }}>
                          {fmtN(pts)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>
                          {ready ? `${fmtN(pts - threshold)} excedentes` : `falta: ${fmtN(threshold - pts)}`}
                        </div>
                      </div>
                      <button onClick={() => { setAwardModal(client); setAwardPoints(''); }}
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap' }}>
                        <Gift size={13}/> Acreditar
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div style={{ height: 6, background: 'var(--dark)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--gray)' }}>
                    <span>0 pts</span>
                    <span style={{ color: barColor, fontWeight: 600 }}>{pct}%</span>
                    <span>Umbral: {fmtN(threshold)} pts</span>
                  </div>

                  {/* Info extra si tiene puntos totales históricos */}
                  {client.totalPointsEarned > pts && (
                    <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)' }}>
                      Total histórico: {fmtN(client.totalPointsEarned)} pts · Ya canjeó {fmtN(client.totalPointsEarned - pts)} pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal acreditar puntos */}
      {awardModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAwardModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2><Gift size={18} style={{ display: 'inline', marginRight: 8 }}/>Acreditar puntos</h2>
              <button className="btn-icon" onClick={() => setAwardModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--dark)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ fontWeight: 700 }}>{awardModal.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 2 }}>
                  Puntos actuales: <strong style={{ color: 'var(--gold)' }}>{fmtN(awardModal.loyaltyPoints || 0)}</strong>
                  {' '}· Umbral: <strong>{fmtN(threshold)}</strong>
                </div>
                {/* Barra */}
                <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, ((awardModal.loyaltyPoints || 0) / threshold) * 100)}%`, background: 'var(--gold)', borderRadius: 2 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Puntos a acreditar</label>
                <input type="number" value={awardPoints} onChange={e => setAwardPoints(e.target.value)}
                  placeholder="ej: 50" min={1} autoFocus />
                {awardPoints > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 4 }}>
                    Quedará con <strong style={{ color: 'var(--gold)' }}>
                      {fmtN((awardModal.loyaltyPoints || 0) + Number(awardPoints))}
                    </strong> puntos
                    {((awardModal.loyaltyPoints || 0) + Number(awardPoints)) >= threshold && (
                      <span style={{ color: '#22c55e', marginLeft: 6 }}>🎉 ¡Listo para canjear!</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAwardModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAward} disabled={!awardPoints || Number(awardPoints) <= 0}>
                Acreditar puntos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}