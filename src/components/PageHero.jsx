// Short illustrative header shown at the top of each main section's page.
// The "illustration" is the same lucide icon already used for that section
// in the bottom nav, rendered large in a soft accent-tinted panel — reuses
// icons that already exist in the app instead of shipping new image assets,
// which keeps this genuinely lightweight and automatically theme-correct.
export default function PageHero({ icon: Icon, title, description }) {
  return (
    <div className="page-hero">
      <div className="page-hero-content">
        <div className="page-hero-icon-badge">
          <Icon className="page-hero-icon" strokeWidth={2} />
        </div>
        <h1 className="page-hero-title">{title}</h1>
        <p className="page-hero-desc">{description}</p>
      </div>
      <div className="page-hero-art" aria-hidden="true">
        <Icon className="page-hero-art-icon" strokeWidth={1.25} />
      </div>
    </div>
  );
}
