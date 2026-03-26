import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;

// Generar CSV/Excel desde datos
function buildCSV(rows, headers) {
  const lines = [headers.join(',')];
  rows.forEach(row => {
    lines.push(row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
  });
  return lines.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildHTMLReport(data, period) {
  const { sales, cash, users } = data;
  const paymentRows = (sales?.paymentMethods || []).map(p =>
    `<tr><td>${p.name === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}</td><td>${p.count} pedidos</td><td>${fmt(p.value)}</td></tr>`
  ).join('');

  const topRows = (sales?.top5 || []).map((p, i) =>
    `<tr><td>#${i+1} ${p.name}</td><td>${p.units} uds</td><td>${fmt(p.revenue)}</td></tr>`
  ).join('');

  const profitRows = (sales?.profitDistribution || []).map(p =>
    `<tr><td>${p.name}</td><td>${p.percent}%</td><td>${fmt(p.amount)}</td></tr>`
  ).join('');

  const clientRows = (sales?.topClients || []).map((c, i) =>
    `<tr><td>#${i+1} ${c.name}</td><td>${c.orders}</td><td>${fmt(c.spent)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Reporte Janz Burgers — ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
  h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; margin: 24px 0 10px; color: #333; border-bottom: 2px solid #E8B84B; padding-bottom: 6px; }
  .header { margin-bottom: 28px; border-bottom: 3px solid #E8B84B; padding-bottom: 16px; }
  .subtitle { color: #888; font-size: 13px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
  .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
  .gold { color: #C8961F; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f3f3; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #666; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  .section { margin-bottom: 32px; }
  .footer { margin-top: 40px; color: #aaa; font-size: 11px; text-align: center; }
  @media print { body { padding: 16px; } }
</style></head>
<body>
  <div class="header">
    <h1>🍔 JANZ BURGERS</h1>
    <div class="subtitle">Reporte ejecutivo — ${period}</div>
    <div class="subtitle">Generado el ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>

  <div class="stat-grid">
    <div class="stat"><div class="stat-label">Pedidos</div><div class="stat-value">${sales?.orders || 0}</div></div>
    <div class="stat"><div class="stat-label">Ingresos</div><div class="stat-value gold">${fmt(sales?.totalRevenue)}</div></div>
    <div class="stat"><div class="stat-label">Ticket promedio</div><div class="stat-value">${fmt(sales?.avgTicket)}</div></div>
    <div class="stat"><div class="stat-label">Tiempo prom. entrega</div><div class="stat-value">${sales?.avgDeliveryTime ? `${sales.avgDeliveryTime}m` : '—'}</div></div>
  </div>

  <div class="section">
    <h2>Métodos de pago</h2>
    <table><thead><tr><th>Método</th><th>Pedidos</th><th>Monto</th></tr></thead>
    <tbody>${paymentRows}</tbody></table>
  </div>

  <div class="section">
    <h2>Top 5 productos</h2>
    <table><thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
    <tbody>${topRows}</tbody></table>
  </div>

  ${sales?.profitDistribution?.length ? `
  <div class="section">
    <h2>Distribución de ganancias</h2>
    <table><thead><tr><th>Persona</th><th>%</th><th>Monto</th></tr></thead>
    <tbody>${profitRows}</tbody></table>
  </div>` : ''}

  ${sales?.topClients?.length ? `
  <div class="section">
    <h2>Clientes estrella</h2>
    <table><thead><tr><th>Cliente</th><th>Pedidos</th><th>Total gastado</th></tr></thead>
    <tbody>${clientRows}</tbody></table>
  </div>` : ''}

  <div class="footer">Janz Burgers — Sistema de gestión gastronómica</div>
</body></html>`;
}

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState('');

  const period = `${months[month - 1]} ${year}`;

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const fetchData = async () => {
    const [salesRes, cashRes] = await Promise.all([
      API.get(`/dashboard/sales?month=${month}&year=${year}`),
      API.get(`/dashboard/cash?date=${year}-${String(month).padStart(2,'0')}-01`).catch(() => ({ data: null }))
    ]);
    return { sales: salesRes.data, cash: cashRes.data };
  };

  // ── Exportar Excel (CSV) pedidos del mes ──────────────────────────────────
  const exportOrdersCSV = async () => {
    setLoading('orders');
    try {
      const start = `${year}-${String(month).padStart(2,'0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2,'0')}-${endDay}`;

      const res = await API.get('/orders', {
        params: { limit: 1000, date: start }
      });
      const orders = res.data;

      const headers = ['Número', 'Fecha', 'Cliente', 'Productos', 'Total', 'Método de pago', 'Tipo entrega', 'Zona', 'Packaging', 'Cupón', 'Descuento', 'Estado', 'Tiempo entrega (min)'];
      const rows = orders.map(o => {
        const products = (o.items || []).map(i => `${i.productName} ${i.variant} ×${i.quantity}`).join(' | ');
        const deliveryTime = o.receivedAt && o.deliveredAt
          ? Math.round((new Date(o.deliveredAt) - new Date(o.receivedAt)) / 60000)
          : '';
        return [
          o.orderNumber,
          new Date(o.createdAt).toLocaleDateString('es-AR'),
          o.client?.name || '',
          products,
          o.total,
          o.paymentMethod,
          o.deliveryType,
          o.zone || '',
          o.packagingCost || 0,
          o.couponCode || '',
          o.discountAmount || 0,
          o.status,
          deliveryTime
        ];
      });

      downloadCSV(buildCSV(rows, headers), `pedidos-${month}-${year}.csv`);
      toast.success(`${orders.length} pedidos exportados`);
    } catch { toast.error('Error al exportar pedidos'); }
    finally { setLoading(''); }
  };

  // ── Exportar Excel (CSV) resumen mensual ──────────────────────────────────
  const exportSummaryCSV = async () => {
    setLoading('summary');
    try {
      const { sales } = await fetchData();

      // Hoja 1: ventas por día
      const dayHeaders = ['Día', 'Pedidos', 'Ingresos'];
      const dayRows = (sales.salesByDay || []).map(d => [d.label, d.orders, d.revenue]);

      // Hoja 2: productos
      const prodHeaders = ['Producto', 'Unidades', 'Ingresos'];
      const prodRows = (sales.top5 || []).map(p => [p.name, p.units, p.revenue]);

      // Hoja 3: distribución ganancias
      const profitHeaders = ['Persona', '% asignado', 'Monto estimado'];
      const profitRows = (sales.profitDistribution || []).map(p => [p.name, p.percent, p.amount]);

      const csv = [
        '=== RESUMEN MENSUAL ===',
        `Período:,${period}`,
        `Total pedidos:,${sales.orders}`,
        `Ingresos totales:,${sales.totalRevenue}`,
        `Ticket promedio:,${sales.avgTicket}`,
        `Tiempo promedio entrega:,${sales.avgDeliveryTime ? sales.avgDeliveryTime + ' min' : 'N/A'}`,
        '',
        '=== VENTAS POR DÍA ===',
        buildCSV(dayRows, dayHeaders),
        '',
        '=== TOP PRODUCTOS ===',
        buildCSV(prodRows, prodHeaders),
        '',
        '=== DISTRIBUCIÓN DE GANANCIAS ===',
        buildCSV(profitRows, profitHeaders)
      ].join('\n');

      downloadCSV(csv, `resumen-${month}-${year}.csv`);
      toast.success('Resumen mensual exportado');
    } catch { toast.error('Error al exportar resumen'); }
    finally { setLoading(''); }
  };

  // ── Exportar PDF (HTML imprimible) ────────────────────────────────────────
  const exportPDF = async () => {
    setLoading('pdf');
    try {
      const { sales, cash } = await fetchData();
      const html = buildHTMLReport({ sales, cash }, period);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      setTimeout(() => { win?.print(); URL.revokeObjectURL(url); }, 800);
      toast.success('Reporte listo — usá Ctrl+P para guardar como PDF');
    } catch { toast.error('Error al generar reporte'); }
    finally { setLoading(''); }
  };

  return (
    <>
      <div className="page-header">
        <h1>📊 Reportes</h1>
      </div>
      <div className="page-body">

        {/* Selector de período */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Calendar size={16} color="var(--gold)"/>
            <span style={{ fontWeight: 700 }}>Período del reporte</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--gold)', minWidth: 200, textAlign: 'center' }}>
              {period}
            </div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* Opciones de exportación */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>

          {/* Pedidos CSV */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={20} color="#22c55e"/>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Pedidos del mes</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Archivo Excel (.csv)</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>
              Exporta todos los pedidos con cliente, productos, total, método de pago, zona, packaging, cupón, estado y tiempo de entrega.
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={exportOrdersCSV} disabled={loading === 'orders'}>
              <Download size={15}/> {loading === 'orders' ? 'Exportando...' : 'Exportar pedidos'}
            </button>
          </div>

          {/* Resumen CSV */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(232,184,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={20} color="var(--gold)"/>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Resumen mensual</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Archivo Excel (.csv)</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>
              Ventas por día, ranking de productos, métodos de pago y distribución de ganancias por persona.
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={exportSummaryCSV} disabled={loading === 'summary'}>
              <Download size={15}/> {loading === 'summary' ? 'Exportando...' : 'Exportar resumen'}
            </button>
          </div>

          {/* PDF */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="#ef4444"/>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Reporte ejecutivo</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>PDF imprimible</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>
              Reporte visual con métricas principales, productos, clientes y distribución de ganancias. Listo para imprimir o guardar como PDF.
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444' }} onClick={exportPDF} disabled={loading === 'pdf'}>
              <Download size={15}/> {loading === 'pdf' ? 'Generando...' : 'Generar PDF'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--dark)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--gray)' }}>
          💡 Los archivos CSV se abren directamente en Excel o Google Sheets. El PDF se genera como página HTML — usá <strong>Ctrl+P → Guardar como PDF</strong> desde tu navegador.
        </div>
      </div>
    </>
  );
}
