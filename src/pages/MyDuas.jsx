import { useEffect, useState } from "react";
import { Heart, Pencil, Trash2 } from "lucide-react";
import SectionHero from "../components/SectionHero.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ArabicText from "../components/ArabicText.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  deleteCustomDua,
  listCustomDuas,
  makeCustomDuaId,
  saveCustomDua,
} from "../utils/customDuasDb.js";

export default function MyDuas() {
  const { user } = useAuth();
  const [duas, setDuas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null); // null while adding a brand-new one
  const [arabic, setArabic] = useState("");
  const [english, setEnglish] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  async function refresh() {
    try {
      setDuas(await listCustomDuas(user.uid));
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load your duas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setArabic("");
    setEnglish("");
  }

  function startEdit(dua) {
    setEditingId(dua.id);
    setArabic(dua.arabic || "");
    setEnglish(dua.english || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e) {
    e.preventDefault();
    const trimmedArabic = arabic.trim();
    const trimmedEnglish = english.trim();
    if (!trimmedArabic && !trimmedEnglish) return;

    setSaving(true);
    try {
      const existing = editingId ? duas.find((d) => d.id === editingId) : null;
      const dua = {
        id: editingId || makeCustomDuaId(),
        arabic: trimmedArabic,
        english: trimmedEnglish,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await saveCustomDua(user.uid, dua);
      resetForm();
      await refresh();
    } catch (err) {
      setError(err.message || "Couldn't save this dua.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCustomDua(user.uid, deleteTarget.id);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      setError(err.message || "Couldn't delete this dua.");
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <SectionHero
        icon={Heart}
        title="My Duas"
        description="Your own custom duas — written by you, saved to your account, and available wherever you sign in."
      />

      {error && (
        <div className="empty-state" style={{ borderColor: "var(--card-library)" }}>
          {error}
        </div>
      )}

      <form className="card custom-dua-form" onSubmit={handleSave}>
        <div className="form-row-label">{editingId ? "Edit dua" : "Write a new dua"}</div>

        <label className="custom-dua-field-label" htmlFor="custom-dua-arabic">
          Arabic
        </label>
        <textarea
          id="custom-dua-arabic"
          className="custom-dua-arabic-input"
          dir="rtl"
          lang="ar"
          placeholder="اكتب الدعاء هنا…"
          value={arabic}
          onChange={(e) => setArabic(e.target.value)}
          rows={3}
        />

        <label className="custom-dua-field-label" htmlFor="custom-dua-english">
          English translation
        </label>
        <textarea
          id="custom-dua-english"
          className="note-editor-textarea"
          placeholder="Write the translation or meaning…"
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          rows={3}
        />

        <div className="custom-dua-form-actions">
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || (!arabic.trim() && !english.trim())}
          >
            {saving ? "Saving…" : editingId ? "Update" : "Save"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="loading-state">Loading your duas…</div>
      ) : duas.length === 0 ? (
        <div className="empty-state">No custom duas yet — write your first one above.</div>
      ) : (
        duas.map((dua) => (
          <div className="athkar-dua-card custom-dua-card" key={dua.id}>
            <div className="custom-dua-card-actions">
              <button
                type="button"
                className="mushaf-inline-icon-btn"
                onClick={() => startEdit(dua)}
                aria-label="Edit dua"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="mushaf-inline-icon-btn"
                onClick={() => setDeleteTarget(dua)}
                aria-label="Delete dua"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {dua.arabic && (
              <p className="ayah-arabic">
                <ArabicText text={dua.arabic} />
              </p>
            )}
            {dua.english && <p className="ayah-translation">{dua.english}</p>}
          </div>
        ))
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this dua?"
          message="This custom dua will be permanently deleted from your account. This can't be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
