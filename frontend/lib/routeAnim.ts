// Shared route-animation signals. One popstate listener for the whole app:
// the page template uses it to play the shorter back/forward variant
// (250ms, subtler). Display text and metadata only — no logic.

let popPending = false;
let lastPopAt = 0;
let listening = false;

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    popPending = true;
    lastPopAt = Date.now();
  });
}

// True once if a back/forward navigation caused this mount. Consumes the flag.
export function consumePopNav(): boolean {
  ensureListening();
  const wasPop = popPending;
  popPending = false;
  return wasPop;
}

// True shortly after a back/forward press.
export function wasRecentPop(windowMs = 2500): boolean {
  ensureListening();
  return Date.now() - lastPopAt < windowMs;
}
