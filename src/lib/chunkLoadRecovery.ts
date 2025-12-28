// Handles the "Importing a module script failed" / chunk-load blank screen issue
// by clearing any stale Service Worker + caches and forcing a one-time reload.

const RECOVERY_FLAG = "sv__chunk_recovery_attempted";
const DEV_CLEANUP_FLAG = "sv__dev_sw_cleanup_done";
const RECOVERY_LAST_TS = "sv__chunk_recovery_last_ts";
const RECOVERY_COUNT = "sv__chunk_recovery_count";
const RECOVERY_COOLDOWN_MS = 30_000;
const RECOVERY_MAX_WITHIN_COOLDOWN = 2;

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

function canAttemptRecoveryNow() {
  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(RECOVERY_LAST_TS) || 0);
    const count = Number(localStorage.getItem(RECOVERY_COUNT) || 0);

    if (last && now - last < RECOVERY_COOLDOWN_MS && count >= RECOVERY_MAX_WITHIN_COOLDOWN) {
      return false;
    }

    // If we're outside the cooldown window, reset the count
    const nextCount = last && now - last < RECOVERY_COOLDOWN_MS ? count + 1 : 1;
    localStorage.setItem(RECOVERY_LAST_TS, String(now));
    localStorage.setItem(RECOVERY_COUNT, String(nextCount));
    return true;
  } catch {
    return true; // fail-open
  }
}

async function recoverFromStaleCache() {
  // Guard against infinite reload loops (especially on mobile Safari)
  if (!canAttemptRecoveryNow()) return;

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
  // In dev/preview, make sure any previously-registered SW is removed
  // (it can cache Vite chunks and cause blank screens).
  if (!import.meta.env.PROD && !sessionStorage.getItem(DEV_CLEANUP_FLAG)) {
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
