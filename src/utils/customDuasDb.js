// Firestore-backed storage for a Premium user's own custom duas — the one
// piece of user data in this app that's deliberately NOT per-browser
// IndexedDB (see notesDb.js/myKitabDb.js for that pattern): the spec calls
// for these to follow the signed-in account across sessions and devices,
// so they live under users/{uid}/customDuas in Firestore instead.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";

function duasCollection(uid) {
  return collection(db, "users", uid, "customDuas");
}

// Firestore's write/listen channel is a persistent long-polling connection —
// on a network that silently breaks that connection (some restrictive
// proxies/firewalls), the SDK's promise can hang indefinitely instead of
// rejecting. Racing every call against a timeout means a bad network shows
// the user a real error instead of a spinner that never resolves.
function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("This is taking too long — check your connection and try again.")), ms)
    ),
  ]);
}

// dua: { id, arabic, english, createdAt, updatedAt }
export async function listCustomDuas(uid) {
  if (!db) throw new Error("Firestore isn't available right now.");
  const q = query(duasCollection(uid), orderBy("createdAt", "desc"));
  const snap = await withTimeout(getDocs(q));
  return snap.docs.map((d) => d.data());
}

export async function saveCustomDua(uid, dua) {
  if (!db) throw new Error("Firestore isn't available right now.");
  await withTimeout(setDoc(doc(duasCollection(uid), dua.id), dua));
  return dua;
}

export async function deleteCustomDua(uid, id) {
  if (!db) throw new Error("Firestore isn't available right now.");
  await withTimeout(deleteDoc(doc(duasCollection(uid), id)));
}

export function makeCustomDuaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dua-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
