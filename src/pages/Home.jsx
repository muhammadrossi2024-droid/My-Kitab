import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <div className="card">
        <div className="form-row-label">The Noble Quran</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Read the Noble Qur'an with Arabic text and English translation, saved locally so it
          loads instantly.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/surahs">
            Browse Surahs
          </Link>
          <Link className="btn" to="/settings">
            Settings
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="form-row-label">Mutoon</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Classical texts for the student of knowledge (متون طالب العلم).
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/mutoon">
            Browse Mutoon
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="form-row-label">Medinah Book Vocabulary</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Lesson-by-lesson vocabulary from the Medinah Arabic course.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/medinah">
            Browse Lessons
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="form-row-label">Morning &amp; Evening Adhkar</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Authentic supplications for the morning and evening, with translation and references.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/athkar">
            Open Adhkar
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="form-row-label">Settings</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Adjust reciter, font size, theme, and other reading preferences.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" to="/settings">
            Open Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
