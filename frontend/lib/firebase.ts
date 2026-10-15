import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

function config() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = config();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (app) return app;
  app = getApps().length > 0 ? getApps()[0]! : initializeApp(config());
  return app;
}

export function projectLabel(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "not configured";
}

/** Analytics is browser-only, opt-in, and best-effort; never throws.
 *
 *  Off by default: initializing Analytics fires a Firebase Installations
 *  request that fails with 401 "API keys are not supported by this API"
 *  when the browser key isn't allowed for firebaseinstallations.googleapis.com.
 *  Set NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED=true to re-enable — and if the
 *  401 returns, allow the Installations API for the key in
 *  Google Cloud Console → APIs & Services → Credentials → API restrictions.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED !== "true") return;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return;
  try {
    void import("firebase/analytics").then(({ getAnalytics, isSupported }) =>
      isSupported()
        .then((ok) => {
          if (ok) {
            try {
              getAnalytics(firebaseApp);
            } catch {
              // Analytics is best-effort; a failing Installations
              // request must never surface to the user.
            }
          }
        })
        .catch(() => {})
    );
  } catch {
    // Dynamic import itself failed — ignore, analytics is optional.
  }
}
