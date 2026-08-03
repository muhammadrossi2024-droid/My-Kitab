import { NavLink } from "react-router-dom";
import { BookOpen, ChevronUp, Folder, Library, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// Single source of truth for the bottom nav — also read by the assistant
// intro screen to generate its one-message-per-tab walkthrough, so adding,
// renaming, or reordering a tab here can never leave that guide stale.
export const links = [
  { to: "/my-kitab", label: "My Library", icon: Folder },
  { to: "/surahs", label: "Quran", icon: BookOpen },
  { to: "/mutoon", label: "Mutoon", icon: Library },
  { to: "/athkar", label: "Athkar", icon: Sparkles },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export default function Navbar() {
  const { hidden, show } = useNavVisibility();

  return (
    <>
      <nav className={"navbar" + (hidden ? " navbar-hidden" : "")}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              data-tour-id={link.to}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
              aria-label={link.label}
              title={link.label}
            >
              <Icon className="navbar-link-icon" strokeWidth={2} />
            </NavLink>
          );
        })}
      </nav>
      <button
        className={"navbar-handle" + (hidden ? " visible" : "")}
        onClick={show}
        aria-label="Show navigation bar"
        tabIndex={hidden ? 0 : -1}
      >
        <ChevronUp className="navbar-handle-icon" strokeWidth={2} />
      </button>
    </>
  );
}
