import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }
    if (localStorage.getItem('janz_pwa_dismissed')) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setShow(false); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setShow(false); setInstalled(true); }
    setPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('janz_pwa_dismissed', '1');
  };

  if (!show || installed) return null;

  if (isIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 20, left: 16, right: 16,
        background: 'linear-gradient(135deg, #13131f, #1a1a2e)',
        border: '1px solid rgba(232,184,75,0.3)',
        borderRadius: 16, padding: '14px 16px',
        zIndex: 9000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <img src="/favicon-logo.png" alt="Janz" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>Instalá Janz Burgers</div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b8a', marginTop: 2 }}>Accedé más rápido desde tu pantalla de inicio</div>
          </div>
          <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', fontSize: '0.8rem', color: '#ccc', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: 'rgba(232,184,75,0.15)', color: '#E8B84B', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>1</span>
            Tocá el botón <Share size={13} style={{ color: '#E8B84B', margin: '0 3px' }} /> <strong style={{ color: 'white' }}>Compartir</strong> en Safari
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(232,184,75,0.15)', color: '#E8B84B', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>2</span>
            Seleccioná <strong style={{ color: 'white' }}>"Agregar a pantalla de inicio"</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 16, right: 16,
      background: 'linear-gradient(135deg, #13131f, #1a1a2e)',
      border: '1px solid rgba(232,184,75,0.3)',
      borderRadius: 16, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 9000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)'
    }}>
      <img src="/favicon-logo.png" alt="Janz" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>Instalá Janz Burgers</div>
        <div style={{ fontSize: '0.75rem', color: '#6b6b8a', marginTop: 2 }}>Accedé más rápido desde tu pantalla de inicio</div>
      </div>
      <button onClick={handleInstall} style={{
        background: 'linear-gradient(135deg, #c49b35, #E8B84B)',
        border: 'none', borderRadius: 10, padding: '8px 14px',
        fontWeight: 700, fontSize: '0.82rem', color: '#000',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        flexShrink: 0, whiteSpace: 'nowrap'
      }}>
        <Download size={13} /> Instalar
      </button>
      <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}