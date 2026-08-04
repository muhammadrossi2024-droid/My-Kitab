import { Navigate } from "react-router-dom";
import { usePremium } from "../context/PremiumContext.jsx";

// Wraps a route that's Premium-only (currently just My Library). Non-
// Premium visitors never render the gated page at all — they're bounced
// straight to the purple offer screen instead, so there's no flash of
// the real content before the redirect happens.
export default function PremiumGate({ children }) {
  const { isPremiumUser } = usePremium();
  if (!isPremiumUser) return <Navigate to="/premium" replace />;
  return children;
}
