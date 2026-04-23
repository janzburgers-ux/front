import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Clock, Trophy, DollarSign, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import API from '../utils/api';
import logoJanz from '../assets/LogoNegro.png';

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
      // Convertir logo a base64 para incrustarlo en el HTML generado.
      // fetch() sobre la URL del asset funciona tanto en dev como en producción
      // (Vite/CRA resuelven logoJanz a la URL final con hash de contenido).
      // El base64 garantiza que el logo aparece al imprimir o guardar como PDF
      // sin depender de ninguna URL externa ni ruta relativa.
      const logoBase64 = await fetch(logoJanz)
        .then(r => r.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      const res = await API.get(`/dashboard/report?month=${month}&year=${year}`);
      const d = res.data;
      const fmt  = n => `$${Number(n||0).toLocaleString('es-AR')}`;
      const pct  = (num, den) => den > 0 ? `${((num/den)*100).toFixed(1)}%` : '—';
      const monthName = d.period.monthName;

      // ── Cálculos financieros ──────────────────────────────────────────────
      const foodCostReal    = d.summary.productsCost > 0;
      const foodCost        = foodCostReal ? d.summary.productsCost : Math.round(d.summary.totalRevenue * 0.40);
      const foodCostPct     = d.summary.totalRevenue > 0 ? ((foodCost / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const margenBruto     = d.summary.totalRevenue - foodCost - d.summary.totalCouponDiscount;
      const margenBrutoPct  = d.summary.totalRevenue > 0 ? ((margenBruto / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const margenNeto      = d.summary.netProfit;
      const margenNetoPct   = d.summary.totalRevenue > 0 ? ((margenNeto / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const descuentoPct    = d.summary.totalRevenue > 0 ? ((d.summary.totalCouponDiscount / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const rentabilidad    = margenNetoPct >= 20 ? 'ALTO' : margenNetoPct >= 10 ? 'MEDIO' : 'BAJO';
      const rentColor       = rentabilidad === 'ALTO' ? '#22c55e' : rentabilidad === 'MEDIO' ? '#f59e0b' : '#ef4444';

      // ── Días fuertes/débiles ──────────────────────────────────────────────
      const diasArr = Object.entries(d.salesByDay).sort((a,b) => Number(a[0])-Number(b[0]));
      const mejorDia = [...diasArr].sort((a,b) => b[1].revenue - a[1].revenue)[0];
      const peorDia  = [...diasArr].sort((a,b) => a[1].revenue - b[1].revenue)[0];

      // ── Concentración de clientes ─────────────────────────────────────────
      const top3Gasto = d.topClients.slice(0,3).reduce((s,c) => s + c.spent, 0);
      const concPct   = d.summary.totalRevenue > 0 ? ((top3Gasto / d.summary.totalRevenue)*100).toFixed(1) : 0;
      const concAlerta = Number(concPct) > 50;

      // ── Ingeniería de menú ────────────────────────────────────────────────
      const totalUnits   = d.topProducts.reduce((s,p) => s + p.units, 0);
      const avgUnits     = totalUnits / (d.topProducts.length || 1);
      const avgRevUnit   = d.topProducts.length > 0 ? d.topProducts.reduce((s,p) => s + (p.revenue/p.units), 0) / d.topProducts.length : 0;
      const menuRows = d.topProducts.map(p => {
        const precioUn = p.units > 0 ? p.revenue / p.units : 0;
        const altaVenta  = p.units >= avgUnits;
        const altoMargen = precioUn >= avgRevUnit;
        let cat, catColor, accion;
        if (altaVenta && altoMargen)  { cat = '⭐ Estrella';           catColor = '#22c55e'; accion = 'Mantener y destacar en el menú'; }
        else if (altaVenta)            { cat = '🐎 Caballo de batalla'; catColor = '#f59e0b'; accion = 'Subir precio gradualmente o reducir costo'; }
        else if (altoMargen)           { cat = '🧩 Puzzle';             catColor = '#6366f1'; accion = 'Promocionar activamente'; }
        else                           { cat = '🐶 Perro';              catColor = '#ef4444'; accion = 'Evaluar eliminación o reformulación'; }
        return `<tr>
          <td style="padding:7px 12px;border-bottom:1px solid #eee">${p.name}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center">${p.units}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee">${fmt(Math.round(precioUn))}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee">${fmt(p.revenue)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee"><span style="background:${catColor}22;color:${catColor};padding:2px 8px;border-radius:99px;font-weight:700;font-size:11px">${cat}</span></td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee;color:#555">${accion}</td>
        </tr>`;
      }).join('');

      // ── Problemas detectados ──────────────────────────────────────────────
      const problemas = [];
      if (d.summary.totalOrders < 20) problemas.push({ nivel: 'CRÍTICO', color: '#ef4444', titulo: 'Volumen de pedidos bajo', desc: `Solo ${d.summary.totalOrders} pedidos en el mes. Por debajo de 20 pedidos el negocio no cubre costos fijos de forma estable.` });
      if (Number(concPct) > 60) problemas.push({ nivel: 'CRÍTICO', color: '#ef4444', titulo: 'Alta concentración de clientes', desc: `Los 3 principales clientes generan el ${concPct}% de los ingresos. Perder uno impacta gravemente la caja.` });
      if (Number(descuentoPct) > 15) problemas.push({ nivel: 'MEDIO', color: '#f59e0b', titulo: 'Descuentos elevados', desc: `Los cupones representan el ${descuentoPct}% de las ventas brutas, erosionando el margen.` });
      if (!foodCostReal) problemas.push({ nivel: 'MEDIO', color: '#f59e0b', titulo: 'Sin food cost real registrado', desc: 'Los costos de productos no están cargados en el sistema. El margen neto es una estimación, no un dato real.' });
      if (d.summary.cancelledOrders > d.summary.totalOrders * 0.1) problemas.push({ nivel: 'MEDIO', color: '#f59e0b', titulo: 'Tasa de cancelación alta', desc: `${d.summary.cancelledOrders} cancelaciones sobre ${d.summary.totalOrders + d.summary.cancelledOrders} pedidos totales (${((d.summary.cancelledOrders/(d.summary.totalOrders+d.summary.cancelledOrders))*100).toFixed(1)}%).` });
      if (d.summary.totalFixed === 0) problemas.push({ nivel: 'BAJO', color: '#6366f1', titulo: 'Gastos fijos no registrados', desc: 'Sin gastos fijos cargados la ganancia neta está sobreestimada. Cargar alquiler, servicios y sueldos.' });
      if (problemas.length === 0) problemas.push({ nivel: 'BAJO', color: '#22c55e', titulo: 'Sin problemas críticos detectados', desc: 'Los indicadores del mes están dentro de rangos saludables.' });

      const problemasHTML = problemas.map(p => `
        <div style="background:${p.color}11;border-left:4px solid ${p.color};padding:12px 16px;margin:8px 0;border-radius:0 8px 8px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="background:${p.color};color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;text-transform:uppercase">${p.nivel}</span>
            <strong style="font-size:13px">${p.titulo}</strong>
          </div>
          <div style="font-size:12px;color:#555;line-height:1.5">${p.desc}</div>
        </div>`).join('');

      // ── HTML del reporte ──────────────────────────────────────────────────
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reporte ${monthName} ${year} — Janz Burgers</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;margin:0;padding:32px;font-size:13px;background:#fafafa}
        .cover{text-align:center;padding:32px 0 28px;border-bottom:3px solid #c49b35;margin-bottom:28px}
        .cover h1{font-size:1.8rem;color:#c49b35;margin:8px 0 4px}
        .cover .sub{color:#999;font-size:0.82rem}
        .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .kpi{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:14px;text-align:center}
        .kpi-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px}
        .kpi-value{font-size:1.4rem;font-weight:800;color:#c49b35}
        .kpi-value.red{color:#ef4444}.kpi-value.green{color:#22c55e}.kpi-value.blue{color:#6366f1}
        .section{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:22px;margin-bottom:18px}
        h2{color:#c49b35;border-bottom:2px solid #c49b35;padding-bottom:6px;margin:0 0 14px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em}
        h3{color:#444;margin:14px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em}
        p{margin:5px 0;line-height:1.6;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#f5f5f5;padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em}
        td{padding:7px 12px;border-bottom:1px solid #eee}
        tr:last-child td{border-bottom:none}
        .row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .plan-col{background:#f9f9f9;border-radius:8px;padding:14px}
        .plan-col h3{margin-top:0}
        .plan-col li{font-size:12px;line-height:1.7;color:#444}
        .footer{text-align:center;color:#bbb;font-size:10px;margin-top:28px;padding-top:14px;border-top:1px solid #eee}
        @media print{body{padding:14px;background:#fff}.kpis{grid-template-columns:repeat(4,1fr)}.section{break-inside:avoid;margin-bottom:12px}}
      </style></head><body>

      <!-- Portada -->
      <div class="cover">
        <img src="${logoBase64}" alt="Janz Burgers" style="height:72px;width:auto;object-fit:contain;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto" />
        <h1>Reporte Mensual — ${monthName} ${year}</h1>
        <div class="sub">Janz Burgers · Generado el ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <!-- KPIs ejecutivos -->
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Pedidos entregados</div><div class="kpi-value">${d.summary.totalOrders}</div></div>
        <div class="kpi"><div class="kpi-label">Ingresos brutos</div><div class="kpi-value">${fmt(d.summary.totalRevenue)}</div></div>
        <div class="kpi"><div class="kpi-label">Ticket promedio</div><div class="kpi-value">${fmt(d.summary.avgTicket)}</div></div>
        <div class="kpi"><div class="kpi-label">Ganancia neta</div><div class="kpi-value ${margenNeto >= 0 ? 'green' : 'red'}">${fmt(margenNeto)}</div></div>
        <div class="kpi"><div class="kpi-label">Food cost</div><div class="kpi-value red">${foodCostPct}%${!foodCostReal?' *':''}</div></div>
        <div class="kpi"><div class="kpi-label">Margen bruto</div><div class="kpi-value ${Number(margenBrutoPct)>40?'green':Number(margenBrutoPct)>25?'':'red'}">${margenBrutoPct}%</div></div>
        <div class="kpi"><div class="kpi-label">Margen neto</div><div class="kpi-value ${Number(margenNetoPct)>15?'green':Number(margenNetoPct)>5?'':'red'}">${margenNetoPct}%</div></div>
        <div class="kpi"><div class="kpi-label">Rentabilidad</div><div class="kpi-value" style="color:${rentColor}">${rentabilidad}</div></div>
      </div>
      ${!foodCostReal ? '<p style="font-size:11px;color:#999;margin:-16px 0 20px">* Food cost estimado al 40% (no hay costos reales cargados en el sistema)</p>' : ''}

      <!-- 1. Validación de datos -->
      <div class="section">
        <h2>1. Validación de datos</h2>
        ${!foodCostReal ? '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px 14px;margin:0 0 8px;border-radius:0 6px 6px 0;font-size:12px">⚠️ <strong>Food cost no registrado.</strong> El costo de productos es $0 en el sistema. Se usó estimación del 40%. Los márgenes son aproximados.</div>' : ''}
        ${d.summary.totalFixed === 0 ? '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px 14px;margin:0 0 8px;border-radius:0 6px 6px 0;font-size:12px">⚠️ <strong>Gastos fijos en $0.</strong> Sin datos de alquiler, servicios ni sueldos, la ganancia neta está sobreestimada.</div>' : ''}
        ${d.summary.totalOrders === 0 ? '<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:10px 14px;margin:0 0 8px;border-radius:0 6px 6px 0;font-size:12px">🚨 <strong>Sin pedidos en el período.</strong> No hay datos suficientes para análisis.</div>' : ''}
        ${d.summary.totalOrders > 0 && d.summary.totalOrders < 10 ? '<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:10px 14px;margin:0 0 8px;border-radius:0 6px 6px 0;font-size:12px">🚨 <strong>Muestra muy pequeña (${d.summary.totalOrders} pedidos).</strong> Las métricas no son estadísticamente representativas.</div>' : ''}
        <div style="background:#dcfce7;border-left:4px solid #22c55e;padding:10px 14px;margin:0 0 8px;border-radius:0 6px 6px 0;font-size:12px">✅ Datos disponibles: pedidos, ingresos, productos, clientes, métodos de pago${d.summary.totalFixed > 0 ? ', gastos fijos' : ''}.</div>
        <p style="margin-top:10px;color:#666">Métricas no disponibles para análisis preciso: costo real por producto, frecuencia de compra histórica por cliente, ventas por franja horaria, CAC (costo de adquisición de clientes).</p>
      </div>

      <!-- 2. Análisis financiero -->
      <div class="section">
        <h2>2. Análisis financiero real</h2>
        <div class="row2">
          <div>
            <table>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">Ingresos brutos</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${fmt(d.summary.totalRevenue)}</td></tr>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">− Descuentos/cupones</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;color:#ef4444">−${fmt(d.summary.totalCouponDiscount)}</td></tr>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">− Food cost${!foodCostReal?' (est.)':''}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;color:#ef4444">−${fmt(foodCost)}</td></tr>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;font-weight:700">= Margen bruto</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${Number(margenBrutoPct)>35?'#22c55e':'#ef4444'}">${fmt(margenBruto)} (${margenBrutoPct}%)</td></tr>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">− Gastos fijos</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;color:#ef4444">−${fmt(d.summary.totalFixed)}</td></tr>
              <tr><td style="padding:7px 12px;font-weight:700;font-size:14px">= Ganancia neta</td><td style="padding:7px 12px;text-align:right;font-weight:800;font-size:14px;color:${margenNeto>=0?'#22c55e':'#ef4444'}">${fmt(margenNeto)} (${margenNetoPct}%)</td></tr>
            </table>
          </div>
          <div>
            <div style="background:#f9f9f9;border-radius:8px;padding:14px;height:100%">
              <p><strong>Rentabilidad del mes:</strong> <span style="color:${rentColor};font-weight:800">${rentabilidad}</span></p>
              <p><strong>Food cost:</strong> ${foodCostPct}% ${Number(foodCostPct) <= 35 ? '✅ Dentro del rango ideal (30-40%)' : Number(foodCostPct) <= 45 ? '⚠️ Aceptable pero elevado' : '🚨 Por encima del rango saludable'}</p>
              <p><strong>Descuentos:</strong> ${descuentoPct}% sobre ventas ${Number(descuentoPct) <= 10 ? '✅ Controlado' : Number(descuentoPct) <= 15 ? '⚠️ Moderado' : '🚨 Alto impacto en margen'}</p>
              <p style="margin-top:10px;font-size:11px;color:#999">Referencia hamburguesería: food cost ideal 30-40%, margen neto saludable 15-25%.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Ingeniería de menú -->
      <div class="section">
        <h2>3. Ingeniería de menú</h2>
        <p style="font-size:11px;color:#999;margin-bottom:10px">Clasificación basada en volumen de ventas y precio unitario promedio relativo al resto del menú.</p>
        <table>
          <thead><tr><th>Producto</th><th>Unidades</th><th>Precio prom.</th><th>Ingresos</th><th>Clasificación</th><th>Acción</th></tr></thead>
          <tbody>${menuRows}</tbody>
        </table>
        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;font-size:11px">
          <span style="background:#22c55e22;color:#22c55e;padding:2px 10px;border-radius:99px;font-weight:700">⭐ Estrella = alto margen + alta venta</span>
          <span style="background:#f59e0b22;color:#f59e0b;padding:2px 10px;border-radius:99px;font-weight:700">🐎 Caballo = alta venta + bajo margen</span>
          <span style="background:#6366f122;color:#6366f1;padding:2px 10px;border-radius:99px;font-weight:700">🧩 Puzzle = alto margen + baja venta</span>
          <span style="background:#ef444422;color:#ef4444;padding:2px 10px;border-radius:99px;font-weight:700">🐶 Perro = bajo margen + baja venta</span>
        </div>
      </div>

      <!-- 4. Análisis de ventas -->
      <div class="section">
        <h2>4. Análisis de ventas</h2>
        <div class="row2" style="margin-bottom:14px">
          <div style="background:#f9f9f9;border-radius:8px;padding:14px">
            <h3 style="margin-top:0;color:#22c55e">📈 Mejor día</h3>
            ${mejorDia ? `<p><strong>Día ${mejorDia[0]}/${month}</strong> — ${mejorDia[1].orders} pedidos — ${fmt(mejorDia[1].revenue)}</p>` : '<p>Sin datos</p>'}
          </div>
          <div style="background:#f9f9f9;border-radius:8px;padding:14px">
            <h3 style="margin-top:0;color:#ef4444">📉 Día más flojo</h3>
            ${peorDia ? `<p><strong>Día ${peorDia[0]}/${month}</strong> — ${peorDia[1].orders} pedidos — ${fmt(peorDia[1].revenue)}</p>` : '<p>Sin datos</p>'}
          </div>
        </div>
        <table>
          <thead><tr><th>Día</th><th>Pedidos</th><th>Ingresos</th><th>Ticket prom.</th></tr></thead>
          <tbody>
            ${diasArr.map(([day,v]) => `<tr><td>${day}/${month}/${year}</td><td>${v.orders}</td><td>${fmt(v.revenue)}</td><td>${v.orders > 0 ? fmt(Math.round(v.revenue/v.orders)) : '—'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- 5. Análisis de clientes -->
      <div class="section">
        <h2>5. Análisis de clientes</h2>
        ${concAlerta ? `<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:10px 14px;margin:0 0 12px;border-radius:0 6px 6px 0;font-size:12px">🚨 <strong>Alta concentración:</strong> los 3 principales clientes generan el ${concPct}% de los ingresos. Riesgo de dependencia.</div>` : `<div style="background:#dcfce7;border-left:4px solid #22c55e;padding:10px 14px;margin:0 0 12px;border-radius:0 6px 6px 0;font-size:12px">✅ Concentración de clientes en ${concPct}%. Distribución razonable.</div>`}
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Total gastado</th><th>% ingresos</th><th>Ticket prom.</th></tr></thead>
          <tbody>
            ${d.topClients.map((c,i) => `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.orders}</td><td>${fmt(c.spent)}</td><td>${pct(c.spent, d.summary.totalRevenue)}</td><td>${c.orders > 0 ? fmt(Math.round(c.spent/c.orders)) : '—'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- 6. Análisis de descuentos -->
      <div class="section">
        <h2>6. Análisis de descuentos</h2>
        <div class="row2">
          <div>
            <table>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">Total descuentos</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;color:#ef4444;font-weight:700">−${fmt(d.summary.totalCouponDiscount)}</td></tr>
              <tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">% sobre ventas brutas</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${descuentoPct}%</td></tr>
              <tr><td style="padding:7px 12px;color:#666">Impacto en margen</td><td style="padding:7px 12px;text-align:right;color:#ef4444;font-weight:700">${Number(descuentoPct) > 10 ? 'Alto' : Number(descuentoPct) > 5 ? 'Moderado' : 'Bajo'}</td></tr>
            </table>
          </div>
          <div style="background:#f9f9f9;border-radius:8px;padding:14px;font-size:12px">
            <strong>Estrategia recomendada:</strong>
            <ul style="margin:8px 0 0;padding-left:16px;line-height:1.8;color:#444">
              ${Number(descuentoPct) > 15 ? '<li>Reducir descuento directo — reemplazar por combos con margen mayor</li><li>Limitar cupones a clientes nuevos únicamente</li>' : '<li>Nivel de descuentos controlado</li>'}
              <li>Upselling: agregar papas o bebida al pedido (+margen)</li>
              <li>Programa de referidos con recompensa diferida (ya implementado)</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 7. Problemas principales -->
      <div class="section">
        <h2>7. Problemas principales</h2>
        ${problemasHTML}
      </div>

      <!-- 8. Plan de acción -->
      <div class="section">
        <h2>8. Plan de acción</h2>
        <div class="row3">
          <div class="plan-col">
            <h3 style="color:#ef4444">⚡ Corto plazo (1-2 semanas)</h3>
            <ul>
              ${!foodCostReal ? '<li>Cargar costos reales de cada producto en el sistema</li>' : ''}
              ${d.summary.totalFixed === 0 ? '<li>Registrar gastos fijos del mes (alquiler, servicios)</li>' : ''}
              <li>Analizar y promocionar los productos tipo 🧩 Puzzle</li>
              <li>Revisar productos 🐶 Perro para reformular o quitar</li>
              ${Number(descuentoPct) > 15 ? '<li>Auditar cupones activos y reducir descuentos directos</li>' : ''}
            </ul>
          </div>
          <div class="plan-col">
            <h3 style="color:#f59e0b">🔧 Mediano plazo (1-2 meses)</h3>
            <ul>
              ${concAlerta ? '<li>Campaña de captación de clientes nuevos para reducir concentración</li>' : ''}
              <li>Activar difusión por WhatsApp para días flojos</li>
              <li>Implementar combo con papas + bebida para subir ticket promedio</li>
              <li>Revisar precios de productos ⭐ Estrella (margen de suba)</li>
            </ul>
          </div>
          <div class="plan-col">
            <h3 style="color:#22c55e">🚀 Largo plazo</h3>
            <ul>
              <li>Migrar a API oficial de WhatsApp Business</li>
              <li>Medir frecuencia de compra por cliente (retención)</li>
              <li>Expandir sistema de referidos a más clientes estrella</li>
              <li>Dashboard con alertas automáticas de rentabilidad</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tablas de soporte -->
      <div class="section">
        <h2>Métodos de pago</h2>
        <table>
          <thead><tr><th>Método</th><th>Pedidos</th><th>Total</th><th>%</th></tr></thead>
          <tbody>
            <tr><td>💵 Efectivo</td><td>${d.paymentMethods.efectivo.count}</td><td>${fmt(d.paymentMethods.efectivo.total)}</td><td>${pct(d.paymentMethods.efectivo.total, d.summary.totalRevenue)}</td></tr>
            <tr><td>🏦 Transferencia</td><td>${d.paymentMethods.transferencia.count}</td><td>${fmt(d.paymentMethods.transferencia.total)}</td><td>${pct(d.paymentMethods.transferencia.total, d.summary.totalRevenue)}</td></tr>
          </tbody>
        </table>
      </div>

      ${d.summary.totalFixed > 0 ? `
      <div class="section">
        <h2>Gastos fijos del mes</h2>
        <table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>${Object.entries(d.fixedExpenses).map(([k,v]) => `<tr><td>${k}</td><td style="text-align:right;font-weight:700">${fmt(v)}</td></tr>`).join('')}</tbody>
        </table>
        <div style="text-align:right;margin-top:10px;font-weight:700;color:#ef4444;font-size:13px">Total: ${fmt(d.summary.totalFixed)}</div>
      </div>` : ''}

      ${d.userDistribution?.length > 0 ? `
      <div class="section">
        <h2>Distribución de ganancias</h2>
        <table><thead><tr><th>Persona</th><th>%</th><th>Monto</th></tr></thead>
        <tbody>${d.userDistribution.map(u => `<tr><td>${u.name}</td><td>${u.percent}%</td><td style="font-weight:700;color:#22c55e">${fmt(u.amount)}</td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}

      <div class="footer">Reporte generado por Janz Burgers — Sistema de Gestión</div>
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