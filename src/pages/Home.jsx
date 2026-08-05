import { Crown } from "lucide-react";
import { useIntro } from "../context/IntroContext.jsx";
import InstallGuide from "../components/InstallGuide.jsx";
import HomeSectionCards from "../components/HomeSectionCards.jsx";
import PremiumToggleCard from "../components/PremiumToggleCard.jsx";

export default function Home() {
  const { startTour, startPremiumTour } = useIntro();

  return (
    <div>
      <h1>Home</h1>

      <HomeSectionCards />

      <PremiumToggleCard />

      <div className="card">
        <div className="form-row-label form-row-label-lg">Tutorial</div>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          New here? Discover everything this app can do in under a minute — tap to get started!
        </p>
        <div className="tour-launch-row">
          <button className="btn btn-primary" onClick={startTour}>
            Take a Tour
          </button>
          <button className="btn tour-premium-btn" onClick={startPremiumTour}>
            <Crown size={14} strokeWidth={2.25} />
            Premium Tour
          </button>
        </div>
      </div>

      <InstallGuide />
    </div>
  );
}
