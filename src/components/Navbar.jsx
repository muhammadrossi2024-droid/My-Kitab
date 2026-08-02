import { NavLink } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";

const links = [
  { to: "/surahs", label: "Quran" },
  { to: "/mutoon", label: "Mutoon" },
  { to: "/search", label: "🔍 Search" },
  { to: "/settings", label: "⚙️", ariaLabel: "Settings" },
];

export default function Navbar() {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <img src={logoSrc} alt="My Kitab" className="navbar-logo" />
      </NavLink>
      <div className="navbar-links">
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
      </div>
    </nav>
  );
}
