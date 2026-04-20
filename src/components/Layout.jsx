import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShoppingBag, ChefHat, Package, Beef, Users,
  ShoppingCart, LogOut, BookOpen, UserCog, Menu, X, Ticket,
  Settings, AlertTriangle, Wallet, BarChart2, Bell, Star, Utensils, PiggyBank, Brain, Smartphone, XCircle, Receipt, FlaskConical, Trophy, Phone, MessageSquare, Send, DollarSign, MessageCircle
} from 'lucide-react';
import API from '../utils/api';

const navGroups = [
  {
    label: 'Operaciones',
    items: [
      { to: '/gestion/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
      { to: '/gestion/pedidos',     label: 'Pedidos',          icon: ShoppingBag },
      { to: '/gestion/cocina',      label: 'Cocina',           icon: ChefHat },
      { to: '/gestion/tomar-pedido', label: 'Tomar Pedido',    icon: Phone },
    ]
  },
  {
    label: 'Gestión',
    adminOnly: true,
    items: [
      { to: '/gestion/stock',        label: 'Stock',            icon: Package },
      { to: '/gestion/productos',    label: 'Escandallo',       icon: Beef },
      { to: '/gestion/ingredientes', label: 'Ingredientes',     icon: BookOpen },
      { to: '/gestion/compras',      label: 'Lista de Compras', icon: ShoppingCart },
      { to: '/gestion/adicionales',  label: 'Adicionales',      icon: Utensils },
    ]
  },
  {
    label: 'Clientes',
    adminOnly: true,
    items: [
      { to: '/gestion/clientes',     label: 'Clientes',         icon: Users },
      { to: '/gestion/cupones',      label: 'Cuponera',         icon: Ticket },
      { to: '/gestion/fidelizacion', label: 'Fidelización',     icon: Star },
      { to: '/gestion/prode',        label: 'Prode Mundial',    icon: Trophy },
    ]
  },
  {
    label: 'Finanzas & Datos',
    adminOnly: true,
    items: [
      { to: '/gestion/caja',         label: 'Caja',             icon: Wallet },
      { to: '/gestion/caja-global',  label: 'Caja Global',      icon: DollarSign },
      { to: '/gestion/finanzas',     label: 'Finanzas',         icon: PiggyBank },
      { to: '/gestion/reportes',     label: 'Reportes',         icon: BarChart2 },
      { to: '/gestion/analytics',    label: 'Inteligencia',     icon: Brain },
      { to: '/gestion/churn-job',    label: 'Alerta de Churn',  icon: Smartphone },
      { to: '/gestion/rechazados',   label: 'Rechazados',       icon: XCircle },
    ]
  },
  {
    label: 'Sistema',
    adminOnly: true,
    items: [
      { to: '/gestion/usuarios',      label: 'Usuarios',         icon: UserCog },
      { to: '/gestion/gastos',        label: 'Gastos Variables', icon: Receipt },
      { to: '/gestion/recetas',       label: 'Editor de Recetas',icon: FlaskConical },
      { to: '/gestion/configuracion', label: 'Configuración',    icon: Settings },
      { to: '/gestion/whatsapp',      label: 'Mensajes WA',      icon: MessageSquare },
      { to: '/gestion/push',          label: 'Notif. Push',      icon: Send },
      { to: '/gestion/resenas',       label: 'Reseñas',           icon: MessageCircle },
    ]
  },
];

function AlertsPanel({ onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/stock/alerts')
      .then(r => setAlerts(r.data))
      .finally(() => setLoading(false));
  }, []);

  const unseen = alerts.filter(a => !a.alertSeen);
  const seen   = alerts.filter(a => a.alertSeen);

  const dismiss = async (id) => {
    await API.put(`/stock/${id}/dismiss`);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, alertSeen: true } : a));
  };

  const dismissAll = async () => {
    await API.put('/stock/alerts/dismiss-all');
    setAlerts(prev => prev.map(a => ({ ...a, alertSeen: true })));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
      background: '#111', borderLeft: '1px solid var(--border)',
      zIndex: 300, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="var(--gold)" /> Alertas de Stock
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>
            {unseen.length > 0 ? `${unseen.length} sin revisar` : 'Todo revisado ✓'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unseen.length > 0 && (
            <button onClick={dismissAll}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--gray)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.72rem' }}>
              Marcar todas
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600 }}>Sin alertas</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Todo el stock está sobre el mínimo</div>
          </div>
        ) : (
          <>
            {unseen.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Sin revisar ({unseen.length})
                </div>
                {unseen.map(alert => (
                  <AlertItem key={alert._id} alert={alert} onDismiss={() => dismiss(alert._id)} />
                ))}
              </div>
            )}
            {seen.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Ya revisadas ({seen.length})
                </div>
                {seen.map(alert => (
                  <AlertItem key={alert._id} alert={alert} seen />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        {/* ← CAMBIO: /stock → /gestion/stock */}
        <NavLink to="/gestion/stock" onClick={onClose}
          style={{ display: 'block', textAlign: 'center', background: 'var(--gold)', color: '#000', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
          Ir al panel de Stock →
        </NavLink>
      </div>
    </div>
  );
}

function AlertItem({ alert, onDismiss, seen }) {
  const isOut  = alert.status === 'out';
  const color  = isOut ? '#ef4444' : '#f59e0b';
  const bg     = isOut ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
  const border = isOut ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';

  return (
    <div style={{
      background: seen ? 'transparent' : bg,
      border: `1px solid ${seen ? 'var(--border)' : border}`,
      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      opacity: seen ? 0.55 : 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color, background: `${color}20`, padding: '1px 7px', borderRadius: 100 }}>
              {isOut ? '🔴 Sin stock' : '🟡 Stock bajo'}
            </span>
            {alert.ingredient?.priority === 'A' && (
              <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>CRÍTICO</span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{alert.ingredient?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>
            {alert.currentStock} / {alert.minimumStock} {alert.unit}
            {alert.ingredient?.category && ` · ${alert.ingredient.category}`}
          </div>
        </div>
        {!seen && onDismiss && (
          <button onClick={onDismiss}
            style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: '2px 4px', marginLeft: 8, fontSize: '1rem', lineHeight: 1 }}
            title="Marcar como vista">
            ✓
          </button>
        )}
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  const toggleCollapse = () => setSidebarCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('sidebarCollapsed', next); } catch {}
    return next;
  });

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAlerts = async () => {
      try {
        const res = await API.get('/stock/alerts');
        const alerts = res.data;
        setLowStockCount(alerts.length);
        setUnseenCount(alerts.filter(a => !a.alertSeen).length);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // ← CAMBIO: /login → /gestion/login
  const handleLogout = () => { logout(); navigate('/gestion/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {showAlerts && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }}
          onClick={() => setShowAlerts(false)} />
      )}
      {showAlerts && <AlertsPanel onClose={() => setShowAlerts(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!sidebarCollapsed && (
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: 'white' }}>
              JANZ<span style={{ color: 'var(--gold)' }}>BURGERS</span>
            </h2>
          )}
          {/* Mobile: close button / Desktop: collapse toggle */}
          <button onClick={window.innerWidth < 768 ? closeSidebar : toggleCollapse}
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', display: 'flex', padding: 4, marginLeft: sidebarCollapsed ? 'auto' : undefined }}>
            {window.innerWidth < 768 ? <X size={20} /> : sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        {isAdmin && unseenCount > 0 && (
          <button onClick={() => { setShowAlerts(true); closeSidebar(); }}
            style={{ margin: '0 12px 12px', width: 'calc(100% - 24px)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
            <AlertTriangle size={14} color="#ef4444" />
            <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
              {unseenCount} alerta{unseenCount > 1 ? 's' : ''} de stock
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--gray)' }}>Ver →</span>
          </button>
        )}

        <nav className="sidebar-nav">
          {navGroups.map(group => {
            if (group.adminOnly && !isAdmin) return null;
            return (
              <div key={group.label}>
                {!sidebarCollapsed && <div className="nav-section-label">{group.label}</div>}
                {group.items.map(item => {
                  if (item.adminOnly && !isAdmin) return null;
                  const showBadge = item.to === '/gestion/stock' && lowStockCount > 0;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeSidebar}
                      style={{ position: 'relative' }}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon size={16} />
                      {!sidebarCollapsed && item.label}
                      {!sidebarCollapsed && showBadge && (
                        <span style={{ marginLeft: 'auto', background: unseenCount > 0 ? '#ef4444' : '#f59e0b', color: 'white', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px' }}>
                          {lowStockCount}
                        </span>
                      )}
                      {sidebarCollapsed && showBadge && (
                        <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: unseenCount > 0 ? '#ef4444' : '#f59e0b' }} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button className="btn-icon" onClick={handleLogout} title="Salir"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <span className="mobile-topbar-title">🍔 JANZ</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && unseenCount > 0 && (
              <button onClick={() => setShowAlerts(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
                <Bell size={20} color="#ef4444" />
                <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '0.6rem', fontWeight: 700, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unseenCount}
                </span>
              </button>
            )}
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}