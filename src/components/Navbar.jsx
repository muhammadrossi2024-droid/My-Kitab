import { NavLink } from "react-router-dom";
import { BookOpen, ChevronUp, Folder, Home, Library, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// Single source of truth for the bottom nav — also read by the assistant
// intro screen to generate its one-message-per-tab walkthrough, so adding,
// renaming, or reordering a tab here can never leave that guide stale.
export const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/my-kitab", label: "My Library", navLabel: "Library", icon: Folder },
  { to: "/surahs", label: "Quran", navLabel: "Quran", icon: BookOpen },
  { to: "/mutoon", label: "Mutoon", navLabel: "Mutoon", icon: Library },
  { to: "/athkar", label: "Athkar", navLabel: "Dhikr", icon: Sparkles },
  { to: "/search", label: "Search", navLabel: "Search", icon: Search },
  { to: "/settings", label: "Settings", navLabel: "Settings", icon: SlidersHorizontal },
];

export default function Navbar() {
  const { hidden, show } = useNavVisibility();

  return (
    <>
      <nav className={"navbar" + (hidden ? " navbar-hidden" : "")}>
        {links.map((link) => {
          const Icon = link.icon;
          const isHome = link.to === "/";
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={isHome}
              data-tour-id={link.to}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
              aria-label={link.label}
              title={link.label}
            >
              <Icon className="navbar-link-icon" strokeWidth={2} />
              {link.navLabel && <span className="navbar-link-label">{link.navLabel}</span>}
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
