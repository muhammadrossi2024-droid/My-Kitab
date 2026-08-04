// IndexedDB storage for user notes/flashcards taken on Quran ayahs, Mutoon
// pages, and pages of the user's own uploaded PDFs — same client-side,
// per-browser storage model as myKitabDb.js (kept as a separate database
// entirely, since notes and PDFs are different record shapes with
// different lifecycles: deleting a PDF's album un-files it, not deletes
// it, and notes need the same independent behavior for their own albums).
const DB_NAME = "quran-app-notes";
const DB_VERSION = 1;
const NOTES_STORE = "notes";
const ALBUMS_STORE = "noteAlbums";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: "id" });
        store.createIndex("sourceKey", ["source", "sourceKey"], { unique: false });
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

// note: { id, source: "quran"|"mutoon"|"library", sourceKey (surah number /
//         mutoon bookId / pdf id — scopes the sourceKey index), refKey
//         (unique per note-able unit, e.g. "2:255", "<bookId>-section-3-0",
//         "<pdfId>-page-4"), sourceLabel (human-readable reference shown in
//         My Library), excerpt (short original-text snippet), text (the
//         user's note), tags: string[], albumId: string|null, createdAt,
//         updatedAt }
export async function listNotes() {
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const all = await reqToPromise(tx.objectStore(NOTES_STORE).getAll());
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Notes for one surah/book/pdf, keyed by refKey — the shape every reader
// page wants: "does ayah 2:255 already have a note, and what does it say."
export async function listNotesBySourceKey(source, sourceKey) {
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const index = tx.objectStore(NOTES_STORE).index("sourceKey");
  const all = await reqToPromise(index.getAll(IDBKeyRange.only([source, sourceKey])));
  const byRefKey = new Map();
  for (const note of all) byRefKey.set(note.refKey, note);
  return byRefKey;
}

export async function saveNote(note) {
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  tx.objectStore(NOTES_STORE).put(note);
  await txToPromise(tx);
  return note;
}

export async function deleteNote(id) {
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  tx.objectStore(NOTES_STORE).delete(id);
  await txToPromise(tx);
}

// album: { id, name, createdAt }
export async function listNoteAlbums() {
  const db = await openDb();
  const tx = db.transaction(ALBUMS_STORE, "readonly");
  const all = await reqToPromise(tx.objectStore(ALBUMS_STORE).getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addNoteAlbum(name) {
  const db = await openDb();
  const tx = db.transaction(ALBUMS_STORE, "readwrite");
  const album = { id: makeNoteId(), name, createdAt: Date.now() };
  tx.objectStore(ALBUMS_STORE).put(album);
  await txToPromise(tx);
  return album;
}

// Deletes an album and un-files any notes that were in it (they fall back
// to "All Notes" rather than being deleted themselves) — same behavior as
// myKitabDb.js's deleteAlbum, for the same reason: deleting an album is an
// organizational action, not a data-loss one.
export async function deleteNoteAlbum(id) {
  const db = await openDb();
  const tx = db.transaction([NOTES_STORE, ALBUMS_STORE], "readwrite");
  const noteStore = tx.objectStore(NOTES_STORE);
  const allNotes = await reqToPromise(noteStore.getAll());
  for (const note of allNotes) {
    if (note.albumId === id) {
      note.albumId = null;
      noteStore.put(note);
    }
  }
  tx.objectStore(ALBUMS_STORE).delete(id);
  await txToPromise(tx);
}

export function makeNoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
