// Simple hero shown at the top of a main section page — icon badge,
// title, and description on the card's solid background. Sibling to
// PageHero.jsx (the icon-only version used where no title/description
// hero has been supplied).
export default function SectionHero({ icon: Icon, title, description }) {
  return (
    <div className="section-hero">
      {Icon && (
        <div className="section-hero-icon-badge">
          <Icon className="section-hero-icon" strokeWidth={2} />
        </div>
      )}
      <h1 className="section-hero-title">{title}</h1>
      <p className="section-hero-desc">{description}</p>
    </div>
  );
}
