import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, SkipBack, SkipForward, ChevronDown } from "lucide-react";
import { useAudioPlayer } from "../context/AudioPlayerContext.jsx";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Persistent, Spotify/SoundCloud-style player docked above the bottom nav
// — a sibling of Navbar in App.jsx, not part of it, so it can exist
// without touching that component at all. Renders nothing until the user
// has actually played something this session (player.currentSurah is
// null until then), same as most mini-players.
//
// currentTime/duration are read directly off the audio element via rAF
// only while the expanded Now Playing view is open, rather than through
// context state, so a track playing in the background doesn't force a
// re-render of every context consumer several times a second.
export default function AudioMiniPlayer() {
  const player = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [displayTime, setDisplayTime] = useState({ current: 0, duration: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (!expanded) return;
    function tick() {
      const audio = player.audioRef.current;
      setDisplayTime({
        current: audio?.currentTime || 0,
        duration: audio?.duration || 0,
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [expanded, player.audioRef]);

  if (!player.currentSurah) return null;

  const surah = player.currentSurah;
  const verseLabel = player.fullSurahMode
    ? player.fullSurahActiveVerse
      ? `Ayah ${player.fullSurahActiveVerse}`
      : "Full surah"
    : player.playingVerse
    ? `Ayah ${player.playingVerse}`
    : "Paused";

  function handlePlayPause(e) {
    e.stopPropagation();
    player.togglePlaySurah(surah);
  }

  function handleScrub(e) {
    const audio = player.audioRef.current;
    if (!audio || !audio.duration) return;
    player.seek(Number(e.target.value) * audio.duration);
  }

  const scrubValue = displayTime.duration ? displayTime.current / displayTime.duration : 0;

  return (
    <>
      <div
        className="audio-mini-player"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label="Open Now Playing"
      >
        <div className="audio-mini-player-info">
          <div className="audio-mini-player-title">{surah.name.transliteration}</div>
          <div className="audio-mini-player-sub">{verseLabel}</div>
        </div>
        <div className="audio-mini-player-controls">
          <button
            type="button"
            className="audio-mini-player-btn"
            onClick={(e) => {
              e.stopPropagation();
              player.previous();
            }}
            aria-label="Rewind"
          >
            <SkipBack size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="audio-mini-player-btn audio-mini-player-play"
            onClick={handlePlayPause}
            aria-label={player.isPlaying ? "Pause" : "Play"}
          >
            {player.isPlaying ? <Pause size={17} strokeWidth={2} /> : <Play size={17} strokeWidth={2} />}
          </button>
          <button
            type="button"
            className="audio-mini-player-btn"
            onClick={(e) => {
              e.stopPropagation();
              player.next();
            }}
            aria-label="Skip"
          >
            <SkipForward size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="now-playing-backdrop" onClick={() => setExpanded(false)}>
          <div
            className="now-playing-view"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Now Playing"
          >
            <button
              type="button"
              className="now-playing-collapse"
              onClick={() => setExpanded(false)}
              aria-label="Collapse"
            >
              <ChevronDown size={20} strokeWidth={2} />
            </button>

            <div className="now-playing-art">
              <span>{surah.name.arabic}</span>
            </div>

            <div className="now-playing-title">{surah.name.transliteration}</div>
            <div className="now-playing-sub">
              {verseLabel} · {player.reciterName}
            </div>

            <input
              type="range"
              className="now-playing-scrubber"
              min={0}
              max={1}
              step={0.001}
              value={scrubValue}
              onChange={handleScrub}
              aria-label="Seek"
            />
            <div className="now-playing-times">
              <span>{formatTime(displayTime.current)}</span>
              <span>{formatTime(displayTime.duration)}</span>
            </div>

            <div className="now-playing-controls">
              <button type="button" onClick={player.previous} aria-label="Rewind">
                <SkipBack size={26} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="now-playing-play-btn"
                onClick={() => player.togglePlaySurah(surah)}
                aria-label={player.isPlaying ? "Pause" : "Play"}
              >
                {player.isPlaying ? <Pause size={28} strokeWidth={2} /> : <Play size={28} strokeWidth={2} />}
              </button>
              <button type="button" onClick={player.next} aria-label="Skip">
                <SkipForward size={26} strokeWidth={2} />
              </button>
            </div>

            <Link
              to={`/surah/${surah.number}`}
              className="now-playing-open-link"
              onClick={() => setExpanded(false)}
            >
              Open in Quran →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
