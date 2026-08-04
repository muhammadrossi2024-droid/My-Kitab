import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
import NoteEditor from "./NoteEditor.jsx";
import { useTopBannerVisibility } from "../context/TopBannerVisibilityContext.jsx";

// Wraps a piece of reading content (an ayah, a mutoon page) with a 3D flip
// — front stays exactly what the caller was already rendering, back is a
// NoteEditor. The flip trigger sits outside the rotating element so it's
// always clickable regardless of which face is currently showing.
//
// `existing` is looked up by the parent page (SurahReader/MutoonReader
// batch-fetch all their notes once via listNotesBySourceKey, rather than
// each card querying IndexedDB individually) and passed in as a prop, so
// this component stays a plain, fast-to-render presentational wrapper.
export default function FlipNoteCard({ front, source, sourceKey, refKey, sourceLabel, excerpt, existing, onNoteChange }) {
  const [flipped, setFlipped] = useState(false);
  // Mounted lazily on the first flip, then left mounted (just visually
  // hidden via backface-visibility) so flipping back never unmounts the
  // editor mid-rotation — doing that made the back face go blank a beat
  // before the card had actually finished turning, which read as a glitch.
  const [everFlipped, setEverFlipped] = useState(false);
  const { hide: hideTopBanner, show: showTopBanner } = useTopBannerVisibility();

  // Hides the fixed TopBanner for exactly as long as this card is flipped
  // open, so the note textarea a mobile browser auto-scrolls to focus
  // never ends up underneath it. The cleanup path (unflip OR navigating
  // away/unmounting mid-edit) always balances the hide() call.
  useEffect(() => {
    if (!flipped) return;
    hideTopBanner();
    return () => showTopBanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  function toggleFlip() {
    setFlipped((f) => !f);
    setEverFlipped(true);
  }

  function handleSaved(note) {
    onNoteChange(note);
    setFlipped(false);
  }

  function handleDeleted(id) {
    onNoteChange(null, id);
    setFlipped(false);
  }

  return (
    <div className="flip-note-card">
      <button
        type="button"
        className={"flip-note-trigger" + (existing ? " has-note" : "")}
        onClick={toggleFlip}
        aria-label={existing ? "Edit note" : "Add note"}
        title={existing ? "Edit note" : "Add note"}
      >
        <NotebookPen size={15} strokeWidth={2} />
      </button>

      <div className={"flip-note-inner" + (flipped ? " flipped" : "")}>
        <div className="flip-note-face flip-note-front">{front}</div>
        <div className="flip-note-face flip-note-back">
          {everFlipped && (
            <NoteEditor
              source={source}
              sourceKey={sourceKey}
              refKey={refKey}
              sourceLabel={sourceLabel}
              excerpt={excerpt}
              existing={existing}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onCancel={() => setFlipped(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
