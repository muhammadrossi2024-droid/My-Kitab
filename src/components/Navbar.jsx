import { NavLink } from "react-router-dom";

const links = [
  { to: "/surahs", label: "Quran" },
  { to: "/mutoon", label: "Mutoon" },
  { to: "/athkar", label: "Athkar" },
  { to: "/search", label: "🔍", ariaLabel: "Search" },
  { to: "/settings", label: "⚙️", ariaLabel: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          aria-label={link.ariaLabel}
          title={link.ariaLabel}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
