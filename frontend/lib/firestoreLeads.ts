import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";
import type { Lead } from "./types";

async function db() {
  if (!isFirebaseConfigured()) return null;
  const { getFirestore } = await import("firebase/firestore");
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getFirestore(firebaseApp) : null;
}

/** Mirror a lead into Firestore so it survives backend restarts. Best-effort.
 *  created_at (date + time) is always written so new leads stay identifiable. */
export async function persistLead(lead: Lead): Promise<void> {
  const firestore = await db();
  if (!firestore) return;
  await setDoc(doc(collection(firestore, "leads"), lead.id), {
    ...lead,
    created_at: lead.created_at || new Date().toISOString(),
  });
}

/** Remove a lead mirror. Best-effort. */
export async function forgetLead(id: string): Promise<void> {
  const firestore = await db();
  if (!firestore) return;
  await deleteDoc(doc(collection(firestore, "leads"), id));
}

/** All mirrored leads (used to restore anything the backend forgot). */
export async function fetchStoredLeads(): Promise<Lead[]> {
  const firestore = await db();
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, "leads"));
  const rows: Lead[] = [];
  snap.forEach((d) => {
    const data = d.data() as Partial<Lead>;
    if (data && typeof data.id === "string") rows.push({ ...(data as Lead), id: d.id });
  });
  return rows;
}

/** Newest mirrored leads first, capped so the chat context stays small. */
export async function fetchRecentLeads(limit = 20): Promise<Lead[]> {
  const rows = await fetchStoredLeads();
  return rows
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(0, Math.max(1, limit));
}
