import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { Users, TrendingDown, Activity, ShoppingBag, Zap, RefreshCw } from 'lucide-react';
import API from '../utils/api';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const TABS = [
  { id: 'rfm',      label: 'Segmentación RFM',   icon: Users },
  { id: 'churn',    label: 'Riesgo de Churn',     icon: TrendingDown },
  { id: 'demand',   label: 'Predicción demanda',  icon: Activity },
  { id: 'crosssell',label: 'Cross-sell',          icon: ShoppingBag },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--gold)', fontWeight: 600 }}>
          {p.name === 'revenue' || p.name === 'avgRevenue' ? fmt(p.value) : p.value}
          {p.name === 'orders' || p.name === 'avgOrders' ? ' pedidos' : ''}
        </div>
      ))}
    </div>
  );
};

// ── RFM Tab ───────────────────────────────────────────────────────────────────
function RFMTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeg, setSelectedSeg] = useState('all');

  useEffect(() => {
    API.get('/analytics/rfm').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data) return null;

  const filtered = selectedSeg === 'all' ? data.clients : data.clients.filter(c => c.segment.label === selectedSeg);

  return (
    <div className="animate-fade">
      {/* Segment overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {data.segments.map(seg => (
          <button
            key={seg.label}
            onClick={() => setSelectedSeg(selectedSeg === seg.label ? 'all' : seg.label)}
            style={{
              background: selectedSeg === seg.label ? `${seg.color}18` : 'var(--card)',
              border: `1px solid ${selectedSeg === seg.label ? seg.color + '60' : 'var(--border)'}`,
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{seg.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: seg.color }}>{seg.label}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--white)', marginTop: 2 }}>{seg.count}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 2 }}>{fmt(seg.revenue)}</div>
          </button>
        ))}
      </div>

      {/* Clients table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Segmento</th>
              <th>R score</th>
              <th>F score</th>
              <th>M score</th>
              <th>Días sin pedir</th>
              <th>Pedidos</th>
              <th>Total gastado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 40).map(c => (
              <tr key={c._id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600,
                    background: `${c.segment.color}18`, color: c.segment.color,
                    border: `1px solid ${c.segment.color}40`
                  }}>
                    {c.segment.emoji} {c.segment.label}
                  </span>
                </td>
                <td><ScoreBar value={c.rScore} /></td>
                <td><ScoreBar value={c.fScore} /></td>
                <td><ScoreBar value={c.mScore} /></td>
                <td style={{ color: c.recencyDays > 30 ? 'var(--red)' : c.recencyDays > 14 ? 'var(--yellow)' : 'var(--green)' }}>
                  {c.recencyDays}d
                </td>
                <td>{c.frequency}</td>
                <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(c.monetary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBar({ value }) {
  const colors = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#E8B84B'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i <= value ? colors[value] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{value}</span>
    </div>
  );
}

// ── Churn Tab ─────────────────────────────────────────────────────────────────
function ChurnTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics/churn').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data) return null;

  const riskColors = { alto: '#ef4444', medio: '#f59e0b', bajo: '#eab308' };

  return (
    <div className="animate-fade">
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'En riesgo total', value: data.summary.total, color: 'var(--red)', icon: '⚠️' },
          { label: 'Riesgo alto (+45d)', value: data.summary.high, color: '#ef4444', icon: '🔴' },
          { label: 'Riesgo medio (30-45d)', value: data.summary.medium, color: '#f59e0b', icon: '🟡' },
          { label: 'Riesgo bajo (21-30d)', value: data.summary.low, color: '#eab308', icon: '🟠' },
          { label: 'Revenue en riesgo', value: fmt(data.summary.totalRevenueAtRisk), color: 'var(--gold)', icon: '💰' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div style={{ fontSize: '1.3rem', marginBottom: 8 }}>{item.icon}</div>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value" style={{ color: item.color, fontSize: '1.5rem' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Clients at risk */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Nivel de riesgo</th>
              <th>Sin pedir hace</th>
              <th>Pedidos hist.</th>
              <th>Total hist.</th>
              <th>Último pedido</th>
              <th>WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {data.atRisk.map(c => (
              <tr key={c.clientId}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, background: `${riskColors[c.riskLevel]}18`, color: riskColors[c.riskLevel], border: `1px solid ${riskColors[c.riskLevel]}40` }}>
                    {c.riskLevel.toUpperCase()}
                  </span>
                </td>
                <td style={{ color: riskColors[c.riskLevel], fontWeight: 600 }}>{c.daysSinceLastOrder}d</td>
                <td>{c.totalOrders}</td>
                <td style={{ color: 'var(--gold)' }}>{fmt(c.totalSpent)}</td>
                <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{new Date(c.lastOrder).toLocaleDateString('es-AR')}</td>
                <td>
                  {c.whatsapp ? (
                    <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent('¡Hola ' + c.name + '! Hace un tiempo que no te vemos por aquí 🍔 ¿Qué te parece si pedís hoy? Tenemos novedades para vos.')}`}
                      target="_blank" rel="noreferrer"
                      style={{ color: '#22c55e', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      📱 Contactar
                    </a>
                  ) : <span style={{ color: 'var(--gray)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Demand Tab ────────────────────────────────────────────────────────────────
function DemandTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics/demand').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data) return null;

  return (
    <div className="animate-fade">
      <div style={{ background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: '0.82rem', color: 'var(--gold)' }}>
        📊 Basado en las últimas 8 semanas de órdenes reales — sin inventar datos
      </div>

      {/* Próximos 7 días */}
      <div className="section-header"><div className="section-title">Próximos 7 días — predicción de demanda</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
        {data.next7.map((day, i) => (
          <div key={i} style={{
            background: day.isToday ? 'rgba(232,184,75,0.1)' : 'var(--card)',
            border: `1px solid ${day.isToday ? 'rgba(232,184,75,0.4)' : 'var(--border)'}`,
            borderRadius: 12, padding: 14, textAlign: 'center', transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginBottom: 4 }}>{day.date}</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: day.isToday ? 'var(--gold)' : 'var(--white)', lineHeight: 1 }}>{day.avgOrders}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray)', margin: '4px 0' }}>pedidos est.</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>{fmt(day.avgRevenue)}</div>
            {day.topItems.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {day.topItems.slice(0, 2).map((item, j) => (
                  <div key={j} style={{ fontSize: '0.65rem', color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart por día de semana */}
      <div className="section-header"><div className="section-title">Promedio histórico por día de semana</div></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.byDow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--gray)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--gray)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgRevenue" name="revenue" radius={[6,6,0,0]}>
              {data.byDow.map((_, i) => (
                <Cell key={i} fill={i === new Date().getDay() ? '#E8B84B' : 'rgba(232,184,75,0.3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Cross-sell Tab ────────────────────────────────────────────────────────────
function CrossSellTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics/crosssell').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data) return null;

  const maxCount = data.pairs[0]?.count || 1;

  return (
    <div className="animate-fade">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {/* Pares más pedidos juntos */}
        <div>
          <div className="section-header"><div className="section-title">Combos más frecuentes</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.pairs.slice(0, 10).map((pair, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pair.a} <span style={{ color: 'var(--gold)' }}>+</span> {pair.b}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>{pair.support}% órdenes</span>
                    <span style={{ background: 'rgba(232,184,75,0.15)', color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>×{pair.count}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(pair.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top productos */}
        <div>
          <div className="section-header"><div className="section-title">Productos más vendidos</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.topProducts.map((p, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--gold)', marginRight: 8, fontFamily: 'Bebas Neue' }}>#{i + 1}</span>
                    {p.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{p.share}% de órdenes</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${p.share}%`, background: i === 0 ? 'linear-gradient(90deg, #c49b35, #E8B84B)' : 'rgba(232,184,75,0.4)' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#a5b4fc' }}>
            💡 <strong>Tip:</strong> En la página pública de pedidos, mostrá sugerencias de combo basadas en los pares más frecuentes para aumentar el ticket promedio.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics ────────────────────────────────────────────────────────────
export default function Analytics() {
  const [activeTab, setActiveTab] = useState('rfm');
  const [smartAlerts, setSmartAlerts] = useState(null);

  useEffect(() => {
    API.get('/analytics/alerts').then(r => setSmartAlerts(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>🧠 Inteligencia</h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Análisis predictivo basado en tus datos reales</div>
      </div>
      <div className="page-body">

        {/* Smart alerts */}
        {smartAlerts?.alerts?.length > 0 && (
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {smartAlerts.alerts.map((alert, i) => (
              <div key={i} className={`alert alert-${alert.level === 'danger' ? 'error' : alert.level === 'success' ? 'success' : 'warning'}`}>
                <Zap size={14} style={{ flexShrink: 0 }} />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Tab bar - responsive */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 24 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px',
                  borderRadius: 10, border: `1px solid ${active ? 'rgba(232,184,75,0.4)' : 'var(--border)'}`,
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: active ? 'rgba(232,184,75,0.10)' : 'var(--card)',
                  color: active ? 'var(--gold)' : 'var(--gray-light)',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'rfm'       && <RFMTab />}
        {activeTab === 'churn'     && <ChurnTab />}
        {activeTab === 'demand'    && <DemandTab />}
        {activeTab === 'crosssell' && <CrossSellTab />}
      </div>
    </>
  );
}
