import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import GuidedTour from "./components/GuidedTour.jsx";
import { useIntro } from "./context/IntroContext.jsx";
import { useNavVisibility } from "./context/NavVisibilityContext.jsx";
import Home from "./pages/Home.jsx";
import SurahList from "./pages/SurahList.jsx";
import SurahReader from "./pages/SurahReader.jsx";
import Search from "./pages/Search.jsx";
import Mutoon from "./pages/Mutoon.jsx";
import MutoonReader from "./pages/MutoonReader.jsx";
import MedinahBooks from "./pages/MedinahBooks.jsx";
import MedinahLessons from "./pages/MedinahLessons.jsx";
import MedinahLesson from "./pages/MedinahLesson.jsx";
import Athkar from "./pages/Athkar.jsx";
import MyKitab from "./pages/MyKitab.jsx";
import MyKitabViewer from "./pages/MyKitabViewer.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  const { showIntro, stage, advanceToTour, dismissIntro } = useIntro();
  const { lock, unlock } = useNavVisibility();

  // The guided tour spotlights the real nav bar, so it must stay on screen
  // (not auto-hidden by scroll) for the whole splash+tour sequence.
  useEffect(() => {
    if (showIntro) lock();
    else unlock();
  }, [showIntro, lock, unlock]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/surahs" element={<SurahList />} />
          <Route path="/surah/:number" element={<SurahReader />} />
          <Route path="/search" element={<Search />} />
          <Route path="/mutoon" element={<Mutoon />} />
          <Route path="/mutoon/:bookId" element={<MutoonReader />} />
          <Route path="/medinah" element={<MedinahBooks />} />
          <Route path="/medinah/:bookId" element={<MedinahLessons />} />
          <Route path="/medinah/:bookId/:lessonNumber" element={<MedinahLesson />} />
          <Route path="/athkar" element={<Athkar />} />
          <Route path="/my-kitab" element={<MyKitab />} />
          <Route path="/my-kitab/:id" element={<MyKitabViewer />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {showIntro && stage === "splash" && <SplashScreen onDone={advanceToTour} />}
      {showIntro && stage === "tour" && <GuidedTour onDone={dismissIntro} />}
    </div>
  );
}
