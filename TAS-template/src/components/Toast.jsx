import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const bgColor = (type) => {
    if (type === 'error') return 'var(--danger)';
    if (type === 'warn') return 'var(--warn)';
    return 'var(--ok)';
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: bgColor(t.type), color: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'auto', minWidth: 220, maxWidth: 340,
            animation: 'toast-in 0.2s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
