import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import SurahList from "./pages/SurahList.jsx";
import SurahReader from "./pages/SurahReader.jsx";
import Search from "./pages/Search.jsx";
import Mutoon from "./pages/Mutoon.jsx";
import MutoonReader from "./pages/MutoonReader.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
