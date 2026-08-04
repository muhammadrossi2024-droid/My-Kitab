import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { addNoteAlbum, deleteNote, listNoteAlbums, makeNoteId, saveNote } from "../utils/notesDb.js";

// The note-taking form itself — shared verbatim by the Quran/Mutoon flip
// cards (as the card's back face) and the PDF viewer's note popover (which
// doesn't flip, but needs the exact same fields), so a note always looks
// and behaves the same regardless of where it was taken.
export default function NoteEditor({
  source,
  sourceKey,
  refKey,
  sourceLabel,
  excerpt,
  existing,
  onSaved,
  onDeleted,
  onCancel,
}) {
  const [text, setText] = useState(existing?.text || "");
  const [tags, setTags] = useState(existing?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [albumId, setAlbumId] = useState(existing?.albumId ?? null);
  const [albums, setAlbums] = useState([]);
  const [addingAlbum, setAddingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listNoteAlbums().then(setAlbums);
  }, []);

  function commitTag() {
    const t = tagInput.trim();
    if (t && !tags.some((existingTag) => existingTag.toLowerCase() === t.toLowerCase())) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(tag) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleCreateAlbum(e) {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;
    const album = await addNoteAlbum(name);
    setAlbums((prev) => [...prev, album]);
    setAlbumId(album.id);
    setNewAlbumName("");
    setAddingAlbum(false);
  }

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    if (tagInput.trim()) commitTag();
    const note = {
      id: existing?.id || makeNoteId(),
      source,
      sourceKey,
      refKey,
      sourceLabel,
      excerpt,
      text: trimmed,
      tags,
      albumId,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await saveNote(note);
    setSaving(false);
    onSaved(note);
  }

  async function handleDelete() {
    if (!existing) return;
    await deleteNote(existing.id);
    onDeleted(existing.id);
  }

  return (
    <div className="note-editor">
      {excerpt && <p className="note-editor-excerpt">"{excerpt}"</p>}

      <textarea
        className="note-editor-textarea"
        placeholder="Write a note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
      />

      <div className="note-editor-tags">
        {tags.map((tag) => (
          <span className="note-tag-chip" key={tag}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          className="note-editor-tag-input"
          placeholder={tags.length === 0 ? "Add tags…" : "Add another…"}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={commitTag}
        />
      </div>

      <div className="note-editor-album-row">
        {addingAlbum ? (
          <form className="note-editor-new-album" onSubmit={handleCreateAlbum}>
            <input
              className="mykitab-new-album-input"
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
        ) : (
          <>
            <select
              className="select-input note-editor-album-select"
              value={albumId ?? ""}
              onChange={(e) => setAlbumId(e.target.value || null)}
              aria-label="Album"
            >
              <option value="">No album</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="note-editor-new-album-btn"
              onClick={() => setAddingAlbum(true)}
              title="New album"
              aria-label="New album"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      <div className="note-editor-actions">
        {existing ? (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!text.trim() || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
