"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bike,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Footprints,
  Leaf,
  LoaderCircle,
  Mountain,
  Sparkles,
  Sun,
  Trees,
  Waves,
} from "lucide-react";
import "./planner.css";

type Mood = "forest" | "coast" | "hills";
type Travel = "foot" | "bike";
type Minutes = 60 | 90 | 180;
type Plan = { minutes: Minutes; mood: Mood; travel: Travel };

const durations: Minutes[] = [60, 90, 180];
const places = {
  forest: {
    label: "Deep greens",
    short: "Forest",
    title: "The woodland wander",
    detail: "A little shade. A slower pace. Room to hear yourself think.",
    stop: "Find a quiet clearing",
    icon: Trees,
  },
  coast: {
    label: "Open water",
    short: "Coast",
    title: "The shoreline reset",
    detail:
      "Follow the water. Breathe a little deeper. Let the horizon do its thing.",
    stop: "Pause by the water",
    icon: Waves,
  },
  hills: {
    label: "Higher ground",
    short: "Hills",
    title: "The change of perspective",
    detail:
      "A gentle climb, a wide-open view, and a little distance from your inbox.",
    stop: "Take in the view",
    icon: Mountain,
  },
};

function cleanMinutes(value: number): Minutes {
  return durations.includes(value as Minutes) ? (value as Minutes) : 90;
}

function budget(plan: Plan) {
  const outward = plan.minutes === 60 ? 12 : plan.minutes === 90 ? 18 : 30;
  const travel = plan.travel === "bike" ? Math.round(outward * 0.75) : outward;
  return { outward: travel, nature: plan.minutes - travel * 2, return: travel };
}

function planKey(plan: Plan) {
  return `${plan.minutes}-${plan.mood}-${plan.travel}`;
}

export default function EscapePlanner({
  initialMinutes = 90,
  initialMood = "forest",
}: {
  initialMinutes?: number;
  initialMood?: Mood;
}) {
  const [minutes, setMinutes] = useState<Minutes>(cleanMinutes(initialMinutes));
  const [mood, setMood] = useState<Mood>(initialMood);
  const [travel, setTravel] = useState<Travel>("foot");
  const [plan, setPlan] = useState<Plan>({
    minutes: cleanMinutes(initialMinutes),
    mood: initialMood,
    travel: "foot",
  });
  const [building, setBuilding] = useState(false);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const nextMinutes = cleanMinutes(initialMinutes);
    setMinutes(nextMinutes);
    setMood(initialMood);
    setPlan((current) => ({
      ...current,
      minutes: nextMinutes,
      mood: initialMood,
    }));
    setBuilding(false);
    setNotice("");
  }, [initialMinutes, initialMood]);
  useEffect(() => {
    if (!notice) return;
    const noticeTimer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(noticeTimer);
  }, [notice]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("elsewhere-saved-previews") || "[]",
      );
      if (Array.isArray(saved))
        setSavedKeys(
          saved.filter((item): item is string => typeof item === "string"),
        );
    } catch {
      /* A preview remains usable if local storage is unavailable. */
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const selectedPlace = places[plan.mood];
  const times = budget(plan);
  const isSaved = savedKeys.includes(planKey(plan));
  const isDirty =
    minutes !== plan.minutes || mood !== plan.mood || travel !== plan.travel;
  const LocationIcon = selectedPlace.icon;

  function buildPlan() {
    if (timer.current) clearTimeout(timer.current);
    setBuilding(true);
    setNotice("");
    const nextPlan = { minutes, mood, travel };
    timer.current = setTimeout(() => {
      setPlan(nextPlan);
      setBuilding(false);
      timer.current = null;
      setNotice(
        `Your ${minutes}-minute ${places[mood].short.toLowerCase()} preview is ready.`,
      );
    }, 550);
  }

  function savePlan() {
    const key = planKey(plan);
    const next = isSaved
      ? savedKeys.filter((item) => item !== key)
      : [...savedKeys, key];
    try {
      localStorage.setItem("elsewhere-saved-previews", JSON.stringify(next));
      setSavedKeys(next);
      setNotice(
        isSaved
          ? "Preview removed from this browser."
          : "Preview saved on this browser. A little possibility for later.",
      );
    } catch {
      setNotice(
        "This browser could not save the preview. You can still download it.",
      );
    }
  }

  function downloadPlan() {
    const text = [
      "ELSEWHERE — A little outside goes a long way.",
      "",
      selectedPlace.title,
      "ILLUSTRATIVE SAMPLE ONLY — NOT A REAL ROUTE OR NAVIGATION",
      "",
      `Time available: ${plan.minutes} minutes`,
      `Setting: ${selectedPlace.short}`,
      `Getting there: ${plan.travel === "foot" ? "On foot" : "By bike"}`,
      "",
      `Head out: ${times.outward} minutes`,
      `Time outside: ${times.nature} minutes`,
      `Come back: ${times.return} minutes`,
      `Total: ${plan.minutes} minutes`,
      "",
      selectedPlace.detail,
      "",
      "These are sample time budgets, not verified travel estimates. No location was used.",
      "The planned product will check routes, local weather, and daylight. Those features are not live in this preview.",
      "Choose a real destination and check access, conditions, daylight, and a trusted map before heading out.",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `elsewhere-${plan.mood}-${plan.minutes}min-preview.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your sample escape plan has been downloaded.");
  }

  return (
    <div className="ep-shell">
      <div className="ep-appbar">
        <div className="ep-app-name">
          <span className="ep-app-mark">
            <Leaf size={15} strokeWidth={1.7} />
          </span>{" "}
          your next elsewhere
          <span className="ep-preview-label">INTERACTIVE PREVIEW</span>
        </div>
        <span className="ep-app-status">
          <span /> Made for your in-between
        </span>
      </div>
      <div className="ep-workspace">
        <form
          className="ep-controls"
          onSubmit={(event) => {
            event.preventDefault();
            buildPlan();
          }}
        >
          <div className="ep-control-intro">
            <span className="ep-eyebrow">LET’S MAKE SOME ROOM</span>
            <h3>
              What does your
              <br />
              outside look like?
            </h3>
            <p>A few small choices. A whole different day.</p>
          </div>
          <fieldset
            className="ep-fieldset ep-duration-fieldset"
            disabled={building}
          >
            <legend>
              <span className="ep-step-number">01</span> How much time is yours?
            </legend>
            <div className="ep-time-display">
              <strong>{minutes}</strong>
              <span>minutes to spare</span>
              <Clock3 size={18} strokeWidth={1.5} />
            </div>
            <input
              aria-label="Time available in minutes"
              className="ep-time-range"
              type="range"
              min="0"
              max="2"
              step="1"
              value={durations.indexOf(minutes)}
              aria-valuetext={`${minutes} minutes`}
              onChange={(event) =>
                setMinutes(durations[Number(event.target.value)])
              }
              style={
                {
                  "--ep-range-fill": `${durations.indexOf(minutes) * 50}%`,
                } as CSSProperties
              }
            />
            <div className="ep-time-labels">
              <span>One little hour</span>
              <span>A slow afternoon</span>
            </div>
          </fieldset>
          <fieldset className="ep-fieldset" disabled={building}>
            <legend>
              <span className="ep-step-number">02</span> What are you craving?
            </legend>
            <div className="ep-mood-grid">
              {(Object.keys(places) as Mood[]).map((key) => {
                const Icon = places[key].icon;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`ep-mood ${mood === key ? "ep-mood-active" : ""}`}
                    aria-pressed={mood === key}
                    aria-label={places[key].label}
                    onClick={() => setMood(key)}
                  >
                    <span className="ep-mood-picture">
                      <img src={`/media/${key}.webp`} alt="" loading="lazy" />
                      <span className="ep-mood-check">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                    </span>
                    <span className="ep-mood-name">
                      <Icon size={13} />
                      {places[key].short}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset
            className="ep-fieldset ep-travel-fieldset"
            disabled={building}
          >
            <legend>
              <span className="ep-step-number">03</span> Find your own pace.
            </legend>
            <div className="ep-travel-options">
              <button
                type="button"
                className={travel === "foot" ? "ep-travel-active" : ""}
                aria-pressed={travel === "foot"}
                onClick={() => setTravel("foot")}
              >
                <Footprints size={16} />
                On foot
              </button>
              <button
                type="button"
                className={travel === "bike" ? "ep-travel-active" : ""}
                aria-pressed={travel === "bike"}
                onClick={() => setTravel("bike")}
              >
                <Bike size={18} />
                By bike
              </button>
            </div>
          </fieldset>
          <button className="ep-build" type="submit" disabled={building}>
            {building ? (
              <>
                <LoaderCircle size={18} className="ep-spin" />
                Making a little room…
              </>
            ) : (
              <>
                Build example plan
                <ArrowRight size={19} />
              </>
            )}
          </button>
          <p className="ep-control-note">
            <Sparkles size={12} />
            {isDirty
              ? "New possibilities. Ready when you are."
              : "A little taste of what’s coming."}
          </p>
        </form>

        <div
          className={`ep-result ${building ? "ep-result-building" : ""}`}
          aria-busy={building}
        >
          <div className="ep-photo" key={plan.mood}>
            <img
              className="ep-result-image"
              src={`/media/${plan.mood}.webp`}
              alt={
                plan.mood === "forest"
                  ? "Sunlight falling through a fern-lined woodland path"
                  : plan.mood === "coast"
                    ? "A peaceful, open coastal landscape"
                    : "A quiet path through rolling green hills"
              }
              loading="lazy"
            />
            <div className="ep-photo-shade" />
            <div className="ep-photo-top">
              <span className="ep-place-badge">
                <LocationIcon size={13} />A LITTLE{" "}
                {plan.mood === "forest"
                  ? "WILDER"
                  : plan.mood === "coast"
                    ? "CALMER"
                    : "HIGHER"}
              </span>
              <span className="ep-photo-index">
                ESCAPE NO.{" "}
                {plan.mood === "forest"
                  ? "001"
                  : plan.mood === "coast"
                    ? "002"
                    : "003"}
              </span>
            </div>
            <svg
              className="ep-route"
              viewBox="0 0 620 400"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="ep-route-shadow"
                d="M 113 292 C 177 312, 145 244, 220 229 S 384 231, 392 151 S 510 129, 491 71"
              />
              <path
                className="ep-route-line"
                d="M 113 292 C 177 312, 145 244, 220 229 S 384 231, 392 151 S 510 129, 491 71"
              />
              <circle cx="113" cy="292" r="13" fill="#f6f4e7" />
              <circle cx="113" cy="292" r="4" fill="#263d2d" />
              <circle cx="392" cy="151" r="15" fill="#e8eab9" />
              <path
                d="m386 152 4 4 8-10"
                stroke="#263d2d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="491" cy="71" r="12" fill="#f6f4e7" />
              <circle cx="491" cy="71" r="4" fill="#263d2d" />
            </svg>
            <span className="ep-waypoint ep-waypoint-start">A fresh start</span>
            <span className="ep-waypoint ep-waypoint-pause">
              {selectedPlace.stop}
            </span>
            <div className="ep-photo-bottom">
              <span className="ep-nature-pill">
                <Leaf size={13} />
                {times.nature} minutes of just being
              </span>
              <span className="ep-photo-disclaimer">
                Illustrative plan · not navigation
              </span>
            </div>
            {building && (
              <div className="ep-building-overlay">
                <span>
                  <LoaderCircle size={23} className="ep-spin" />
                </span>
              </div>
            )}
          </div>
          <div className="ep-plan-details">
            <div className="ep-plan-title-row">
              <div>
                <span className="ep-eyebrow">YOUR WINDOW TO THE WORLD</span>
                <h3>{selectedPlace.title}</h3>
              </div>
              <button
                className={`ep-save ${isSaved ? "ep-save-active" : ""}`}
                type="button"
                onClick={savePlan}
                aria-label={
                  isSaved
                    ? "Remove saved preview"
                    : "Save this preview in your browser"
                }
                aria-pressed={isSaved}
              >
                <Bookmark size={19} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="ep-plan-description">{selectedPlace.detail}</p>
            <div
              className="ep-budget"
              aria-label={`Sample time budget: ${times.outward} minutes out, ${times.nature} minutes outside, ${times.return} minutes back. ${plan.minutes} minutes total.`}
            >
              <div className="ep-budget-summary">
                <span>
                  <Clock3 size={13} />
                  Your time, well spent
                </span>
                <strong>
                  {plan.minutes} min<span> door to door</span>
                </strong>
              </div>
              <div className="ep-budget-bar" aria-hidden="true">
                <span
                  className="ep-budget-out"
                  style={{ flex: times.outward }}
                />
                <span
                  className="ep-budget-nature"
                  style={{ flex: times.nature }}
                />
                <span
                  className="ep-budget-return"
                  style={{ flex: times.return }}
                />
              </div>
              <div className="ep-budget-labels" aria-hidden="true">
                <span>
                  <i className="ep-dot-out" />
                  Head out <b>{times.outward}m</b>
                </span>
                <span>
                  <i className="ep-dot-nature" />
                  Be outside <b>{times.nature}m</b>
                </span>
                <span>
                  <i className="ep-dot-return" />
                  Come back <b>{times.return}m</b>
                </span>
              </div>
            </div>
            <div className="ep-plan-footer">
              <span className="ep-planned">
                <Sun size={15} />
                <span>
                  Weather & daylight checks<span>Planned for launch</span>
                </span>
              </span>
              <button
                type="button"
                className="ep-download"
                onClick={downloadPlan}
              >
                <ArrowDownToLine size={14} />
                Take this with you
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="ep-app-bottom">
        <span>
          <span className="ep-live-dot" />A working preview of a future product.
        </span>
        <span>Sample time budgets. No location required.</span>
      </div>
      <p
        className={`ep-notice ${notice ? "ep-notice-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </p>
    </div>
  );
}
