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
            d="M13.2 21 L13.2 17.6 C13.2 15.7 14.4 14.7 16 14.7 C17.6 14.7 18.8 15.7 18.8 17.6 L18.8 21 Z"
          />
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14.0 15.8 Q 12.9 12.5 13.2 8.8" />
            <path d="M15.6 15.2 Q 15.9 10 15.3 5.2" />
            <path d="M17.1 15.3 Q 17.6 10.5 17.2 6.7" />
            <path d="M18.5 16.0 Q 19.6 12.5 19.0 9.5" />
          </g>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M13.0 18.3 Q 10.6 18.5 10.3 16.8"
          />
        </g>
      </defs>
      <use href={`#${handId}`} transform="translate(-1.5,0)" />
      <use href={`#${handId}`} transform="translate(1.5,0) scale(-1,1) translate(-24,0)" />
    </svg>
  );
}
