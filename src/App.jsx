import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import AssistantIntro from "./components/AssistantIntro.jsx";
import { useIntro } from "./context/IntroContext.jsx";
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
  const { showIntro, stage, advanceToChat, dismissIntro } = useIntro();

  if (showIntro) {
    return stage === "splash" ? (
      <SplashScreen onDone={advanceToChat} />
    ) : (
      <AssistantIntro onDone={dismissIntro} />
    );
  }

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
    </div>
  );
}
