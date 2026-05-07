'use client';

import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'loading';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  loading: (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error:   'bg-red-500/10 border-red-500/30 text-red-400',
  loading: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4 seconds (not for loading)
    if (type !== 'loading') {
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }
    return () => clearTimeout(showTimer);
  }, [type, onDismiss]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold
        shadow-2xl backdrop-blur-sm transition-all duration-300
        ${STYLES[type]}
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <span className="shrink-0">{ICONS[type]}</span>
      <span className="text-white/90 text-xs font-medium">{message}</span>
      {type !== 'loading' && (
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
          className="shrink-0 ml-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Toast container — place once in your layout
export function ToastContainer({ toasts, removeToast }: {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

// Hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = (message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const updateToast = (id: string, message: string, type: ToastType) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, message, type } : t));
  };

  return { toasts, addToast, removeToast, updateToast };
}
