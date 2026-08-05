import { useParams } from "react-router-dom";
import SectionHero from "../components/SectionHero.jsx";
import AthkarDuaList from "../components/AthkarDuaList.jsx";
import PrayingHandsIcon from "../components/PrayingHandsIcon.jsx";

const COPY = {
  morning: {
    title: "Morning Athkar",
    description: "Authentic supplications for the morning, complete with English translation and source references.",
  },
  evening: {
    title: "Evening Athkar",
    description: "Authentic supplications for the evening, complete with English translation and source references.",
  },
};

export default function AthkarList() {
  const { mode } = useParams(); // "morning" | "evening"
  const copy = COPY[mode] || COPY.morning;

  return (
    <div>
      <SectionHero icon={PrayingHandsIcon} title={copy.title} description={copy.description} />
      <AthkarDuaList mode={mode === "evening" ? "evening" : "morning"} />
    </div>
  );
}
