/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';

const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

let toastQueue = [];
let listeners = [];

export function showToast(message, type = 'info', duration = 4000) {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, duration };
  toastQueue = [...toastQueue, toast];
  listeners.forEach((fn) => fn([...toastQueue]));
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn([...toastQueue]));
  }, duration);
}

export function dismissToast(id) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  listeners.forEach((fn) => fn([...toastQueue]));
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (newToasts) => setToasts(newToasts);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          style={{ '--duration': `${toast.duration}ms` }}
        >
          <span className="toast__icon">
            {ICONS[toast.type]}
          </span>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__close" onClick={() => dismissToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
