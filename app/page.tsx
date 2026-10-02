"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Plus,
  Minus,
  X,
  Menu,
  Clock3,
  Footprints,
  Leaf,
  Sun,
  MapPin,
  CloudSun,
  Check,
  Compass,
  Route,
  Bookmark,
  Wind,
  MoveUpRight,
} from "lucide-react";
import NatureFilm from "./components/NatureFilm";
import EscapePlanner from "./components/EscapePlanner";
const source =
  "https://www.gov.uk/government/statistics/the-people-and-nature-surveys-for-england-adults-data-y5q4-january-2025-march-2025/adults-year-5-annual-report-april-2024-march-2025";
const moods = [
  {
    id: "forest" as const,
    name: "Into the green.",
    eyebrow: "FOR A QUIETER KIND OF DAY",
    image: "/media/forest.webp",
    alt: "Golden light falling through a lush woodland onto a narrow footpath",
    tag: "Woodland wander",
    minutes: 90,
  },
  {
    id: "coast" as const,
    name: "Follow the water.",
    eyebrow: "WHEN YOU NEED A WIDER VIEW",
    image: "/media/coast.webp",
    alt: "Soft waves against a coastal cove beneath grassy cliffs",
    tag: "Coastal pause",
    minutes: 180,
  },
  {
    id: "hills" as const,
    name: "Take the long way.",
    eyebrow: "A LITTLE ROOM TO WANDER",
    image: "/media/hills.webp",
    alt: "A walker follows a path through wildflower meadows toward rolling hills",
    tag: "Hilltop headspace",
    minutes: 90,
  },
];
const questions = [
  [
    "What is Elsewhere?",
    "Elsewhere is a nearby outdoor escape planner in development. Tell it how much time you have, how you want to travel, and what kind of place you feel like visiting. The goal is one considered outing—from your doorstep and back again.",
  ],
  [
    "Can I follow these routes today?",
    "The plans on this page are interactive examples. The landscapes are generated illustrations, and the route lines are illustrative, not navigation. The full app will need verified destination information, route data, weather, and daylight checks before release.",
  ],
  [
    "Do I need a whole day or a car?",
    "The planned experience starts with the time you actually have. We are exploring short outings and options on foot, by bike, and eventually by public transport. Travel time and a return buffer belong inside the plan, not on top of it.",
  ],
  [
    "When can I use the full app?",
    "We are shaping the first release. Join the early-access list to express your interest. There is no announced launch date, city coverage, or price yet. The preview above is available to try right now.",
  ],
];
function Logo() {
  return (
    <a href="#top" className="logo" aria-label="Elsewhere home">
      <svg viewBox="0 0 34 37" fill="none" aria-hidden="true">
        <path
          d="M7 30C4 17 12 7 28 5c4 18-3 27-15 24M9 29 24 10M14 21h12M19 15l-1-6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span>
        elsewhere<span className="logo-star">✳</span>
      </span>
    </a>
  );
}
export default function Home() {
  const [menu, setMenu] = useState(false);
  const [minutes, setMinutes] = useState(90);
  const [mood, setMood] = useState<"forest" | "coast" | "hills">("forest");
  const [faq, setFaq] = useState<number | null>(0);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const scene = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((e) => obs.observe(e));
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty(
        "--page-progress",
        `${max > 0 ? (scrollY / max) * 100 : 0}%`,
      );
      if (scene.current) {
        const r = scene.current.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
        scene.current.style.setProperty("--scene-progress", String(p));
      }
      document.documentElement.style.setProperty(
        "--hero-shift",
        `${Math.min(120, scrollY * 0.13)}px`,
      );
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    update();
    return () => {
      obs.disconnect();
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  useEffect(() => {
    if (!privacy) return;
    const d = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !d) return;
      const els = Array.from(d.querySelectorAll<HTMLElement>("button,a[href]"));
      if (
        (e.shiftKey && document.activeElement === els[0]) ||
        (!e.shiftKey && document.activeElement === els[els.length - 1])
      ) {
        e.preventDefault();
        (e.shiftKey ? els[els.length - 1] : els[0])?.focus();
      }
    };
    d?.addEventListener("keydown", key);
    return () => {
      d?.removeEventListener("keydown", key);
      d?.close();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [privacy]);
  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: form.get("website") }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Please try again in a moment.");
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setStatus("error");
    }
  }
  return (
    <>
      <div className="reading-progress" />
      <header className="header" id="top">
        <Logo />
        <nav
          id="main-nav"
          aria-label="Main navigation"
          className={menu ? "open" : ""}
        >
          <a href="#why" onClick={() => setMenu(false)}>
            A different kind of plan
          </a>
          <a href="#escapes" onClick={() => setMenu(false)}>
            Find your feeling
          </a>
          <a href="#planner" onClick={() => setMenu(false)}>
            Try the preview
          </a>
        </nav>
        <a className="nav-cta" href="#early-access">
          Be the first outside <ArrowUpRight size={14} />
        </a>
        <button
          className="menu-toggle"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          aria-controls="main-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero">
          <NatureFilm
            src="/media/hero-film.mp4"
            poster="/media/hero-poster.webp"
            label="A winding path through misty green coastal hills in warm morning light"
            className="hero-film"
          />
          <div className="hero-top">
            <span>
              <i /> LITTLE ESCAPES. REAL LIFE.
            </span>
            <span>AN APP FOR GETTING OUT THERE.</span>
          </div>
          <div className="hero-copy">
            <div className="hero-pretitle">
              A SPARE HOUR. A CHANGE OF SCENE.
            </div>
            <h1>
              Life is better
              <br />a little <em>elsewhere.</em>
            </h1>
            <p>
              Less planning. More fresh air.
              <br />
              Find little outdoor escapes that fit the day you actually have.
            </p>
            <a className="cream-button" href="#planner">
              Find my little escape <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="hero-location">
            <span className="location-cross">✳</span>
            <span>
              NOT FAR AWAY.
              <br />
              JUST FAR ENOUGH.
            </span>
          </div>
          <div className="hero-bottom">
            <a href="#why">
              <span className="scroll-round">
                <ArrowDown size={14} />
              </span>{" "}
              A LITTLE FURTHER DOWN
            </a>
            <span className="hero-image-note">
              A GLIMPSE OF WHAT’S POSSIBLE · GENERATED LANDSCAPE
            </span>
          </div>
        </section>
        <section className="quick-plan">
          <div>
            <span className="mini-label">LET’S START SMALL</span>
            <h2>
              How much day
              <br />
              do you have to spare?
            </h2>
          </div>
          <div className="time-options" aria-label="Choose your available time">
            {[60, 90, 180].map((n) => (
              <button
                key={n}
                aria-pressed={minutes === n}
                onClick={() => setMinutes(n)}
              >
                <Clock3 size={16} />
                <span>
                  {n === 60
                    ? "An hour"
                    : n === 90
                      ? "A little longer"
                      : "An afternoon"}
                  <small>{n} minutes</small>
                </span>
                {minutes === n && <Check size={13} />}
              </button>
            ))}
          </div>
          <a
            href="#planner"
            className="round-link"
            aria-label="Try a plan for your selected time"
          >
            <ArrowUpRight size={25} />
          </a>
        </section>
        <section id="why" className="intro section">
          <div className="section-label reveal">
            <span>01 — A LITTLE SPACE FOR OUTSIDE</span>
            <span>NO BIG LIFE CHANGE REQUIRED.</span>
          </div>
          <div className="intro-grid">
            <div className="intro-heading reveal">
              <h2>
                You don’t need
                <br />a free weekend.
                <br />
                <em>Just a little opening.</em>
              </h2>
              <p>
                Somewhere between the next meeting and the washing-up, there’s a
                bit of day that could be yours.
              </p>
              <p>
                We’re building Elsewhere to help you find it. One nearby place.
                A simple plan. Home before the rest of life needs you.
              </p>
              <a className="text-link" href="#planner">
                See what fits in your day <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="intro-collage reveal">
              <div className="postcard postcard-back">
                <img
                  src="/media/coast.webp"
                  alt="An illustrated escape overlooking a quiet coastal cove"
                  loading="lazy"
                />
                <span>A WIDER VIEW.</span>
              </div>
              <div className="postcard postcard-front">
                <img
                  src="/media/forest.webp"
                  alt="Warm sunbeams on a woodland path"
                  loading="lazy"
                />
                <div>
                  <span>A LITTLE LESS NOISE.</span>
                  <span>↗</span>
                </div>
              </div>
              <div className="round-stamp">
                <Sun size={24} strokeWidth={1} />
                <span>
                  MORE OUTSIDE
                  <br />
                  IN YOUR EVERYDAY
                </span>
              </div>
              <svg
                className="collage-doodle"
                viewBox="0 0 140 90"
                fill="none"
                aria-hidden="true"
              >
                <path d="M9 76C122 92 135 14 79 18 39 20 65 60 101 34M97 23l7 12-14 4" />
              </svg>
            </div>
          </div>
          <div className="research-strip reveal">
            <span className="research-number">
              65<small>%</small>
            </span>
            <p>
              Wanted more time outside.
              <small>
                Among adults in England who hadn’t visited green space in the
                previous 14 days.
              </small>
            </p>
            <a href={source} target="_blank" rel="noopener noreferrer">
              NATURAL ENGLAND, 2024–25 <ArrowUpRight size={12} />
            </a>
          </div>
        </section>
        <section id="escapes" className="escapes section">
          <div className="section-label reveal">
            <span>02 — WHAT DOES YOUR DAY NEED?</span>
            <span>FOLLOW A FEELING.</span>
          </div>
          <div className="escapes-heading reveal">
            <h2>
              A change of pace.
              <br />
              <em>In a place that feels right.</em>
            </h2>
            <p>
              Not a thousand pins on a map.
              <br />A few good reasons to step outside.
            </p>
          </div>
          <div className="escape-cards">
            {moods.map((item, i) => (
              <a
                className={"escape-card reveal escape-" + i}
                key={item.id}
                href="#planner"
                onClick={() => {
                  setMood(item.id);
                  setMinutes(item.minutes);
                }}
              >
                <div className="escape-image">
                  <img src={item.image} alt={item.alt} loading="lazy" />
                  <span className="escape-index">0{i + 1}</span>
                  <span className="escape-tag">
                    <span /> {item.tag}
                  </span>
                  <span className="escape-arrow">
                    <ArrowUpRight size={20} />
                  </span>
                </div>
                <div className="escape-copy">
                  <span>{item.eyebrow}</span>
                  <h3>{item.name}</h3>
                  <p>
                    {i === 0
                      ? "Soft paths. Tall trees. A softer pace."
                      : i === 1
                        ? "Big skies and absolutely no rush."
                        : "Some fresh air between your thoughts."}
                  </p>
                </div>
              </a>
            ))}
          </div>
          <div className="gallery-foot">
            <span>LANDSCAPES TO SET THE MOOD. PLANS TO FIT YOUR LIFE.</span>
            <span>Generated scenes · illustrative destinations</span>
          </div>
        </section>
        <section id="planner" className="planner-section section">
          <div className="section-label reveal">
            <span>03 — A SMALL PLAN. A DIFFERENT DAY.</span>
            <span className="preview-pill">
              <i /> INTERACTIVE PRODUCT PREVIEW
            </span>
          </div>
          <div className="planner-heading reveal">
            <h2>
              Meet your next
              <br />
              <em>“glad I went.”</em>
            </h2>
            <p>
              Tell us what you have time for.
              <br />
              We’ll show you how a little escape could fit.
            </p>
          </div>
          <div className="reveal">
            <EscapePlanner initialMinutes={minutes} initialMood={mood} />
          </div>
          <p className="planner-note">
            Try the controls. Build a plan. Keep it for later.
            <span>
              The preview is real. These example outings aren’t navigable
              routes.
            </span>
          </p>
        </section>
        <section
          ref={scene}
          className="immersive"
          aria-label="A moment outside"
        >
          <div className="immersive-sticky">
            <div className="scene-frame">
              <NatureFilm
                src="/media/forest-film.mp4"
                poster="/media/forest-poster.webp"
                label="A clear stream moving through a mossy sunlit woodland"
                className="woodland-film"
              />
              <div className="scene-copy">
                <span>YOU DON’T HAVE TO GO FAR TO FEEL FAR AWAY.</span>
                <h2>
                  A little less
                  <br />
                  <em>on your mind.</em>
                  <br />A little more
                  <br />
                  <em>under your feet.</em>
                </h2>
                <span className="scene-bottom">
                  <Wind size={17} /> TAKE A BREATH. THIS BIT CAN WAIT.
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="details section">
          <div className="section-label reveal">
            <span>04 — THE LITTLE THINGS, THOUGHT THROUGH.</span>
            <span>YOU JUST BRING YOURSELF.</span>
          </div>
          <div className="details-grid">
            <div className="details-heading reveal">
              <h2>
                Spontaneous
                <br />
                shouldn’t mean
                <br />
                <em>starting from scratch.</em>
              </h2>
              <p>
                The planned app takes care of the small decisions that keep a
                good idea indoors.
              </p>
              <div className="field-note">
                <span className="note-pin" />
                <span>FIELD NOTE NO. 01</span>
                <p>
                  Leave room
                  <br />
                  for the way back.
                </p>
                <svg viewBox="0 0 150 60" fill="none" aria-hidden="true">
                  <path d="M5 39c25-41 40 11 68-10s44-17 66-4m-13-8 14 8-13 6" />
                </svg>
              </div>
            </div>
            <div className="detail-list">
              {[
                {
                  icon: Clock3,
                  title: "Your whole outing. Not just the walk.",
                  body: "Travel there, time to wander, and getting home. The return journey belongs in the plan from the start.",
                  tag: "PLANNED FOR THE FIRST RELEASE",
                },
                {
                  icon: CloudSun,
                  title: "A little foresight goes a long way.",
                  body: "Weather and daylight notes, plus a simple packing list, so you can check the essentials before heading out.",
                  tag: "PLANNED FOR THE FIRST RELEASE",
                },
                {
                  icon: Bookmark,
                  title: "Good places are worth keeping.",
                  body: "Save an escape for another day. We’re exploring downloadable outing cards and maps for the next step.",
                  tag: "SAVE AT LAUNCH · DOWNLOADS TO FOLLOW",
                },
                {
                  icon: Footprints,
                  title: "Start close. Go at your pace.",
                  body: "Choose your time, travel mode, and effort level. We’ll begin with curated places, then grow thoughtfully.",
                  tag: "CITY COVERAGE TO BE ANNOUNCED",
                },
              ].map(({ icon: Icon, title, body, tag }, i) => (
                <article className="reveal" key={title}>
                  <span className="detail-icon">
                    <Icon size={22} strokeWidth={1.2} />
                  </span>
                  <div>
                    <span className="detail-number">0{i + 1}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    <small>{tag}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="faq section">
          <div className="faq-heading reveal">
            <span className="section-label">BEFORE YOU LACE UP.</span>
            <h2>
              A few things
              <br />
              <em>you might wonder.</em>
            </h2>
          </div>
          <div className="faq-items reveal">
            {questions.map(([q, a], i) => (
              <article key={q}>
                <button
                  aria-expanded={faq === i}
                  aria-controls={"answer-" + i}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  {q}
                  {faq === i ? <Minus size={17} /> : <Plus size={17} />}
                </button>
                <div id={"answer-" + i} hidden={faq !== i}>
                  <p>{a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="early-access" className="early-access">
          <div className="signup-photo">
            <img
              src="/media/hills.webp"
              alt="A path through a meadow toward a green hill"
              loading="lazy"
            />
            <span>YOUR NEXT CHAPTER MIGHT START WITH A WALK.</span>
          </div>
          <div className="signup-content">
            <div className="signup-label">
              <span /> SOMETHING GOOD IS TAKING SHAPE.
            </div>
            <h2>
              There’s a little
              <br />
              <em>elsewhere</em>
              <br />
              with your name on it.
            </h2>
            <p>
              Join the early-access list.
              <br />
              Help us make room for more outside.
            </p>
            {status === "success" ? (
              <div className="signup-success" role="status">
                <Check size={24} />
                <div>
                  <strong>You’re on the list.</strong>
                  <span>Here’s to a little more outside.</span>
                </div>
              </div>
            ) : (
              <form className="signup-form" onSubmit={join}>
                <label className="sr-only" htmlFor="email">
                  Your email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="Your email address"
                  maxLength={254}
                  required
                />
                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <button disabled={status === "loading"} type="submit">
                  {status === "loading" ? "Saving..." : "Count me in"}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </form>
            )}
            {status === "error" && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="signup-fine">
              <span>Coming soon. No launch date yet.</span>
              <button onClick={() => setPrivacy(true)}>
                A note on your email <ArrowUpRight size={10} />
              </button>
            </div>
            <div className="signup-scribble">
              See you out there.<span>↗</span>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-top">
          <Logo />
          <p>A little closer to outside.</p>
          <a href="#top">
            Back to the beginning <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Elsewhere · An independent product concept.</span>
          <div>
            <button onClick={() => setPrivacy(true)}>Privacy note</button>
            <a href={source} target="_blank" rel="noopener noreferrer">
              The research <ArrowUpRight size={11} />
            </a>
          </div>
          <span>GENERATED LANDSCAPES. REAL INTENTIONS.</span>
        </div>
      </footer>
      {privacy && (
        <dialog
          ref={dialog}
          className="privacy-dialog"
          onCancel={() => setPrivacy(false)}
          onClick={() => setPrivacy(false)}
          aria-labelledby="privacy-title"
        >
          <div className="privacy-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="privacy-close"
              aria-label="Close privacy note"
              onClick={() => setPrivacy(false)}
            >
              <X size={20} />
            </button>
            <span className="section-label">A SHORT NOTE.</span>
            <h2 id="privacy-title">
              Your email.
              <br />
              <em>Just for Elsewhere.</em>
            </h2>
            <p>
              Joining stores your email address and signup time on this site’s
              server to register your interest in Elsewhere and possible product
              updates. We don’t send an automated email on signup.
            </p>
            <p>
              Temporary hashed request identifiers help limit abuse. Server
              access logs follow the host’s settings. There are no advertising
              analytics, and this preview does not request your location.
            </p>
            <p>
              Saved example plans stay in this browser. To request deletion of
              your waitlist entry, contact the site owner through sainiamit.com.
            </p>
            <a
              href="https://sainiamit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="green-button"
            >
              Contact the site owner <ArrowUpRight size={15} />
            </a>
          </div>
        </dialog>
      )}
    </>
  );
}
