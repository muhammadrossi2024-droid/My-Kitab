// IndexedDB storage for the My Kitab personal library — each record holds
// the uploaded PDF's blob plus its extracted per-page text (so search never
// has to re-parse the PDF), stored client-side per-browser like the app's
// existing localStorage progress/settings and Cache Storage offline audio.
const DB_NAME = "quran-app-my-kitab";
const DB_VERSION = 1;
const STORE = "pdfs";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txToPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// record: { id, title, name, size, addedAt, pageCount, blob, pages: [{ pageNumber, text }] }
export async function addPdf(record) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record);
  await txToPromise(tx);
}

// Metadata only (no blob/pages) — cheap to load for the list view.
export async function listPdfs() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const all = await reqToPromise(tx.objectStore(STORE).getAll());
  return all
    .map(({ id, title, name, size, addedAt, pageCount }) => ({
      id,
      title,
      name,
      size,
      addedAt,
      pageCount,
    }))
    .sort((a, b) => b.addedAt - a.addedAt);
}

// Full records including extracted page text, for search only.
export async function getAllPdfsFull() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  return reqToPromise(tx.objectStore(STORE).getAll());
}

// One full record (blob + pages) — for opening a single PDF in the viewer.
export async function getPdf(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  return reqToPromise(tx.objectStore(STORE).get(id));
}

export async function deletePdf(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txToPromise(tx);
}

// crypto.randomUUID() is only defined in secure contexts (https/localhost) —
// this falls back to a plain random ID so adding a PDF can't fail outright
// just because it's opened over e.g. a plain-http LAN address.
export function makePdfId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
