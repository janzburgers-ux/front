import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Clock, Trophy, DollarSign, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import API from '../utils/api';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const PIE_COLORS = { efectivo: '#E8B84B', transferencia: '#818cf8' };

function TrendBadge({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700,
      color: up ? '#22c55e' : '#ef4444', background: up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      padding: '2px 8px', borderRadius: 100, marginLeft: 8 }}>
      {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
      {up ? '+' : ''}{value}% vs mes ant.
    </span>
  );
}

function StatCard({ label, value, trend, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: '1.5rem', color: color || 'inherit' }}>{value}</div>
      {trend !== undefined && <TrendBadge value={trend} />}
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--gray)', marginBottom: 4 }}>Día {label}</div>
      <div style={{ color: '#E8B84B', fontWeight: 700 }}>{fmt(payload[0]?.value)}</div>
      {payload[1] && <div style={{ color: '#aaa' }}>{payload[1]?.value} pedidos</div>}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    API.get('/dashboard').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSalesLoading(true);
    API.get(`/dashboard/sales?month=${month}&year=${year}`)
      .then(r => setSales(r.data))
      .finally(() => setSalesLoading(false));
  }, [month, year]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const res = await API.get(`/dashboard/report?month=${month}&year=${year}`);
      const d = res.data;
      const fmt = n => `$${Number(n||0).toLocaleString('es-AR')}`;
      const monthName = d.period.monthName;

      const rows = (obj, label) => Object.entries(obj).map(([k,v]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${k}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right"><strong>${fmt(v)}</strong></td></tr>`
      ).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reporte ${monthName} ${year}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#222;margin:0;padding:24px;font-size:13px}
        h1{color:#c49b35;margin-bottom:4px}
        h2{color:#444;font-size:15px;margin:20px 0 8px;border-bottom:2px solid #c49b35;padding-bottom:4px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
        .card{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:14px}
        .card-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em}
        .card-value{font-size:1.6rem;font-weight:700;color:#c49b35;margin-top:4px}
        table{width:100%;border-collapse:collapse}
        th{background:#f0f0f0;padding:8px 12px;text-align:left;font-size:12px;color:#555}
        td{font-size:12px}
        .net{font-size:1.2rem;color:${d.summary.netProfit >= 0 ? '#22c55e' : '#ef4444'}}
        @media print{body{padding:12px}}
      </style></head><body>
      <h1>📊 Reporte mensual — ${monthName} ${year}</h1>
      <p style="color:#888;margin-bottom:20px">Generado el ${new Date().toLocaleDateString('es-AR')}</p>

      <h2>Resumen general</h2>
      <div class="grid">
        <div class="card"><div class="card-label">Pedidos del mes</div><div class="card-value">${d.summary.totalOrders}</div></div>
        <div class="card"><div class="card-label">Cancelados</div><div class="card-value" style="color:#ef4444">${d.summary.cancelledOrders}</div></div>
        <div class="card"><div class="card-label">Ingresos brutos</div><div class="card-value">${fmt(d.summary.totalRevenue)}</div></div>
        <div class="card"><div class="card-label">Ticket promedio</div><div class="card-value">${fmt(d.summary.avgTicket)}</div></div>
        <div class="card"><div class="card-label">Descuentos cupones</div><div class="card-value" style="color:#f59e0b">-${fmt(d.summary.totalCouponDiscount)}</div></div>
        <div class="card"><div class="card-label">Costo productos</div><div class="card-value" style="color:#ef4444">-${fmt(d.summary.productsCost)}</div></div>
        <div class="card"><div class="card-label">Gastos fijos</div><div class="card-value" style="color:#ef4444">-${fmt(d.summary.totalFixed)}</div></div>
        <div class="card"><div class="card-label">Ganancia neta</div><div class="card-value net">${fmt(d.summary.netProfit)}</div></div>
      </div>

      <h2>Ventas por día</h2>
      <table><thead><tr><th>Día</th><th>Pedidos</th><th>Ingresos</th></tr></thead><tbody>
        ${Object.entries(d.salesByDay).sort((a,b)=>Number(a[0])-Number(b[0])).map(([day,v]) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${day}/${month}/${year}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${v.orders}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(v.revenue)}</td></tr>`
        ).join('')}
      </tbody></table>

      <h2>Top productos</h2>
      <table><thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>
        ${d.topProducts.map(p => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${p.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${p.units}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(p.revenue)}</td></tr>`).join('')}
      </tbody></table>

      <h2>Métodos de pago</h2>
      <table><thead><tr><th>Método</th><th>Pedidos</th><th>Total</th></tr></thead><tbody>
        <tr><td style="padding:6px 12px;border-bottom:1px solid #eee">💵 Efectivo</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${d.paymentMethods.efectivo.count}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(d.paymentMethods.efectivo.total)}</td></tr>
        <tr><td style="padding:6px 12px;border-bottom:1px solid #eee">🏦 Transferencia</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${d.paymentMethods.transferencia.count}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(d.paymentMethods.transferencia.total)}</td></tr>
      </tbody></table>

      <h2>Top clientes</h2>
      <table><thead><tr><th>Cliente</th><th>Pedidos</th><th>Total gastado</th></tr></thead><tbody>
        ${d.topClients.map((c,i) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">#${i+1} ${c.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${c.orders}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(c.spent)}</td></tr>`).join('')}
      </tbody></table>

      ${d.summary.totalFixed > 0 ? `
      <h2>Gastos fijos del mes</h2>
      <table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead><tbody>${rows(d.fixedExpenses)}</tbody></table>` : ''}

      ${d.userDistribution?.length > 0 ? `
      <h2>Distribución de ganancias</h2>
      <table><thead><tr><th>Persona</th><th>%</th><th>Monto</th></tr></thead><tbody>
        ${d.userDistribution.map(u => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${u.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${u.percent}%</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${fmt(u.amount)}</td></tr>`).join('')}
      </tbody></table>` : ''}

      <p style="margin-top:32px;color:#aaa;font-size:11px;text-align:center">Reporte generado por Janz Burgers — Sistema de Gestión</p>
      </body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.print();
    } catch (e) {
      console.error(e);
      alert('Error al generar el reporte');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>;

  return (
    <>
      <div className="page-header"><h1>Dashboard</h1></div>
      <div className="page-body">

        {/* Stats rápidas de hoy / semana */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <StatCard label="Pedidos Hoy" value={stats?.today?.orders || 0} />
          <StatCard label="Ingresos Hoy" value={fmt(stats?.today?.revenue)} />
          <StatCard label="Pedidos Semana" value={stats?.week?.orders || 0} />
          <StatCard label="Ingresos Semana" value={fmt(stats?.week?.revenue)} />
        </div>

        {/* Selector de mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--gold)', minWidth: 200, textAlign: 'center' }}>
            {months[month - 1]} {year}
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronRight size={20}/></button>
        </div>
        <button onClick={exportPDF} disabled={exporting} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileDown size={15} /> {exporting ? 'Generando...' : 'Exportar PDF'}
        </button>

        {salesLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
        ) : sales && (
          <>
            {/* Stats del mes con tendencias */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <StatCard label="Pedidos del Mes" value={sales.orders} trend={sales.revenueTrend !== undefined ? null : undefined}
                sub={`Mes anterior: ${sales.prevMonth?.orders || 0}`} />
              <StatCard label="Ingresos del Mes" value={fmt(sales.totalRevenue)} trend={sales.revenueTrend}
                color="var(--gold)" />
              <StatCard label="Ticket Promedio" value={fmt(sales.avgTicket)} />
              <StatCard label="Tiempo Prom. Entrega"
                value={sales.avgDeliveryTime ? `${sales.avgDeliveryTime} min` : '—'}
                sub={sales.avgDeliveryTime > 30 ? '⚠️ Por encima del objetivo (30 min)' : sales.avgDeliveryTime ? '✅ Dentro del objetivo' : 'Sin datos'}
                color={sales.avgDeliveryTime > 30 ? '#f59e0b' : sales.avgDeliveryTime ? '#22c55e' : undefined}
              />
            </div>

            {/* Gráfico de ventas por día */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={16} color="var(--gold)" /> Ventas por día
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sales.salesByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false}
                    interval={sales.salesByDay.length > 20 ? 2 : 0} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={42} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="revenue" fill="#E8B84B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Métodos de pago + Top productos */}
            <div className="dashboard-grid-2" style={{ marginBottom: 20 }}>

              {/* Pie chart métodos de pago */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16 }}>💳 Métodos de pago</div>
                {sales.paymentMethods?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={sales.paymentMethods} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                          {sales.paymentMethods.map((entry, i) => (
                            <Cell key={i} fill={PIE_COLORS[entry.name] || '#64748b'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} labelFormatter={l => l === 'efectivo' ? 'Efectivo' : 'Transferencia'} />
                        <Legend formatter={l => l === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'} />
                      </PieChart>
                    </ResponsiveContainer>
                    {sales.paymentMethods.map(p => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 6 }}>
                        <span style={{ color: PIE_COLORS[p.name] || '#aaa' }}>
                          {p.name === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
                          <span style={{ color: 'var(--gray)', marginLeft: 6 }}>({p.count} pedidos)</span>
                        </span>
                        <strong>{fmt(p.value)}</strong>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Sin datos</div>
                )}
              </div>

              {/* Top 5 productos */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16 }}>🏆 Top productos</div>
                {sales.top5?.length > 0 ? sales.top5.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: i === 0 ? '#E8B84B' : i === 1 ? '#aaa' : '#888', minWidth: 20 }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)' }}>{p.units} uds</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{fmt(p.revenue)}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Sin datos</div>
                )}
              </div>
            </div>

            {/* Ranking clientes + Distribución ganancias */}
            <div className="dashboard-grid-2" style={{ marginBottom: 20 }}>

              {/* Clientes estrella */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={16} color="var(--gold)" /> Clientes estrella
                </div>
                {sales.topClients?.length > 0 ? sales.topClients.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '8px 0', borderBottom: i < sales.topClients.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'rgba(232,184,75,0.2)' : 'var(--dark)', border: `1px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--gray)' }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{c.orders} pedidos este mes</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.875rem' }}>{fmt(c.spent)}</div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Sin datos</div>
                )}
              </div>

              {/* Distribución de ganancias */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  💰 Distribución de ganancias
                </div>
                {/* Desglose ganancia neta */}
                {sales.netProfit !== undefined && (
                  <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--gray)' }}>Ingresos brutos</span>
                      <span style={{ color: 'var(--white)' }}>{fmt(sales.grossRevenue || sales.totalRevenue)}</span>
                    </div>
                    {sales.totalCouponDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--gray)' }}>− Descuentos cupones <span style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>({sales.ordersWithCoupon} pedidos)</span></span>
                        <span style={{ color: '#f59e0b' }}>−{fmt(sales.totalCouponDiscount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--gray)' }}>− Costo productos</span>
                      <span style={{ color: '#ef4444' }}>−{fmt(sales.productsCost)}</span>
                    </div>
                    {sales.fixedTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--gray)' }}>− Gastos fijos</span>
                        <span style={{ color: '#ef4444' }}>−{fmt(sales.fixedTotal)}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span style={{ color: 'var(--gold)' }}>Ganancia neta</span>
                      <span style={{ color: 'var(--gold)' }}>{fmt(sales.netProfit)}</span>
                    </div>
                  </div>
                )}
                {sales.profitDistribution?.length > 0 ? (
                  <>
                    {sales.profitDistribution.map((p, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(p.amount)}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--dark)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.percent}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>{p.percent}% de la ganancia neta</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>
                    Configurá los % en <strong>Usuarios</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Métricas de tiempos (si hay datos) */}
            {sales.deliveryTimes?.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--gold)" /> Tiempos de entrega del mes
                </div>
                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>PROMEDIO</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: sales.avgDeliveryTime > 30 ? '#f59e0b' : '#22c55e' }}>
                      {sales.avgDeliveryTime} min
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>MÍNIMO</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#22c55e' }}>
                      {Math.min(...sales.deliveryTimes.map(t => t.minutes))} min
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>MÁXIMO</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#ef4444' }}>
                      {Math.max(...sales.deliveryTimes.map(t => t.minutes))} min
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>PEDIDOS</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem' }}>{sales.deliveryTimes.length}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--dark)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (30 / (sales.avgDeliveryTime || 30)) * 100)}%`,
                    background: sales.avgDeliveryTime <= 30 ? '#22c55e' : '#f59e0b', borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>
                  <span>0 min</span><span>Objetivo: 30 min</span>
                </div>
              </div>
            )}

            {/* Pedidos pendientes */}
            {stats?.pending?.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16 }}>⏳ Pedidos activos</div>
                {stats.pending.map(o => (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ color: 'var(--gold)', fontWeight: 700, marginRight: 10 }}>{o.orderNumber}</span>
                      <span style={{ fontSize: '0.85rem' }}>{o.client?.name}</span>
                    </div>
                    <span className={`badge badge-${o.status}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}