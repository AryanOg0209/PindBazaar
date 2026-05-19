export const APP_DATA_CHANGED = 'pindbazaar:data-changed';

export function emitAppDataChanged(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_DATA_CHANGED, {
    detail: {
      at: Date.now(),
      ...detail,
    },
  }));
}

export function onAppDataChanged(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(APP_DATA_CHANGED, listener);
  return () => window.removeEventListener(APP_DATA_CHANGED, listener);
}
