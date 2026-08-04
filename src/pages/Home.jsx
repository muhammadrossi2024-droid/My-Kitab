import { useIntro } from "../context/IntroContext.jsx";
import InstallGuide from "../components/InstallGuide.jsx";
import HomeSectionCards from "../components/HomeSectionCards.jsx";

export default function Home() {
  const { startTour } = useIntro();

  return (
    <div>
      <h1>Home</h1>

      <HomeSectionCards />

      <div className="card">
        <div className="form-row-label form-row-label-lg">Tutorial</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          New here? Discover everything this app can do in under a minute — tap to get started!
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn btn-primary" onClick={startTour}>
            Start Tour
          </button>
        </div>
      </div>

      <InstallGuide />
    </div>
  );
}
