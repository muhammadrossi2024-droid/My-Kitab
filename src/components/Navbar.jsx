import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/surahs", label: "Surahs" },
  { to: "/search", label: "🔍 Search" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <img src="/logo.png" alt="My Kitab" className="navbar-logo" />
      </NavLink>
      <div className="navbar-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
