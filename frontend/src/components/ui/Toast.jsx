import { useCallback, useContext, useMemo, useState } from 'react';
import { createContext } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warn: TriangleAlert,
  info: Info,
};

/**
 * ToastProvider — app-wide, non-blocking notifications.
 * Wrap the app once; call useToast() anywhere to push a toast.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    ({ variant = 'info', title, message, duration = 5000 }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((list) => [...list, { id, variant, title, message }]);
      if (duration > 0) window.setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, opts) => push({ variant: 'success', message, ...opts }),
      error: (message, opts) => push({ variant: 'error', message, duration: 7000, ...opts }),
      warn: (message, opts) => push({ variant: 'warn', message, ...opts }),
      info: (message, opts) => push({ variant: 'info', message, ...opts }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || Info;
          return (
            <div key={t.id} className={`toast ${t.variant}`} role="status">
              <Icon size={18} strokeWidth={2.2} />
              <div className="toast-msg">
                {t.title ? <div className="toast-title">{t.title}</div> : null}
                <div>{t.message}</div>
              </div>
              <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss notification" type="button">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
