// Register service worker for offline caching
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // SW registered
        })
        .catch(() => {
          // SW registration failed
        });
    });
  }
};
