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
      const fmtN = n => `$${Number(n||0).toLocaleString('es-AR')}`;
      const pct  = (num, den) => den > 0 ? `${((num/den)*100).toFixed(1)}%` : '—';
      const monthName = d.period.monthName;

      // ── Cálculos financieros ──────────────────────────────────────────────
      const foodCostReal    = d.summary.productsCost > 0;
      const foodCost        = foodCostReal ? d.summary.productsCost : Math.round(d.summary.totalRevenue * 0.40);
      const foodCostPct     = d.summary.totalRevenue > 0 ? ((foodCost / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const ingresosNetos   = d.summary.totalRevenue - d.summary.totalCouponDiscount;
      const margenBruto     = ingresosNetos - foodCost;
      const margenBrutoPct  = ingresosNetos > 0 ? ((margenBruto / ingresosNetos) * 100).toFixed(1) : 0;
      const margenNeto      = d.summary.netProfit;
      const margenNetoPct   = ingresosNetos > 0 ? ((margenNeto / ingresosNetos) * 100).toFixed(1) : 0;
      const descuentoPct    = d.summary.totalRevenue > 0 ? ((d.summary.totalCouponDiscount / d.summary.totalRevenue) * 100).toFixed(1) : 0;
      const rentabilidad    = Number(margenNetoPct) >= 20 ? 'ALTO' : Number(margenNetoPct) >= 10 ? 'MEDIO' : 'BAJO';
      const rentColor       = rentabilidad === 'ALTO' ? '#22c55e' : rentabilidad === 'MEDIO' ? '#f59e0b' : '#ef4444';

      // ── Días fuertes/débiles ──────────────────────────────────────────────
      const diasArr = Object.entries(d.salesByDay).sort((a,b) => Number(a[0])-Number(b[0]));
      const mejorDia = [...diasArr].sort((a,b) => b[1].revenue - a[1].revenue)[0];
      const peorDia  = [...diasArr].filter(([,v]) => v.orders > 0).sort((a,b) => a[1].revenue - b[1].revenue)[0];
      const diasConVentas = diasArr.filter(([,v]) => v.orders > 0).length;

      // ── Concentración de clientes ─────────────────────────────────────────
      const top3Gasto  = d.topClients.slice(0,3).reduce((s,c) => s + c.spent, 0);
      const top5Gasto  = d.topClients.slice(0,5).reduce((s,c) => s + c.spent, 0);
      const concPct    = d.summary.totalRevenue > 0 ? ((top3Gasto / d.summary.totalRevenue)*100).toFixed(1) : 0;
      const conc5Pct   = d.summary.totalRevenue > 0 ? ((top5Gasto / d.summary.totalRevenue)*100).toFixed(1) : 0;
      const concAlerta = Number(concPct) > 50;

      // ── Ingeniería de menú ────────────────────────────────────────────────
      const totalUnits = d.topProducts.reduce((s,p) => s + p.units, 0);
      const avgUnits   = totalUnits / (d.topProducts.length || 1);
      const avgRevUnit = d.topProducts.length > 0 ? d.topProducts.reduce((s,p) => s + (p.revenue / (p.units||1)), 0) / d.topProducts.length : 0;
      const menuRows   = d.topProducts.map(p => {
        const precioUn   = p.units > 0 ? p.revenue / p.units : 0;
        const altaVenta  = p.units >= avgUnits;
        const altoMargen = precioUn >= avgRevUnit;
        let cat, catColor, accion;
        if (altaVenta && altoMargen)  { cat = '⭐ Estrella';           catColor = '#22c55e'; accion = 'Mantener y destacar en el menú'; }
        else if (altaVenta)            { cat = '🐎 Caballo de batalla'; catColor = '#f59e0b'; accion = 'Subir precio gradualmente o reducir costo'; }
        else if (altoMargen)           { cat = '🧩 Puzzle';             catColor = '#6366f1'; accion = 'Promocionar activamente'; }
        else                           { cat = '🐶 Perro';              catColor = '#ef4444'; accion = 'Evaluar eliminación o reformulación'; }
        const hasCost = p.unitCost > 0;
        const fcPct   = hasCost && precioUn > 0 ? ((p.unitCost / precioUn) * 100).toFixed(1) : null;
        const fcColor = fcPct === null ? '#999' : Number(fcPct) > 50 ? '#ef4444' : Number(fcPct) > 45 ? '#f59e0b' : '#22c55e';
        const ganTotal = hasCost ? fmtN(Math.round(p.revenue - p.totalCost)) : '—';
        return `<tr>
          <td>${p.name}</td>
          <td style="text-align:center">${p.units}</td>
          <td>${fmtN(Math.round(precioUn))}</td>
          <td>${hasCost ? fmtN(Math.round(p.unitCost)) : '<span style="color:#999;font-size:10px">[SIN COSTO]</span>'}</td>
          <td style="color:${fcColor};font-weight:700">${fcPct !== null ? fcPct+'%' : '<span style="color:#999;font-size:10px">N/D</span>'}</td>
          <td>${fmtN(p.revenue)}</td>
          <td>${ganTotal}</td>
          <td><span style="background:${catColor}22;color:${catColor};padding:2px 8px;border-radius:99px;font-weight:700;font-size:11px">${cat}</span></td>
          <td style="color:#555;font-size:11px">${accion}</td>
        </tr>`;
      }).join('');

      // ── Semáforos / Alertas ───────────────────────────────────────────────
      const alertas = { critico: [], atencion: [], ok: [] };
      if (Number(foodCostPct) > 50)                     alertas.critico.push(`Food cost ${foodCostPct}% — por encima del 50%`);
      if (Number(margenNetoPct) < 10)                   alertas.critico.push(`Margen neto ${margenNetoPct}% — por debajo del 10%`);
      if (Number(concPct) > 50)                         alertas.critico.push(`Top 3 clientes = ${concPct}% de ingresos — riesgo de concentración`);
      if (d.summary.totalFixed > d.summary.totalRevenue * 0.40) alertas.critico.push('Gastos fijos superan el 40% de los ingresos');
      if (Number(foodCostPct) >= 40 && Number(foodCostPct) <= 50) alertas.atencion.push(`Food cost ${foodCostPct}% — zona de atención (40-50%)`);
      if (Number(margenNetoPct) >= 10 && Number(margenNetoPct) <= 20) alertas.atencion.push(`Margen neto ${margenNetoPct}% — monitorear`);
      if (Number(descuentoPct) > 10)                    alertas.atencion.push(`Descuentos ${descuentoPct}% sobre ventas — por encima del 10%`);
      if (diasConVentas < 15)                           alertas.atencion.push(`Solo ${diasConVentas} días con ventas en el mes`);
      if (!foodCostReal)                                alertas.atencion.push('Food cost no registrado — se usa estimación del 40%');
      if (d.summary.totalFixed === 0)                   alertas.atencion.push('Gastos fijos en $0 — ganancia sobreestimada');
      if (Number(foodCostPct) < 35)                     alertas.ok.push(`Food cost ${foodCostPct}% — dentro del rango ideal`);
      if (Number(margenNetoPct) > 20)                   alertas.ok.push(`Margen neto ${margenNetoPct}% — saludable`);
      if (Number(concPct) <= 40)                        alertas.ok.push(`Concentración de clientes ${concPct}% — distribución razonable`);

      const semaforo = (lista, color, emoji, titulo) => lista.length === 0 ? '' :
        `<div style="margin-bottom:10px"><div style="font-weight:700;color:${color};margin-bottom:4px">${emoji} ${titulo}</div>
        ${lista.map(t => `<div style="background:${color}11;border-left:3px solid ${color};padding:6px 12px;margin:3px 0;border-radius:0 6px 6px 0;font-size:12px">${t}</div>`).join('')}</div>`;

      // ── Plan de acción ───────────────────────────────────────────────────
      const accionesCp = [];
      const accionesMp = [];
      const accionesLp = [];
      if (!foodCostReal)      accionesCp.push({ desc: 'Cargar costos reales de cada producto', resp: 'Operador', kpi: 'Food cost % real visible', fecha: '1 semana' });
      if (d.summary.totalFixed === 0) accionesCp.push({ desc: 'Registrar gastos fijos del mes (alquiler, servicios)', resp: 'Operador', kpi: 'Gastos fijos > $0', fecha: '1 semana' });
      if (Number(descuentoPct) > 15)  accionesCp.push({ desc: 'Auditar cupones activos y reducir descuentos directos', resp: 'Operador', kpi: 'Descuentos < 10% de ventas', fecha: '2 semanas' });
      if (concAlerta) accionesMp.push({ desc: 'Campaña de captación para reducir concentración de clientes', resp: 'Marketing', kpi: 'Top 3 < 40% ingresos', fecha: '1 mes' });
      accionesMp.push({ desc: 'Activar difusión por WhatsApp para días con baja demanda', resp: 'Operador', kpi: '+15% pedidos en días flojos', fecha: '2 semanas' });
      accionesMp.push({ desc: 'Implementar combo papas + bebida para subir ticket promedio', resp: 'Operador', kpi: `Ticket > ${fmtN(Math.round(d.summary.avgTicket * 1.1))}`, fecha: '1 mes' });
      accionesLp.push({ desc: 'Medir frecuencia de compra por cliente (retención mensual)', resp: 'Sistema', kpi: 'Tasa retención > 60%', fecha: 'Q próximo' });
      accionesLp.push({ desc: 'Expandir sistema de referidos a más clientes estrella', resp: 'Operador', kpi: '+20% clientes nuevos por referido', fecha: 'Q próximo' });
      accionesLp.push({ desc: 'Configurar alertas automáticas de food cost y margen', resp: 'Sistema', kpi: 'Alertas activas en dashboard', fecha: 'Q próximo' });

      const accionTabla = (lista) => lista.map(a => `
        <tr>
          <td style="font-size:12px">${a.desc}</td>
          <td style="font-size:11px;color:#666">${a.resp}</td>
          <td style="font-size:11px;color:#22c55e">${a.kpi}</td>
          <td style="font-size:11px;color:#f59e0b">${a.fecha}</td>
        </tr>`).join('');

      // ── HTML del reporte completo ─────────────────────────────────────────
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reporte ${monthName} ${year} — Janz Burgers</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;margin:0;padding:28px;font-size:13px;background:#fafafa}
        .cover{text-align:center;padding:28px 0 24px;border-bottom:3px solid #c49b35;margin-bottom:24px}
        .cover h1{font-size:1.7rem;color:#c49b35;margin:8px 0 4px}
        .cover .sub{color:#999;font-size:0.82rem}
        .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        .kpi{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:12px;text-align:center}
        .kpi-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px}
        .kpi-value{font-size:1.3rem;font-weight:800;color:#c49b35}
        .kpi-value.red{color:#ef4444}.kpi-value.green{color:#22c55e}.kpi-value.blue{color:#6366f1}
        .section{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:18px 20px;margin-bottom:14px}
        h2{color:#c49b35;border-bottom:2px solid #c49b35;padding-bottom:5px;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em}
        h3{color:#444;margin:12px 0 5px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em}
        p{margin:4px 0;line-height:1.6;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:11.5px}
        th{background:#f5f5f5;padding:7px 10px;text-align:left;border-bottom:2px solid #ddd;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em}
        td{padding:6px 10px;border-bottom:1px solid #eee}
        tr:last-child td{border-bottom:none}
        .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .info-box{background:#f9f9f9;border-radius:8px;padding:12px;font-size:12px}
        .footer{text-align:center;color:#bbb;font-size:10px;margin-top:24px;padding-top:12px;border-top:1px solid #eee}
        .tag-faltante{background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px}
        @media print{body{padding:12px;background:#fff}.kpis{grid-template-columns:repeat(4,1fr)}.section{break-inside:avoid;margin-bottom:10px}}
      </style></head><body>

      <!-- PORTADA -->
      <div class="cover">
        <img src="${logoBase64}" alt="Janz Burgers" style="height:90px;width:auto;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto" />
        <h1>Reporte Mensual — ${monthName} ${year}</h1>
        <div class="sub">Janz Burgers &nbsp;·&nbsp; Generado el ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</div>
        <div style="margin-top:8px;font-size:11px;color:#bbb">${!foodCostReal ? '⚠️ REPORTE INCOMPLETO — food cost no registrado' : '✅ Datos de costos cargados'}</div>
      </div>

      <!-- SECCIÓN 0 — ENCABEZADO -->
      <div class="section">
        <h2>Sección 0 — Encabezado del reporte</h2>
        <div class="row2">
          <div>
            <p><strong>Negocio:</strong> Janz Burgers</p>
            <p><strong>Período:</strong> ${monthName} ${year}</p>
            <p><strong>Generado el:</strong> ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</p>
            <p><strong>Pedidos entregados:</strong> ${d.summary.totalOrders}</p>
          </div>
          <div>
            <p><strong>Modalidad:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Días/horarios operación:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Plataformas activas:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Responsable:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 1 — RESUMEN EJECUTIVO -->
      <div class="section">
        <h2>Sección 1 — Resumen ejecutivo</h2>
        ${!foodCostReal ? '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px 14px;margin:0 0 12px;border-radius:0 6px 6px 0;font-size:12px">⚠️ <strong>REPORTE INCOMPLETO:</strong> Food cost = $0. No se muestra ganancia neta real hasta que se carguen los costos de productos.</div>' : ''}
        <div class="kpis" style="margin-bottom:0">
          <div class="kpi"><div class="kpi-label">Pedidos entregados</div><div class="kpi-value">${d.summary.totalOrders}</div></div>
          <div class="kpi"><div class="kpi-label">Días con ventas</div><div class="kpi-value">${diasConVentas}</div></div>
          <div class="kpi"><div class="kpi-label">Ingresos brutos</div><div class="kpi-value">${fmtN(d.summary.totalRevenue)}</div></div>
          <div class="kpi"><div class="kpi-label">Ingresos netos</div><div class="kpi-value">${fmtN(ingresosNetos)}</div></div>
          <div class="kpi"><div class="kpi-label">Ticket promedio</div><div class="kpi-value">${fmtN(d.summary.avgTicket)}</div></div>
          <div class="kpi"><div class="kpi-label">Ganancia neta</div><div class="kpi-value ${margenNeto >= 0 ? 'green' : 'red'}">${foodCostReal ? fmtN(margenNeto) : 'N/D'}</div></div>
          <div class="kpi"><div class="kpi-label">Food cost %</div><div class="kpi-value ${Number(foodCostPct)>50?'red':Number(foodCostPct)>40?'':'green'}">${foodCostPct}%${!foodCostReal?' *':''}</div></div>
          <div class="kpi"><div class="kpi-label">Margen neto %</div><div class="kpi-value ${Number(margenNetoPct)>20?'green':Number(margenNetoPct)>10?'blue':'red'}">${foodCostReal ? margenNetoPct+'%' : 'N/D'}</div></div>
        </div>
        ${!foodCostReal ? '<p style="font-size:10px;color:#999;margin-top:8px">* Food cost estimado al 40% — no refleja costos reales.</p>' : ''}
        <div style="margin-top:12px;background:#f9f9f9;border-radius:8px;padding:10px;font-size:12px">
          <strong>Comparativo mes anterior:</strong>
          <span class="tag-faltante" style="margin-left:6px">[DATO FALTANTE — requiere histórico]</span>
        </div>
      </div>

      <!-- SECCIÓN 2 — ANÁLISIS FINANCIERO -->
      <div class="section">
        <h2>Sección 2 — Análisis financiero real</h2>
        <div class="row2">
          <div>
            <table>
              <tr><td style="color:#666">Ingresos brutos</td><td style="text-align:right;font-weight:700">${fmtN(d.summary.totalRevenue)}</td></tr>
              <tr><td style="color:#666">− Descuentos/cupones</td><td style="text-align:right;color:#ef4444">−${fmtN(d.summary.totalCouponDiscount)}</td></tr>
              <tr><td style="color:#444;font-weight:700">= Ingresos netos</td><td style="text-align:right;font-weight:700">${fmtN(ingresosNetos)}</td></tr>
              <tr><td style="color:#666">− Food cost${!foodCostReal?' (estimado 40%)':' real'}</td><td style="text-align:right;color:#ef4444">−${fmtN(foodCost)}</td></tr>
              <tr><td style="color:#444;font-weight:700">= Margen bruto</td><td style="text-align:right;font-weight:700;color:${Number(margenBrutoPct)>35?'#22c55e':'#ef4444'}">${fmtN(margenBruto)} (${margenBrutoPct}%)</td></tr>
              <tr><td style="color:#666">− Gastos fijos</td><td style="text-align:right;color:#ef4444">−${fmtN(d.summary.totalFixed)}</td></tr>
              <tr><td style="color:#666">− Costo laboral</td><td style="text-align:right;color:#999">[DATO FALTANTE]</td></tr>
              <tr><td style="font-weight:700;font-size:13px">= Ganancia neta</td><td style="text-align:right;font-weight:800;font-size:13px;color:${margenNeto>=0?'#22c55e':'#ef4444'}">${foodCostReal ? fmtN(margenNeto)+' ('+margenNetoPct+'%)' : 'N/D — cargar food cost'}</td></tr>
            </table>
          </div>
          <div class="info-box">
            <p><strong>Punto de equilibrio:</strong> <span class="tag-faltante">[DATO FALTANTE — requiere gastos fijos completos]</span></p>
            <p style="margin-top:10px"><strong>Rentabilidad:</strong> <span style="color:${rentColor};font-weight:800">${rentabilidad}</span></p>
            <p><strong>Food cost:</strong> ${foodCostPct}% — ${Number(foodCostPct) <= 35 ? '✅ Ideal (30-40%)' : Number(foodCostPct) <= 45 ? '⚠️ Aceptable' : '🚨 Alto'}</p>
            <p><strong>Descuentos:</strong> ${descuentoPct}% — ${Number(descuentoPct) <= 10 ? '✅ Controlado' : Number(descuentoPct) <= 15 ? '⚠️ Moderado' : '🚨 Alto'}</p>
            <p style="margin-top:8px;font-size:10px;color:#999">Ref. hamburguesería: food cost ideal 30-40%, margen neto saludable 15-25%.</p>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 3 — FOOD COST POR PRODUCTO -->
      <div class="section">
        <h2>Sección 3 — Food cost por producto (ingeniería de menú)</h2>
        ${!foodCostReal ? '<div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:8px 12px;margin:0 0 10px;border-radius:0 6px 6px 0;font-size:12px">⚠️ Ningún producto tiene costo cargado en su receta. Completar en <strong>Productos → Receta</strong> para ver food cost real.</div>' : ''}
        <p style="font-size:11px;color:#999;margin-bottom:8px">Food cost calculado desde la receta de cada producto. Clasificación basada en volumen y precio relativo al menú.</p>
        <table>
          <thead><tr><th>Producto</th><th>Unidades</th><th>Precio venta</th><th>Costo receta</th><th>Food cost %</th><th>Ingresos</th><th>Ganancia total</th><th>Clasificación</th><th>Acción</th></tr></thead>
          <tbody>${menuRows}</tbody>
        </table>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;font-size:10px">
          <span style="background:#22c55e22;color:#22c55e;padding:2px 8px;border-radius:99px;font-weight:700">⭐ Estrella = alto margen + alta venta</span>
          <span style="background:#f59e0b22;color:#f59e0b;padding:2px 8px;border-radius:99px;font-weight:700">🐎 Caballo = alta venta + bajo margen</span>
          <span style="background:#6366f122;color:#6366f1;padding:2px 8px;border-radius:99px;font-weight:700">🧩 Puzzle = alto margen + baja venta</span>
          <span style="background:#ef444422;color:#ef4444;padding:2px 8px;border-radius:99px;font-weight:700">🐶 Perro = bajo margen + baja venta</span>
        </div>
      </div>

      <!-- SECCIÓN 4 — VENTAS Y CANALES -->
      <div class="section">
        <h2>Sección 4 — Ventas y canales</h2>
        <h3>4a. Ventas por canal</h3>
        <div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:6px 12px;margin-bottom:10px;border-radius:0 6px 6px 0;font-size:11px">⚠️ Canal por pedido no registrado en el sistema — se requiere agregar campo "canal" a cada orden.</div>
        <table>
          <thead><tr><th>Canal</th><th>Pedidos</th><th>Ingresos</th><th>% del total</th><th>Ticket prom.</th></tr></thead>
          <tbody><tr><td colspan="5" style="color:#999;text-align:center;font-style:italic">[DATO FALTANTE]</td></tr></tbody>
        </table>
        <h3 style="margin-top:14px">4b. Ventas por día</h3>
        <table>
          <thead><tr><th>Día</th><th>Pedidos</th><th>Ingresos</th><th>Ticket prom.</th></tr></thead>
          <tbody>
            ${diasArr.map(([day,v]) => `<tr><td>${day}/${month}/${year}</td><td>${v.orders}</td><td>${fmtN(v.revenue)}</td><td>${v.orders > 0 ? fmtN(Math.round(v.revenue/v.orders)) : '—'}</td></tr>`).join('')}
          </tbody>
        </table>
        <h3 style="margin-top:14px">4c. Ventas por franja horaria</h3>
        <div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:6px 12px;margin-bottom:10px;border-radius:0 6px 6px 0;font-size:11px">⚠️ Horario por pedido no registrado. [DATO FALTANTE]</div>
        <h3 style="margin-top:14px">4d. Mejor y peor día</h3>
        <div class="row2">
          <div style="background:#dcfce7;border-radius:8px;padding:12px">
            <div style="font-weight:700;color:#22c55e;margin-bottom:4px">📈 Mejor día</div>
            ${mejorDia ? `<p>Día ${mejorDia[0]}/${month} — ${mejorDia[1].orders} pedidos — ${fmtN(mejorDia[1].revenue)}</p>` : '<p>Sin datos</p>'}
          </div>
          <div style="background:#fee2e2;border-radius:8px;padding:12px">
            <div style="font-weight:700;color:#ef4444;margin-bottom:4px">📉 Día más flojo</div>
            ${peorDia ? `<p>Día ${peorDia[0]}/${month} — ${peorDia[1].orders} pedidos — ${fmtN(peorDia[1].revenue)}</p>` : '<p>Sin datos</p>'}
          </div>
        </div>
        <h3 style="margin-top:14px">4e. Ranking de productos</h3>
        <table>
          <thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Ingresos</th><th>% ventas totales</th></tr></thead>
          <tbody>
            ${d.topProducts.map((p,i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.units}</td><td>${fmtN(p.revenue)}</td><td>${pct(p.revenue, d.summary.totalRevenue)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN 5 — GASTOS -->
      <div class="section">
        <h2>Sección 5 — Gastos fijos y variables</h2>
        ${d.summary.totalFixed === 0 ? '<div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:8px 12px;margin-bottom:10px;border-radius:0 6px 6px 0;font-size:12px">⚠️ Gastos fijos en $0. Sin datos de alquiler, servicios ni sueldos, la ganancia neta está sobreestimada.</div>' : ''}
        <h3>5a. Gastos fijos registrados</h3>
        ${d.summary.totalFixed > 0 ? `
        <table>
          <thead><tr><th>Concepto</th><th>Monto</th><th>Tipo</th></tr></thead>
          <tbody>
            ${Object.entries(d.fixedExpenses).map(([k,v]) => `<tr><td>${k}</td><td style="text-align:right;font-weight:700">${fmtN(v)}</td><td>Fijo</td></tr>`).join('')}
            <tr style="background:#f5f5f5"><td><strong>Total gastos fijos</strong></td><td style="text-align:right;font-weight:800;color:#ef4444">${fmtN(d.summary.totalFixed)}</td><td></td></tr>
          </tbody>
        </table>` : '<p style="color:#999">Sin gastos fijos registrados.</p>'}
        <h3 style="margin-top:12px">5b. Gastos variables / materia prima</h3>
        <p style="color:#999;font-size:11px">[DATO FALTANTE — registrar compras de materia prima con proveedor, producto y monto]</p>
        <h3 style="margin-top:12px">5c. Comparación con mes anterior</h3>
        <p style="color:#999;font-size:11px">[DATO FALTANTE — requiere histórico]</p>
      </div>

      <!-- SECCIÓN 6 — RECURSOS HUMANOS -->
      <div class="section">
        <h2>Sección 6 — Recursos humanos</h2>
        <div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:8px 12px;margin-bottom:10px;border-radius:0 6px 6px 0;font-size:12px">⚠️ [DATO FALTANTE] Costo laboral no registrado. Cargar horas trabajadas y sueldo por persona para calcular % costo laboral / ingresos.</div>
        <table>
          <thead><tr><th>Nombre/Rol</th><th>Tipo</th><th>Horas trab.</th><th>Costo mensual</th><th>Costo/hora</th><th>Costo/pedido</th></tr></thead>
          <tbody><tr><td colspan="6" style="color:#999;text-align:center;font-style:italic">Sin datos de personal registrados</td></tr></tbody>
        </table>
        ${d.userDistribution?.length > 0 ? `
        <h3 style="margin-top:12px">Distribución de ganancias configurada</h3>
        <table>
          <thead><tr><th>Persona</th><th>%</th><th>Monto</th></tr></thead>
          <tbody>${d.userDistribution.map(u => `<tr><td>${u.name}</td><td>${u.percent}%</td><td style="font-weight:700;color:#22c55e">${fmtN(u.amount)}</td></tr>`).join('')}</tbody>
        </table>` : ''}
      </div>

      <!-- SECCIÓN 7 — STOCK E INVENTARIO -->
      <div class="section">
        <h2>Sección 7 — Stock e inventario</h2>
        <div style="background:#fff3cd;border-left:3px solid #f59e0b;padding:8px 12px;margin-bottom:10px;border-radius:0 6px 6px 0;font-size:12px">⚠️ [DATO FALTANTE] Stock inicial/final no registrado. Para habilitar este módulo, cargar inventario mensual en el sistema.</div>
        <table>
          <thead><tr><th>Insumo</th><th>Stock inicial</th><th>Comprado</th><th>Consumo teórico</th><th>Stock final real</th><th>Diferencia</th><th>Merma %</th></tr></thead>
          <tbody>
            ${['Carne (kg)','Pan (unidades)','Queso (kg)','Vegetales','Salsas','Packaging'].map(ins => `<tr><td>${ins}</td><td colspan="6" style="color:#999;text-align:center">[DATO FALTANTE]</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN 8 — ANÁLISIS DE CLIENTES -->
      <div class="section">
        <h2>Sección 8 — Análisis de clientes</h2>
        ${concAlerta ? `<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:8px 12px;margin:0 0 10px;border-radius:0 6px 6px 0;font-size:12px">🚨 <strong>Alta concentración:</strong> Top 3 clientes = ${concPct}% de ingresos. Top 5 = ${conc5Pct}%.</div>` : `<div style="background:#dcfce7;border-left:4px solid #22c55e;padding:8px 12px;margin:0 0 10px;border-radius:0 6px 6px 0;font-size:12px">✅ Concentración Top 3: ${concPct}% | Top 5: ${conc5Pct}% — distribución razonable.</div>`}
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Total gastado</th><th>% ingresos</th><th>Ticket prom.</th></tr></thead>
          <tbody>
            ${d.topClients.map((c,i) => `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.orders}</td><td>${fmtN(c.spent)}</td><td>${pct(c.spent, d.summary.totalRevenue)}</td><td>${c.orders > 0 ? fmtN(Math.round(c.spent/c.orders)) : '—'}</td></tr>`).join('')}
          </tbody>
        </table>
        <h3 style="margin-top:12px">8b. Segmentación nuevos vs recurrentes</h3>
        <p style="color:#999;font-size:11px">[DATO FALTANTE — requiere comparativo con mes anterior para identificar clientes nuevos y recurrentes]</p>
        <h3 style="margin-top:10px">8c. Riesgo de concentración</h3>
        <p><strong>% ingresos Top 3:</strong> <span style="color:${Number(concPct)>50?'#ef4444':Number(concPct)>40?'#f59e0b':'#22c55e'};font-weight:700">${concPct}%</span> ${Number(concPct)>40?'⚠️ RIESGO ALTO':'✅ OK'}</p>
        <p><strong>% ingresos Top 5:</strong> ${conc5Pct}%</p>
      </div>

      <!-- SECCIÓN 9 — DESCUENTOS Y PROMOCIONES -->
      <div class="section">
        <h2>Sección 9 — Descuentos y promociones</h2>
        <div class="row2">
          <div>
            <table>
              <tr><td style="color:#666">Total descuentos aplicados</td><td style="text-align:right;color:#ef4444;font-weight:700">−${fmtN(d.summary.totalCouponDiscount)}</td></tr>
              <tr><td style="color:#666">% sobre ventas brutas</td><td style="text-align:right;font-weight:700">${descuentoPct}%</td></tr>
              <tr><td style="color:#666">Impacto en margen</td><td style="text-align:right;font-weight:700">${Number(descuentoPct) > 10 ? '⚠️ Alto' : Number(descuentoPct) > 5 ? 'Moderado' : '✅ Bajo'}</td></tr>
            </table>
          </div>
          <div class="info-box">
            <p><strong>Desglose por tipo de cupón:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p style="margin-top:8px"><strong>Estrategia:</strong></p>
            ${Number(descuentoPct) > 15 ? '<p style="color:#ef4444">🚨 Reducir descuento directo — reemplazar por combos de mayor margen</p><p>Limitar cupones a clientes nuevos</p>' : '<p style="color:#22c55e">✅ Nivel de descuentos controlado</p>'}
            <p>Upselling: agregar papas o bebida al pedido (+margen)</p>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 10 — OPERACIÓN -->
      <div class="section">
        <h2>Sección 10 — Operación</h2>
        <div class="row2">
          <div>
            <p><strong>Pedidos entregados:</strong> ${d.summary.totalOrders}</p>
            <p><strong>Pedidos cancelados:</strong> ${d.summary.cancelledOrders} ${d.summary.cancelledOrders > d.summary.totalOrders * 0.1 ? '⚠️ Tasa alta' : ''}</p>
            <p><strong>Tasa de cancelación:</strong> ${d.summary.totalOrders + d.summary.cancelledOrders > 0 ? ((d.summary.cancelledOrders/(d.summary.totalOrders+d.summary.cancelledOrders))*100).toFixed(1) : 0}%</p>
          </div>
          <div>
            <p><strong>Tiempo prom. preparación:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Tiempo prom. entrega:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Quejas / devoluciones:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
            <p><strong>Capacidad máx. estimada:</strong> <span class="tag-faltante">[DATO FALTANTE]</span></p>
          </div>
        </div>
        <p style="margin-top:10px"><strong>Días fuertes del mes:</strong> Día ${mejorDia?.[0]||'—'} (mayor demanda) — Día ${peorDia?.[0]||'—'} (menor demanda)</p>
      </div>

      <!-- SECCIÓN 11 — COMPARATIVO HISTÓRICO -->
      <div class="section">
        <h2>Sección 11 — Comparativo histórico</h2>
        <div style="background:#f9f9f9;border-radius:8px;padding:12px;font-size:12px;color:#666">
          <p>⚠️ [DATO FALTANTE] El sistema no tiene acceso a datos históricos de meses anteriores para este reporte. Para habilitar comparativo, registrar al menos 2 meses consecutivos.</p>
        </div>
        <table style="margin-top:10px">
          <thead><tr><th>Métrica</th><th>Mes -3</th><th>Mes -2</th><th>Mes anterior</th><th style="background:#c49b3511">Mes actual</th><th>Tendencia</th></tr></thead>
          <tbody>
            ${['Pedidos totales','Ingresos brutos','Ticket promedio','Food cost %','Margen neto %','Clientes únicos'].map(m => `<tr><td>${m}</td><td style="color:#999">—</td><td style="color:#999">—</td><td style="color:#999">—</td><td style="font-weight:700">${m==='Pedidos totales'?d.summary.totalOrders:m==='Ingresos brutos'?fmtN(d.summary.totalRevenue):m==='Ticket promedio'?fmtN(d.summary.avgTicket):m==='Food cost %'?foodCostPct+'%':m==='Margen neto %'?(foodCostReal?margenNetoPct+'%':'N/D'):d.topClients.length}</td><td style="color:#999">—</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN 12 — ALERTAS Y SEMÁFOROS -->
      <div class="section">
        <h2>Sección 12 — Alertas y semáforos</h2>
        ${semaforo(alertas.critico, '#ef4444', '🔴', 'CRÍTICO — Requiere acción inmediata')}
        ${semaforo(alertas.atencion, '#f59e0b', '🟡', 'ATENCIÓN — Monitorear')}
        ${semaforo(alertas.ok, '#22c55e', '🟢', 'OK')}
        ${alertas.critico.length === 0 && alertas.atencion.length === 0 ? '<p style="color:#22c55e;font-weight:700">✅ Sin alertas críticas ni de atención este mes.</p>' : ''}
      </div>

      <!-- SECCIÓN 13 — PLAN DE ACCIÓN -->
      <div class="section">
        <h2>Sección 13 — Plan de acción</h2>
        <h3 style="color:#ef4444">⚡ Esta semana — acciones urgentes (alertas rojas)</h3>
        ${accionesCp.length > 0 ? `
        <table>
          <thead><tr><th>Acción</th><th>Responsable</th><th>Métrica de éxito</th><th>Fecha límite</th></tr></thead>
          <tbody>${accionTabla(accionesCp)}</tbody>
        </table>` : '<p style="color:#22c55e;font-size:12px">✅ Sin acciones urgentes esta semana.</p>'}
        <h3 style="color:#f59e0b;margin-top:14px">🔧 Este mes — acciones de mejora</h3>
        <table>
          <thead><tr><th>Acción</th><th>Responsable</th><th>Métrica de éxito</th><th>Fecha límite</th></tr></thead>
          <tbody>${accionTabla(accionesMp)}</tbody>
        </table>
        <h3 style="color:#22c55e;margin-top:14px">🚀 Próximo trimestre</h3>
        <table>
          <thead><tr><th>Acción</th><th>Responsable</th><th>Métrica de éxito</th><th>Fecha límite</th></tr></thead>
          <tbody>${accionTabla(accionesLp)}</tbody>
        </table>
      </div>

      <!-- MÉTODOS DE PAGO -->
      <div class="section">
        <h2>Métodos de pago</h2>
        <table>
          <thead><tr><th>Método</th><th>Pedidos</th><th>Total</th><th>%</th></tr></thead>
          <tbody>
            <tr><td>💵 Efectivo</td><td>${d.paymentMethods.efectivo.count}</td><td>${fmtN(d.paymentMethods.efectivo.total)}</td><td>${pct(d.paymentMethods.efectivo.total, d.summary.totalRevenue)}</td></tr>
            <tr><td>🏦 Transferencia</td><td>${d.paymentMethods.transferencia.count}</td><td>${fmtN(d.paymentMethods.transferencia.total)}</td><td>${pct(d.paymentMethods.transferencia.total, d.summary.totalRevenue)}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- CHECKLIST DE DATOS -->
      <div class="section">
        <h2>Checklist de datos cargados</h2>
        <div class="row2">
          <div>
            ${[
              [foodCostReal, 'Costo real de cada producto'],
              [false, 'Canal de cada pedido (WhatsApp, Rappi, local)'],
              [false, 'Horario de cada pedido'],
              [false, 'Costo laboral o horas trabajadas'],
              [false, 'Stock inicial y final del mes'],
              [false, 'Compras de materia prima con detalle'],
            ].map(([ok, label]) => `<p style="margin:3px 0">${ok ? '✅' : '❌'} ${label}</p>`).join('')}
          </div>
          <div>
            ${[
              [d.summary.totalFixed > 0, 'Gastos fijos registrados'],
              [false, 'Packaging como gasto separado'],
              [false, 'Comisiones de plataformas'],
              [false, 'Tipo de descuento por pedido'],
              [false, 'Si el cliente es nuevo o recurrente'],
              [false, 'Datos mes anterior para comparativo'],
            ].map(([ok, label]) => `<p style="margin:3px 0">${ok ? '✅' : '❌'} ${label}</p>`).join('')}
          </div>
        </div>
      </div>

      <div class="footer">Reporte generado por Janz Burgers — Sistema de Gestión &nbsp;·&nbsp; ${monthName} ${year}</div>
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