import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('janz_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('janz_token');
    if (token) {
      API.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('janz_token'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('janz_token', res.data.token);
    localStorage.setItem('janz_user', JSON.stringify(res.data.user));
    localStorage.setItem('janz_login_time', Date.now().toString());
    setUser(res.data.user);
    return res.data.user;
  };

  // Auto-logout after 24h inactivity
  useEffect(() => {
    const check = () => {
      const loginTime = localStorage.getItem('janz_login_time');
      if (loginTime && Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('janz_token');
        localStorage.removeItem('janz_user');
        localStorage.removeItem('janz_login_time');
        setUser(null);
      }
    };
    check();
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    localStorage.removeItem('janz_token');
    localStorage.removeItem('janz_user');
    localStorage.removeItem('janz_login_time');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin', isKitchen: user?.role === 'kitchen' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
