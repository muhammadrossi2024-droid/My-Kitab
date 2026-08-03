// IndexedDB storage for the My Kitab personal library — each record holds
// the uploaded PDF's blob plus its extracted per-page text (so search never
// has to re-parse the PDF), stored client-side per-browser like the app's
// existing localStorage progress/settings and Cache Storage offline audio.
const DB_NAME = "quran-app-my-kitab";
const DB_VERSION = 2; // v2 added the "albums" store (see ALBUMS_STORE below)
const STORE = "pdfs";
const ALBUMS_STORE = "albums";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ALBUMS_STORE)) {
        db.createObjectStore(ALBUMS_STORE, { keyPath: "id" });
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

// record: { id, title, name, size, addedAt, pageCount, albumId, blob,
//           coverThumb, pages: [{ pageNumber, text }] }
// albumId is null for a PDF not filed into any album. coverThumb is a small
// PNG Blob of the rendered first page, or null if it couldn't be generated.
export async function addPdf(record) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record);
  await txToPromise(tx);
}

// Metadata only (no pages text) — cheap-ish to load for the list view.
// coverThumb (a small Blob) is included since the list needs it to render
// thumbnails; the far larger original PDF `blob` is deliberately excluded.
export async function listPdfs() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const all = await reqToPromise(tx.objectStore(STORE).getAll());
  return all
    .map(({ id, title, name, size, addedAt, pageCount, albumId, coverThumb }) => ({
      id,
      title,
      name,
      size,
      addedAt,
      pageCount,
      albumId: albumId ?? null,
      coverThumb: coverThumb ?? null,
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

// Moves a PDF into an album, or back to "All PDFs" when albumId is null.
export async function setPdfAlbum(id, albumId) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const record = await reqToPromise(store.get(id));
  if (record) {
    record.albumId = albumId;
    store.put(record);
  }
  await txToPromise(tx);
}

// album: { id, name, createdAt }
export async function listAlbums() {
  const db = await openDb();
  const tx = db.transaction(ALBUMS_STORE, "readonly");
  const all = await reqToPromise(tx.objectStore(ALBUMS_STORE).getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addAlbum(name) {
  const db = await openDb();
  const tx = db.transaction(ALBUMS_STORE, "readwrite");
  const album = { id: makePdfId(), name, createdAt: Date.now() };
  tx.objectStore(ALBUMS_STORE).put(album);
  await txToPromise(tx);
  return album;
}

export async function renameAlbum(id, name) {
  const db = await openDb();
  const tx = db.transaction(ALBUMS_STORE, "readwrite");
  const store = tx.objectStore(ALBUMS_STORE);
  const album = await reqToPromise(store.get(id));
  if (album) {
    album.name = name;
    store.put(album);
  }
  await txToPromise(tx);
}

// Deletes an album and un-files any PDFs that were in it (they fall back to
// "All PDFs" rather than being deleted themselves).
export async function deleteAlbum(id) {
  const db = await openDb();
  const tx = db.transaction([STORE, ALBUMS_STORE], "readwrite");
  const pdfStore = tx.objectStore(STORE);
  const allPdfs = await reqToPromise(pdfStore.getAll());
  for (const record of allPdfs) {
    if (record.albumId === id) {
      record.albumId = null;
      pdfStore.put(record);
    }
  }
  tx.objectStore(ALBUMS_STORE).delete(id);
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
