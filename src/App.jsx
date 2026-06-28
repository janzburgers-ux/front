import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from "react";
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import InstallBanner from './components/InstallBanner';

// ── Páginas: carga diferida (code-splitting) ───────────────────────────────
// Antes estos 30 imports eran estáticos arriba del archivo, lo que obligaba
// al navegador a descargar TODAS las páginas (admin + público) apenas se
// abría cualquier ruta, incluso /pedido. Con React.lazy, cada página se
// descarga recién cuando el usuario navega a esa ruta puntual.
const PublicOrder            = lazy(() => import('./pages/PublicOrder'));
const PublicProde            = lazy(() => import('./pages/PublicProde'));
const PrediccionesPublicas   = lazy(() => import('./pages/PrediccionesPublicas'));
const PublicReview           = lazy(() => import('./pages/PublicReview'));
const Login                  = lazy(() => import('./pages/Login'));

const Dashboard               = lazy(() => import('./pages/Dashboard'));
const Orders                  = lazy(() => import('./pages/Orders'));
const Kitchen                 = lazy(() => import('./pages/Kitchen'));
const Stock                   = lazy(() => import('./pages/Stock'));
const Products                = lazy(() => import('./pages/Products'));
const Ingredients             = lazy(() => import('./pages/Ingredients'));
const Clients                 = lazy(() => import('./pages/Clients'));
const Shopping                = lazy(() => import('./pages/Shopping'));
const Users                   = lazy(() => import('./pages/Users'));
const Coupons                 = lazy(() => import('./pages/Coupons'));
const Config                  = lazy(() => import('./pages/Config'));
const CashRegister            = lazy(() => import('./pages/CashRegister'));
const Reports                 = lazy(() => import('./pages/Reports'));
const Loyalty                 = lazy(() => import('./pages/Loyalty'));
const Additionals             = lazy(() => import('./pages/Additionals'));
const Promos                  = lazy(() => import('./pages/Promos'));
const Finance                 = lazy(() => import('./pages/Finance'));
const Analytics               = lazy(() => import('./pages/Analytics'));
const ChurnJob                = lazy(() => import('./pages/ChurnJob'));
const RejectedOrders          = lazy(() => import('./pages/RejectedOrders'));
const Expenses                = lazy(() => import('./pages/Expenses'));
const RecipeEditor            = lazy(() => import('./pages/RecipeEditor'));
const Prode                   = lazy(() => import('./pages/Prode'));
const AdminOrder               = lazy(() => import('./pages/AdminOrder'));
const CajaGlobal              = lazy(() => import('./pages/CajaGlobal'));
const WhatsappMessages         = lazy(() => import('./pages/WhatsappMessages'));
const PushNotifications        = lazy(() => import('./pages/PushNotifications'));
const Reviews                  = lazy(() => import('./pages/Reviews'));
const Broadcast                = lazy(() => import('./pages/Broadcast'));

// ✅ SOLO esto
import { trackPageView } from "./utils/analytics";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/gestion/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/gestion/dashboard" replace />;

  return children;
}

// Fallback mientras se descarga el chunk de la página. Reutiliza la misma
// pantalla de carga que ya existía para rutas protegidas, así no hay
// ningún cambio visual ni de comportamiento para el usuario.
function PageFallback() {
  return <div className="loading-screen"><div className="spinner" /></div>;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  // 🔥 Trackeo de navegación (clave para React)
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Navigate to="/pedido" replace />} />
        <Route path="/pedido" element={<PublicOrder />} />
        <Route path="/prode-publico" element={<PublicProde />} />
        <Route path="/predicciones-publicas" element={<PrediccionesPublicas />} />
        <Route path="/resena/:publicCode" element={<PublicReview />} />

        {/* Login */}
        <Route path="/gestion/login" element={user ? <Navigate to="/gestion/dashboard" /> : <Login />} />

        {/* Privadas */}
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
          <Route path="promos" element={<ProtectedRoute adminOnly><Promos /></ProtectedRoute>} />
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
          <Route path="caja-global" element={<ProtectedRoute adminOnly><CajaGlobal /></ProtectedRoute>} />
          <Route path="whatsapp" element={<ProtectedRoute adminOnly><WhatsappMessages /></ProtectedRoute>} />
          <Route path="push" element={<ProtectedRoute adminOnly><PushNotifications /></ProtectedRoute>} />
          <Route path="resenas" element={<ProtectedRoute adminOnly><Reviews /></ProtectedRoute>} />
          <Route path="difusion" element={<ProtectedRoute adminOnly><Broadcast /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/pedido" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <InstallBanner />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
            success: { iconTheme: { primary: '#E8B84B', secondary: '#1a1a1a' } }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
