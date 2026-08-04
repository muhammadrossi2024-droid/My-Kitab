import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Folder, Trash2 } from "lucide-react";
import {
  addAlbum,
  addPdf,
  deleteAlbum,
  deletePdf,
  listAlbums,
  listPdfs,
  makePdfId,
  setPdfAlbum,
} from "../utils/myKitabDb.js";
import { addNoteAlbum, deleteNoteAlbum, listNoteAlbums, listNotes } from "../utils/notesDb.js";
import { extractPdfPages } from "../utils/pdfExtract.js";
import { searchMyKitab } from "../utils/myKitabSearch.js";
import SectionHero from "../components/SectionHero.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

// Fallback for when the PDF has no usable /Title metadata — cleans up a raw
// filename into something readable instead of showing it as-is: exported
// filenames almost always use hyphens/underscores as word separators, not
// literal punctuation, and slug-style all-lowercase names read better
// title-cased. Filenames that already mix case (e.g.
// "A-General-Advice-to-All-Muslims-A5-Ibn-Baz") already encode their own
// real capitalization, so that case is left alone rather than reflowed.
function titleFromFilename(name) {
  let title = (name || "").replace(/\.pdf$/i, "").trim();
  title = title.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (title && title === title.toLowerCase()) {
    title = title.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return title;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Renders a PDF's stored cover Blob as an <img>, managing its object URL's
// lifetime (created on mount/blob-change, revoked on cleanup) so the list
// doesn't leak a URL per PDF. Falls back to a generic document icon for
// PDFs uploaded before this feature existed, or where the first page
// couldn't be rendered.
function PdfCoverThumb({ blob }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) {
    return (
      <div className="mykitab-pdf-thumb mykitab-pdf-thumb-placeholder" aria-hidden="true">
        <FileText className="mykitab-pdf-thumb-icon" />
      </div>
    );
  }
  return <img src={url} alt="" className="mykitab-pdf-thumb" />;
}

export default function MyKitab() {
  const [pdfs, setPdfs] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null); // { current, total } while uploading
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);

  const [albums, setAlbums] = useState([]);
  const [activeAlbumId, setActiveAlbumId] = useState(null); // null = "All PDFs"
  const [showNewAlbumForm, setShowNewAlbumForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null); // the pdf record pending confirmation
  const [deletePdfAlbumTarget, setDeletePdfAlbumTarget] = useState(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const [notes, setNotes] = useState([]);
  const [noteAlbums, setNoteAlbums] = useState([]);
  const [activeNoteAlbumId, setActiveNoteAlbumId] = useState(null); // null = "All Notes"
  const [showNewNoteAlbumForm, setShowNewNoteAlbumForm] = useState(false);
  const [newNoteAlbumName, setNewNoteAlbumName] = useState("");
  const [noteTagFilter, setNoteTagFilter] = useState("");
  const [deleteNoteAlbumTarget, setDeleteNoteAlbumTarget] = useState(null);

  async function refreshList() {
    setPdfs(await listPdfs());
    setLoadingList(false);
  }

  async function refreshAlbums() {
    setAlbums(await listAlbums());
  }

  async function refreshNotes() {
    setNotes(await listNotes());
  }

  async function refreshNoteAlbums() {
    setNoteAlbums(await listNoteAlbums());
  }

  useEffect(() => {
    refreshList();
    refreshAlbums();
    refreshNotes();
    refreshNoteAlbums();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const res = await searchMyKitab(query);
      if (requestIdRef.current === requestId) {
        setResults(res);
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const errors = [];
    setUploadErrors([]);
    setUploadStatus({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus({ current: i + 1, total: files.length });
      const label = file.name && file.name.trim() ? file.name : "This file";
      try {
        const buffer = await file.arrayBuffer();
        const { pages, metadataTitle, coverThumb } = await extractPdfPages(buffer);
        // The PDF's own /Title metadata is the real, author-set title when
        // present — prefer it over a filename guess, which was previously
        // (and wrongly) checked first, so metadata never actually won.
        const title = metadataTitle || titleFromFilename(file.name) || "Untitled PDF";
        await addPdf({
          id: makePdfId(),
          title,
          name: file.name && file.name.trim() ? file.name : `${title}.pdf`,
          size: file.size,
          addedAt: Date.now(),
          pageCount: pages.length,
          // Uploading while viewing a specific album files the new PDF
          // straight into it, rather than always landing in "All PDFs".
          albumId: activeAlbumId,
          blob: file, // the original File, stored as-is — no re-encoding/compression
          coverThumb,
          pages,
        });
      } catch (err) {
        errors.push(`${label}: ${err?.message || "couldn't be read as a PDF"}`);
      }
    }

    setUploadStatus(null);
    setUploadErrors(errors);
    await refreshList();
  }

  function requestDelete(pdf) {
    setDeleteTarget(pdf);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deletePdf(deleteTarget.id);
    setDeleteTarget(null);
    await refreshList();
  }

  async function handleCreateAlbum(e) {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;
    await addAlbum(name);
    setNewAlbumName("");
    setShowNewAlbumForm(false);
    await refreshAlbums();
  }

  async function handleMovePdf(pdfId, albumId) {
    await setPdfAlbum(pdfId, albumId || null);
    await refreshList();
  }

  async function confirmDeletePdfAlbum() {
    if (!deletePdfAlbumTarget) return;
    await deleteAlbum(deletePdfAlbumTarget.id);
    if (activeAlbumId === deletePdfAlbumTarget.id) setActiveAlbumId(null);
    setDeletePdfAlbumTarget(null);
    await refreshAlbums();
    await refreshList();
  }

  async function handleCreateNoteAlbum(e) {
    e.preventDefault();
    const name = newNoteAlbumName.trim();
    if (!name) return;
    await addNoteAlbum(name);
    setNewNoteAlbumName("");
    setShowNewNoteAlbumForm(false);
    await refreshNoteAlbums();
  }

  async function confirmDeleteNoteAlbum() {
    if (!deleteNoteAlbumTarget) return;
    await deleteNoteAlbum(deleteNoteAlbumTarget.id);
    if (activeNoteAlbumId === deleteNoteAlbumTarget.id) setActiveNoteAlbumId(null);
    setDeleteNoteAlbumTarget(null);
    await refreshNoteAlbums();
    await refreshNotes();
  }

  const visiblePdfs = activeAlbumId ? pdfs.filter((p) => p.albumId === activeAlbumId) : pdfs;

  const visibleNotes = notes
    .filter((n) => (activeNoteAlbumId ? n.albumId === activeNoteAlbumId : true))
    .filter((n) => {
      const q = noteTagFilter.trim().toLowerCase();
      if (!q) return true;
      return n.tags.some((t) => t.toLowerCase().includes(q));
    });

  return (
    <div>
      <SectionHero
        icon={Folder}
        title="My Library"
        description="Your personal collection of Islamic knowledge — upload PDFs and keep them organized and searchable."
      />

      <div className="card">
        <div className="form-row-label">Your library</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          Upload your own PDFs to keep them here, on this device, at their original quality.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadStatus}
        >
          {uploadStatus ? `Adding… (${uploadStatus.current}/${uploadStatus.total})` : "Add PDF"}
        </button>

        {uploadErrors.length > 0 && (
          <div className="mykitab-upload-errors">
            {uploadErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}

        {(albums.length > 0 || pdfs.length > 0) && (
          <div className="mykitab-album-row">
            <button
              className={"mykitab-album-chip" + (activeAlbumId === null ? " active" : "")}
              onClick={() => setActiveAlbumId(null)}
            >
              All PDFs
            </button>
            {albums.map((a) => (
              <span
                key={a.id}
                className={"mykitab-album-chip-wrap" + (activeAlbumId === a.id ? " active" : "")}
              >
                <button className="mykitab-album-chip-label" onClick={() => setActiveAlbumId(a.id)}>
                  {a.name}
                </button>
                <button
                  className="mykitab-album-chip-delete"
                  onClick={() => setDeletePdfAlbumTarget(a)}
                  aria-label={`Delete album ${a.name}`}
                  title="Delete album"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </span>
            ))}
            <button
              className="mykitab-album-chip-new"
              onClick={() => setShowNewAlbumForm((v) => !v)}
            >
              + New album
            </button>
          </div>
        )}

        {showNewAlbumForm && (
          <form className="mykitab-new-album-form" onSubmit={handleCreateAlbum}>
            <input
              className="mykitab-new-album-input"
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </form>
        )}

        {!loadingList && visiblePdfs.length === 0 && (
          <div className="empty-state">
            {pdfs.length === 0
              ? 'No PDFs added yet — tap "Add PDF" to upload one.'
              : "No PDFs in this album yet."}
          </div>
        )}

        {visiblePdfs.length > 0 && (
          <ul className="mykitab-pdf-list">
            {visiblePdfs.map((pdf) => (
              <li className="mykitab-pdf-item" key={pdf.id}>
                <Link to={`/my-kitab/${pdf.id}`} className="mykitab-pdf-info">
                  <PdfCoverThumb blob={pdf.coverThumb} />
                  <div className="mykitab-pdf-text">
                    <div className="mykitab-pdf-title">{pdf.title}</div>
                    <div className="mykitab-pdf-meta">
                      {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"} · {formatSize(pdf.size)} ·
                      added {formatDate(pdf.addedAt)}
                    </div>
                  </div>
                </Link>
                <div className="mykitab-pdf-actions">
                  {albums.length > 0 && (
                    <select
                      className="mykitab-album-select"
                      value={pdf.albumId || ""}
                      onChange={(e) => handleMovePdf(pdf.id, e.target.value)}
                      aria-label={`Move ${pdf.title} to album`}
                    >
                      <option value="">No album</option>
                      {albums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="mykitab-delete-btn"
                    onClick={() => requestDelete(pdf)}
                    aria-label={`Delete ${pdf.title}`}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="form-row-label">Your notes</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          Notes taken by flipping an ayah in the Quran, a page in Mutoon, or via the note button on
          any of your uploaded PDFs — all end up here, organized into albums.
        </p>

        {(noteAlbums.length > 0 || notes.length > 0) && (
          <div className="mykitab-album-row">
            <button
              className={"mykitab-album-chip" + (activeNoteAlbumId === null ? " active" : "")}
              onClick={() => setActiveNoteAlbumId(null)}
            >
              All Notes
            </button>
            {noteAlbums.map((a) => (
              <span
                key={a.id}
                className={"mykitab-album-chip-wrap" + (activeNoteAlbumId === a.id ? " active" : "")}
              >
                <button
                  className="mykitab-album-chip-label"
                  onClick={() => setActiveNoteAlbumId(a.id)}
                >
                  {a.name}
                </button>
                <button
                  className="mykitab-album-chip-delete"
                  onClick={() => setDeleteNoteAlbumTarget(a)}
                  aria-label={`Delete album ${a.name}`}
                  title="Delete album"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </span>
            ))}
            <button
              className="mykitab-album-chip-new"
              onClick={() => setShowNewNoteAlbumForm((v) => !v)}
            >
              + New album
            </button>
          </div>
        )}

        {showNewNoteAlbumForm && (
          <form className="mykitab-new-album-form" onSubmit={handleCreateNoteAlbum}>
            <input
              className="mykitab-new-album-input"
              placeholder="Album name"
              value={newNoteAlbumName}
              onChange={(e) => setNewNoteAlbumName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </form>
        )}

        {notes.length > 0 && (
          <input
            className="search-input"
            style={{ marginTop: 14, marginBottom: 0 }}
            placeholder="Filter by tag…"
            value={noteTagFilter}
            onChange={(e) => setNoteTagFilter(e.target.value)}
          />
        )}

        {notes.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            No notes yet — tap the notebook icon on an ayah, a Mutoon page, or a PDF page to add
            one.
          </div>
        ) : visibleNotes.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            No notes match this filter.
          </div>
        ) : (
          <div className="mykitab-note-list">
            {visibleNotes.map((note) => (
              <div className="mykitab-note-card" key={note.id}>
                <div className="mykitab-note-card-source">{note.sourceLabel}</div>
                {note.excerpt && <p className="mykitab-note-card-excerpt">"{note.excerpt}"</p>}
                <p className="mykitab-note-card-text">{note.text}</p>
                {note.tags.length > 0 && (
                  <div className="mykitab-note-card-tags">
                    {note.tags.map((tag) => (
                      <span className="note-tag-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="form-row-label">Search your library</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          Search only looks inside the PDFs you've uploaded above.
        </p>

        <input
          className="search-input"
          placeholder="Search your uploaded PDFs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {searching && <div className="loading-state">Searching your PDFs…</div>}

        {!searching && results && results.length === 0 && (
          <div className="empty-state">No matching content found in your uploaded PDFs.</div>
        )}

        {!searching && results && results.length > 0 && (
          <div className="mykitab-result-list">
            {results.map((r, i) => (
              <Link
                to={`/my-kitab/${r.pdfId}?page=${r.pageNumber}&q=${encodeURIComponent(r.matchText)}`}
                className="mykitab-result"
                key={`${r.pdfId}-${r.pageNumber}-${i}`}
              >
                <div className="mykitab-result-ref">
                  {r.pdfTitle} · page {r.pageNumber}
                </div>
                <p className="mykitab-result-excerpt">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="empty-state">
            {pdfs.length === 0
              ? "Add a PDF above, then search its contents here."
              : "Type a word or phrase to search across your uploaded PDFs."}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this PDF?"
          message={`"${deleteTarget.title}" will be permanently removed from your library. This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {deletePdfAlbumTarget && (
        <ConfirmDialog
          title="Delete this album?"
          message={`"${deletePdfAlbumTarget.name}" will be deleted. Its PDFs aren't removed — they just move back to "All PDFs". This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeletePdfAlbumTarget(null)}
          onConfirm={confirmDeletePdfAlbum}
        />
      )}

      {deleteNoteAlbumTarget && (
        <ConfirmDialog
          title="Delete this album?"
          message={`"${deleteNoteAlbumTarget.name}" will be deleted. Its notes aren't removed — they just move back to "All Notes". This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleteNoteAlbumTarget(null)}
          onConfirm={confirmDeleteNoteAlbum}
        />
      )}
    </div>
  );
}
