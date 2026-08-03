// Hero shown at the top of a main section page — the photo spans the full
// card as a frosted-glass background, fading into the card's own color
// behind the text (icon, title, description) so it never fights for
// legibility. Sibling to PageHero.jsx (the icon-only version still used
// where no photo has been supplied).
export default function SectionHero({ icon: Icon, image, imagePosition = "center", title, description }) {
  return (
    <div className="section-hero">
      <div className="section-hero-media">
        <img
          src={image}
          alt=""
          className="section-hero-image"
          style={{ objectPosition: imagePosition }}
        />
      </div>
      <div className="section-hero-glass" aria-hidden="true" />
      <div className="section-hero-content">
        {Icon && (
          <div className="section-hero-icon-badge">
            <Icon className="section-hero-icon" strokeWidth={2} />
          </div>
        )}
        <h1 className="section-hero-title">{title}</h1>
        <p className="section-hero-desc">{description}</p>
      </div>
    </div>
  );
}
