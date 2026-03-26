import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/gestion/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            fontFamily: 'Bebas Neue', fontSize: '4rem', lineHeight: 1,
            color: 'white', letterSpacing: '0.05em'
          }}>
            JANZ
          </div>
          <div style={{ 
            fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--gold)',
            letterSpacing: '0.2em', marginTop: -4
          }}>
            🍔 BURGERS
          </div>
          <div style={{ color: 'var(--gray)', fontSize: '0.8rem', marginTop: 8 }}>
            SISTEMA DE GESTIÓN
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.5rem', marginBottom: 24 }}>Iniciar Sesión</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@janzburgers.com"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
