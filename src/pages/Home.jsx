import { useIntro } from "../context/IntroContext.jsx";

export default function Home() {
  const { startTour } = useIntro();

  return (
    <div>
      <h1>Home</h1>

      <div className="card">
        <div className="form-row-label">Take a Tour</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          New here? Take a quick tour to see how each part of the app works.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn btn-primary" onClick={startTour}>
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}
