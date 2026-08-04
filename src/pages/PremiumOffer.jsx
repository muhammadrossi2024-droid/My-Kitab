import { Folder } from "lucide-react";
import SectionHero from "../components/SectionHero.jsx";
import PremiumPromoBox from "../components/PremiumPromoBox.jsx";

// Landed on whenever a non-Premium user is redirected away from My
// Library (see PremiumGate.jsx) — reuses the exact same purple promo box
// shown on Home, rather than a second, different-looking upsell screen.
export default function PremiumOffer() {
  return (
    <div>
      <SectionHero
        icon={Folder}
        title="My Library is a Premium feature"
        description="Upload your own PDFs, take notes and tags on anything you read, and organize it all into albums — unlock it below, free while Premium is on us."
      />
      <PremiumPromoBox />
    </div>
  );
}
