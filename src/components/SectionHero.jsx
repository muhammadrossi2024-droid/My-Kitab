// Hero shown at the top of a main section page — the photo spans the full
// card as a frosted-glass background, fading into the card's own color
// behind the text (icon, title, description) so it never fights for
// legibility. Sibling to PageHero.jsx (the icon-only version still used
// where no photo has been supplied).
//
// imageZoom/imageFocus: because these cards are much wider than they are
// tall, object-fit: cover always ends up width-constrained here — the
// full image width already renders with zero horizontal crop, so plain
// object-position has no horizontal effect. To actually pan a subject
// further into the visible zone, a card needs a bit of extra zoom to
// create horizontal room to pan within — imageZoom is that scale factor,
// and imageFocus is the transform-origin it pans around (kept minimal,
// only used where a card's subject needs it).
//
// fadeMid/fadeEnd/contentMaxWidth: the card-width % stops that drive the
// tint gradient in index.css (see .section-hero-glass) — passed through
// as CSS custom properties so a card can pull its fade further left (a
// bigger sharp/clear zone) without touching the shared defaults every
// other card still uses. .section-hero-blur reuses these same two stops
// so the blur spans exactly the same left-to-right range as the tint.
export default function SectionHero({
  icon: Icon,
  image,
  imagePosition = "center",
  imageZoom,
  imageFocus = "50% 50%",
  fadeMid,
  fadeEnd,
  contentMaxWidth,
  title,
  description,
}) {
  return (
    <div
      className="section-hero"
      style={{
        ...(fadeMid ? { "--hero-fade-mid": fadeMid } : null),
        ...(fadeEnd ? { "--hero-fade-end": fadeEnd } : null),
        ...(contentMaxWidth ? { "--hero-content-max-width": contentMaxWidth } : null),
      }}
    >
      <div className="section-hero-media">
        <img
          src={image}
          alt=""
          className="section-hero-image"
          style={{
            objectPosition: imagePosition,
            ...(imageZoom
              ? { transform: `scale(${imageZoom})`, transformOrigin: imageFocus }
              : null),
          }}
        />
      </div>
      <div className="section-hero-blur" aria-hidden="true" />
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
