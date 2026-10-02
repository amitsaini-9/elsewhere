"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
export default function NatureFilm({
  src,
  poster,
  label,
  className = "",
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const manual = useRef(false);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    // A failed preload can finish before hydration attaches the error handler.
    if (node.error) {
      setFailed(true);
      setPaused(true);
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    function sync() {
      if (!node) return;
      if (visible && !reduced.matches && !manual.current && !document.hidden) {
        node.play().catch(() => setPaused(true));
      } else {
        node.pause();
        setPaused(true);
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  function toggle() {
    const node = video.current;
    if (!node || failed) return;
    if (node.paused) {
      manual.current = false;
      node.play().catch(() => setPaused(true));
    } else {
      manual.current = true;
      node.pause();
    }
  }
  return (
    <div className={"nature-film " + className}>
      <img
        className="film-poster"
        src={poster}
        alt={label}
        fetchPriority={className.includes("hero") ? "high" : undefined}
      />
      <video
        ref={video}
        src={src}
        muted
        loop
        playsInline
        preload={className.includes("hero") ? "auto" : "metadata"}
        poster={poster}
        className={ready && !failed ? "film-video is-ready" : "film-video"}
        onPlaying={() => {
          setReady(true);
          setPaused(false);
        }}
        onPause={() => setPaused(true)}
        onError={() => {
          setFailed(true);
          setPaused(true);
        }}
        aria-hidden="true"
      />
      <div className="film-shade" />
      {!failed && (
        <button
          type="button"
          className="film-control"
          onClick={toggle}
          aria-label={paused ? "Play landscape video" : "Pause landscape video"}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? "PLAY THE MOMENT" : "PAUSE A MOMENT"}</span>
        </button>
      )}
    </div>
  );
}
