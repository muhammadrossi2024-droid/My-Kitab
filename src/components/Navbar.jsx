import { NavLink } from "react-router-dom";
import { BookOpen, ChevronUp, Folder, Home, Library, Sparkles } from "lucide-react";
import { useNavVisibility } from "../context/NavVisibilityContext.jsx";

// Single source of truth for the bottom nav — order and labels shown to
// the user. Search and Settings live in TopBanner.jsx instead, not here.
export const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/surahs", label: "Quran", icon: BookOpen },
  { to: "/mutoon", label: "Mutoon", icon: Library },
  { to: "/athkar", label: "Thikr", icon: Sparkles },
  { to: "/my-kitab", label: "Library", icon: Folder },
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
              <span className="navbar-link-label">{link.label}</span>
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
