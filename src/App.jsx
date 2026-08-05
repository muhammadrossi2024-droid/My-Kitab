import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import TopBanner from "./components/TopBanner.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import GuidedTour from "./components/GuidedTour.jsx";
import homeTourScript, { HOME_TOUR_TOTAL_STEPS } from "./tours/homeTourScript.js";
import premiumTourScript, { PREMIUM_TOUR_TOTAL_STEPS } from "./tours/premiumTourScript.js";
import AudioMiniPlayer from "./components/AudioMiniPlayer.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useIntro } from "./context/IntroContext.jsx";
import { usePremium } from "./context/PremiumContext.jsx";
import { useNavVisibility } from "./context/NavVisibilityContext.jsx";
import Auth from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
import SurahList from "./pages/SurahList.jsx";
import SurahReader from "./pages/SurahReader.jsx";
import MushafPage from "./pages/MushafPage.jsx";
import Search from "./pages/Search.jsx";
import Mutoon from "./pages/Mutoon.jsx";
import MutoonReader from "./pages/MutoonReader.jsx";
import MedinahBooks from "./pages/MedinahBooks.jsx";
import MedinahLessons from "./pages/MedinahLessons.jsx";
import MedinahLesson from "./pages/MedinahLesson.jsx";
import Athkar from "./pages/Athkar.jsx";
import AthkarList from "./pages/AthkarList.jsx";
import MyDuas from "./pages/MyDuas.jsx";
import MyKitab from "./pages/MyKitab.jsx";
import MyKitabViewer from "./pages/MyKitabViewer.jsx";
import Settings from "./pages/Settings.jsx";
import PremiumGate from "./components/PremiumGate.jsx";
import PremiumOfferScreen from "./components/PremiumOfferScreen.jsx";

export default function App() {
  const { user, authLoading } = useAuth();
  const { showSplash, dismissSplash, activeTour, showTour, startPremiumTour, dismissTour } = useIntro();
  const { justActivatedPremium, clearJustActivatedPremium } = usePremium();
  const { lock, unlock } = useNavVisibility();

  // The guided tour spotlights the real nav bar, so it must stay on screen
  // (not auto-hidden by scroll) while either the splash or the tour is up.
  useEffect(() => {
    if (showSplash || showTour) lock();
    else unlock();
  }, [showSplash, showTour, lock, unlock]);

  // Launches the Premium tour the instant Premium is actually switched on
  // (Claim CTA or the dev toggle) — never on an ordinary reload/login where
  // it was already on, since that never sets this flag in the first place.
  // See PremiumContext's justActivatedPremium for why this is a one-shot
  // edge rather than a plain "isPremiumUser is true" check.
  useEffect(() => {
    if (!justActivatedPremium) return;
    startPremiumTour();
    clearJustActivatedPremium();
  }, [justActivatedPremium, startPremiumTour, clearJustActivatedPremium]);

  // One persistent splash instance spans both "waiting on Firebase's initial
  // auth check" and (for an authenticated, first-ever-this-session visit)
  // the branded splash that follows it. Rendering those as two separate
  // components in sequence — one for the auth-loading wait, a different one
  // for the splash — caused a visible double-flash on every refresh: the
  // first would unmount and the second mount fresh mid-transition, restarting
  // its fade-in even though the two looked almost identical. Keeping it as
  // the same element across that transition means React just re-renders it
  // in place instead of tearing down and rebuilding the DOM node.
  const showSplashOverlay = authLoading || (!!user && showSplash);

  return (
    <>
      {showSplashOverlay && <SplashScreen active={!authLoading} onDone={dismissSplash} />}

      {!authLoading && !user && <Auth />}

      {!authLoading && user && (
        <div className="app-shell">
          <TopBanner />
          <Navbar />
          {/* Sits above the bottom nav via its own fixed positioning — a
              sibling of Navbar, not a change to it. */}
          <AudioMiniPlayer />
          {/* Full-viewport takeover, shown/hidden entirely via PremiumContext
              — see PremiumGate, SurahReader's note button, and Auth.jsx for
              the three trigger points. */}
          <PremiumOfferScreen />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/surahs" element={<SurahList />} />
              <Route path="/surah/:number" element={<SurahReader />} />
              <Route
                path="/quran/page/:pageNumber"
                element={
                  <PremiumGate>
                    <MushafPage />
                  </PremiumGate>
                }
              />
              <Route path="/search" element={<Search />} />
              <Route path="/mutoon" element={<Mutoon />} />
              <Route path="/mutoon/:bookId" element={<MutoonReader />} />
              <Route path="/medinah" element={<MedinahBooks />} />
              <Route path="/medinah/:bookId" element={<MedinahLessons />} />
              <Route path="/medinah/:bookId/:lessonNumber" element={<MedinahLesson />} />
              <Route path="/athkar" element={<Athkar />} />
              <Route
                path="/athkar/my-duas"
                element={
                  <PremiumGate>
                    <MyDuas />
                  </PremiumGate>
                }
              />
              <Route path="/athkar/:mode" element={<AthkarList />} />
              <Route
                path="/my-kitab"
                element={
                  <PremiumGate>
                    <MyKitab />
                  </PremiumGate>
                }
              />
              <Route
                path="/my-kitab/:id"
                element={
                  <PremiumGate>
                    <MyKitabViewer />
                  </PremiumGate>
                }
              />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>

          {activeTour === "home" && (
            <GuidedTour script={homeTourScript} totalSteps={HOME_TOUR_TOTAL_STEPS} onDone={dismissTour} />
          )}
          {activeTour === "premium" && (
            <GuidedTour script={premiumTourScript} totalSteps={PREMIUM_TOUR_TOTAL_STEPS} onDone={dismissTour} />
          )}
        </div>
      )}
    </>
  );
}
