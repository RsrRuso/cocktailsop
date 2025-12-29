// Handles the "Importing a module script failed" / chunk-load blank screen issue
// by clearing any stale Service Worker + caches and forcing a one-time reload.

const RECOVERY_FLAG = "sv__chunk_recovery_attempted";
const DEV_CLEANUP_FLAG = "sv__dev_sw_cleanup_done";

function isLovablePreviewHost() {
  // Lovable preview URLs commonly look like: id-preview--<id>.lovable.app
  const host = window.location.hostname;
  return host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");
}

function isChunkLoadError(message: string) {
  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk \d+ failed|ChunkLoadError/i.test(
    message
  );
}

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
}

async function clearAllCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

function forceReloadWithCacheBust() {
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.replace(url.toString());
}

async function recoverFromStaleCache() {
  if (sessionStorage.getItem(RECOVERY_FLAG)) return;
  sessionStorage.setItem(RECOVERY_FLAG, "1");

  try {
    await unregisterServiceWorkers();
    await clearAllCaches();
  } finally {
    forceReloadWithCacheBust();
  }
}

export function initChunkLoadRecovery() {
  // In dev OR Lovable preview, remove any previously-registered SW.
  // SW can cache Vite chunks and prevent seeing the latest updates.
  const shouldCleanupForPreview = !import.meta.env.PROD || isLovablePreviewHost();

  if (shouldCleanupForPreview && !sessionStorage.getItem(DEV_CLEANUP_FLAG)) {
    sessionStorage.setItem(DEV_CLEANUP_FLAG, "1");
    void (async () => {
      try {
        await unregisterServiceWorkers();
        await clearAllCaches();
      } catch {
        // ignore
      }
    })();
  }

  window.addEventListener(
    "error",
    (e) => {
      const message = (e as ErrorEvent)?.message || "";
      if (isChunkLoadError(message)) void recoverFromStaleCache();
    },
    true
  );

  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = (e as PromiseRejectionEvent).reason;
    const message = reason?.message ? String(reason.message) : String(reason || "");
    if (isChunkLoadError(message)) void recoverFromStaleCache();
  });
}
