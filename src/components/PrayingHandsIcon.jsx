import { useId } from "react";

// Hands-in-dua glyph — open, upward palms (not pressed together), fingers
// spread. No open-source icon set has this pose in a matching style, so
// it's hand-built from simple primitives: a filled palm block plus
// round-capped strokes for the fingers/thumb, which reads far more clearly
// at nav-icon size than a single detailed outline path would.
export default function PrayingHandsIcon({ className }) {
  const handId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <g id={handId}>
          <path
            fill="currentColor"
            stroke="none"
            d="M13.3 21 L13.3 17.5 C13.3 15.8 14.5 15 16 15 C17.5 15 18.7 15.8 18.7 17.5 L18.7 21 Z"
          />
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14.1 16 L13.4 8.5" />
            <path d="M15.7 15.3 L15.9 6" />
            <path d="M17.3 15.3 L17.6 6.7" />
            <path d="M18.7 16 L19.6 9.3" />
            <path d="M18.5 18.5 L21 20.3" />
          </g>
        </g>
      </defs>
      <use href={`#${handId}`} transform="translate(-1.5,0)" />
      <use href={`#${handId}`} transform="translate(1.5,0) scale(-1,1) translate(-24,0)" />
    </svg>
  );
}
