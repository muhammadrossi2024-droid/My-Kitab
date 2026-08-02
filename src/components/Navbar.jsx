import { NavLink } from "react-router-dom";
import { BookOpen, Folder, Library, Search, Sparkles, SlidersHorizontal } from "lucide-react";

// Single source of truth for the bottom nav — also read by the assistant
// intro screen to generate its one-message-per-tab walkthrough, so adding,
// renaming, or reordering a tab here can never leave that guide stale.
export const links = [
  { to: "/my-kitab", label: "My Kitab", icon: Folder },
  { to: "/surahs", label: "Quran", icon: BookOpen },
  { to: "/mutoon", label: "Mutoon", icon: Library },
  { to: "/athkar", label: "Athkar", icon: Sparkles },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            aria-label={link.label}
            title={link.label}
          >
            <Icon className="navbar-link-icon" strokeWidth={2} />
          </NavLink>
        );
      })}
    </nav>
  );
}
