import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import Stock from './pages/Stock';
import Products from './pages/Products';
import Ingredients from './pages/Ingredients';
import Clients from './pages/Clients';
import Shopping from './pages/Shopping';
import Layout from './components/Layout';
import PublicOrder from './pages/PublicOrder';
import Users from './pages/Users';
import Coupons from './pages/Coupons';
import Config from './pages/Config';
import CashRegister from './pages/CashRegister';
import Reports from './pages/Reports';
import Loyalty from './pages/Loyalty';
import Additionals from './pages/Additionals';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import ChurnJob from './pages/ChurnJob';
import InstallBanner from './components/InstallBanner';
import RejectedOrders from './pages/RejectedOrders';
import Expenses from './pages/Expenses';
import RecipeEditor from './pages/RecipeEditor';
import Prode from './pages/Prode';
import PublicProde from './pages/PublicProde';
import AdminOrder from './pages/AdminOrder';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/gestion/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/gestion/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Navigate to="/pedido" replace />} />
      <Route path="/pedido" element={<PublicOrder />} />
      <Route path="/prode-publico" element={<PublicProde />} />

      {/* Login de gestión */}
      <Route path="/gestion/login" element={user ? <Navigate to="/gestion/dashboard" /> : <Login />} />

      {/* Protegidas bajo /gestion */}
      <Route path="/gestion" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/gestion/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="cocina" element={<Kitchen />} />
        <Route path="stock" element={<ProtectedRoute adminOnly><Stock /></ProtectedRoute>} />
        <Route path="productos" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
        <Route path="ingredientes" element={<ProtectedRoute adminOnly><Ingredients /></ProtectedRoute>} />
        <Route path="clientes" element={<ProtectedRoute adminOnly><Clients /></ProtectedRoute>} />
        <Route path="compras" element={<ProtectedRoute adminOnly><Shopping /></ProtectedRoute>} />
        <Route path="usuarios" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
        <Route path="cupones" element={<ProtectedRoute adminOnly><Coupons /></ProtectedRoute>} />
        <Route path="adicionales" element={<ProtectedRoute adminOnly><Additionals /></ProtectedRoute>} />
        <Route path="fidelizacion" element={<ProtectedRoute adminOnly><Loyalty /></ProtectedRoute>} />
        <Route path="caja" element={<ProtectedRoute adminOnly><CashRegister /></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="configuracion" element={<ProtectedRoute adminOnly><Config /></ProtectedRoute>} />
        <Route path="finanzas" element={<ProtectedRoute adminOnly><Finance /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute adminOnly><Analytics /></ProtectedRoute>} />
        <Route path="churn-job" element={<ProtectedRoute adminOnly><ChurnJob /></ProtectedRoute>} />
        <Route path="rechazados" element={<ProtectedRoute adminOnly><RejectedOrders /></ProtectedRoute>} />
        <Route path="gastos" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
        <Route path="recetas" element={<ProtectedRoute adminOnly><RecipeEditor /></ProtectedRoute>} />
        <Route path="prode" element={<ProtectedRoute adminOnly><Prode /></ProtectedRoute>} />
        <Route path="tomar-pedido" element={<ProtectedRoute adminOnly><AdminOrder /></ProtectedRoute>} />
      </Route>

      {/* Cualquier ruta desconocida va a pedido */}
      <Route path="*" element={<Navigate to="/pedido" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <InstallBanner />
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
          success: { iconTheme: { primary: '#E8B84B', secondary: '#1a1a1a' } }
        }} />
      </BrowserRouter>
    </AuthProvider>
  );
}