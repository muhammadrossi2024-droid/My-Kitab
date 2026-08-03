// Compact side-by-side hero shown at the top of a main section page — text
// (icon, title, description) on the left, a contained photo on the right.
// Sibling to PageHero.jsx (the icon-only version still used where no photo
// has been supplied). `titleAction` renders inline next to the title (e.g. a
// compact "Resume Reading" button) — optional, most callers omit it.
export default function SectionHero({
  icon: Icon,
  image,
  imagePosition = "center",
  title,
  description,
  titleAction,
  dataTour,
}) {
  return (
    <div className="section-hero" data-tour={dataTour}>
      <div className="section-hero-content">
        {Icon && (
          <div className="section-hero-icon-badge">
            <Icon className="section-hero-icon" strokeWidth={2} />
          </div>
        )}
        <div className="section-hero-title-row">
          <h1 className="section-hero-title">{title}</h1>
          {titleAction}
        </div>
        <p className="section-hero-desc">{description}</p>
      </div>
      <div className="section-hero-media">
        <img
          src={image}
          alt=""
          className="section-hero-image"
          style={{ objectPosition: imagePosition }}
        />
      </div>
    </div>
  );
}
