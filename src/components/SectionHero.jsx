// Photo-backed hero card shown at the top of a main section page — sibling
// to PageHero.jsx (the icon-medallion version still used where no photo has
// been supplied). A bottom-up gradient scrim keeps the overlaid title/
// description readable against any photo without needing a flat text box.
export default function SectionHero({ image, imagePosition = "center", title, description }) {
  return (
    <div className="section-hero">
      <img
        src={image}
        alt=""
        className="section-hero-image"
        style={{ objectPosition: imagePosition }}
      />
      <div className="section-hero-scrim" aria-hidden="true" />
      <div className="section-hero-text">
        <h1 className="section-hero-title">{title}</h1>
        <p className="section-hero-desc">{description}</p>
      </div>
    </div>
  );
}
