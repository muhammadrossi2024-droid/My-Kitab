import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Folder } from "lucide-react";
import { addPdf, deletePdf, listPdfs, makePdfId } from "../utils/myKitabDb.js";
import { extractPdfPages } from "../utils/pdfExtract.js";
import { searchMyKitab } from "../utils/myKitabSearch.js";
import PageHero from "../components/PageHero.jsx";

function titleFromFilename(name) {
  return (name || "").replace(/\.pdf$/i, "").trim();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MyKitab() {
  const [pdfs, setPdfs] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null); // { current, total } while uploading
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  async function refreshList() {
    setPdfs(await listPdfs());
    setLoadingList(false);
  }

  useEffect(() => {
    refreshList();
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
        const { pages, metadataTitle } = await extractPdfPages(buffer);
        const title = titleFromFilename(file.name) || metadataTitle || "Untitled PDF";
        await addPdf({
          id: makePdfId(),
          title,
          name: file.name && file.name.trim() ? file.name : `${title}.pdf`,
          size: file.size,
          addedAt: Date.now(),
          pageCount: pages.length,
          blob: file,
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

  async function handleDelete(id) {
    await deletePdf(id);
    await refreshList();
  }

  return (
    <div>
      <PageHero
        icon={Folder}
        title="My Library"
        description="Your personal collection of Islamic knowledge."
      />

      <div className="card">
        <div className="form-row-label">Your library</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          Upload your own PDFs to keep them here, on this device.
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

        {!loadingList && pdfs.length === 0 && (
          <div className="empty-state">No PDFs added yet — tap "Add PDF" to upload one.</div>
        )}

        {pdfs.length > 0 && (
          <ul className="mykitab-pdf-list">
            {pdfs.map((pdf) => (
              <li className="mykitab-pdf-item" key={pdf.id}>
                <Link to={`/my-kitab/${pdf.id}`} className="mykitab-pdf-info">
                  <div className="mykitab-pdf-title">{pdf.title}</div>
                  <div className="mykitab-pdf-meta">
                    {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"} · {formatSize(pdf.size)} ·
                    added {formatDate(pdf.addedAt)}
                  </div>
                </Link>
                <button
                  className="mykitab-delete-btn"
                  onClick={() => handleDelete(pdf.id)}
                  aria-label={`Delete ${pdf.title}`}
                  title="Delete"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
