/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';

const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
const COLORS = {
  success: 'var(--color-green)',
  error: 'var(--color-red)',
  info: 'var(--color-teal)',
  warning: 'var(--color-yellow)',
};

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
          className="toast-item"
          style={{ '--toast-color': COLORS[toast.type] }}
        >
          <span className="toast-icon" style={{ color: COLORS[toast.type] }}>
            {ICONS[toast.type]}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dismissToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
