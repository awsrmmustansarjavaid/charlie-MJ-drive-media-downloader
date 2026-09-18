const params = new URLSearchParams(location.search);
const src = params.get("src");
const type = params.get("type") === "audio" ? "audio" : "video";

const meta = document.getElementById("meta");
const slot = document.getElementById("player-slot");
const fallback = document.getElementById("fallback");
const rawLink = document.getElementById("raw-link");

if (!src) {
  meta.textContent = "No media URL was provided.";
} else {
  meta.textContent = `Loading ${type}…`;
  rawLink.href = src;

  // Loading the URL inside a <video>/<audio> element (rather than
  // navigating the tab straight to it) makes the browser request it as a
  // media resource instead of a document. That's what lets Google's
  // server stream it for playback instead of forcing a raw file download,
  // and it's what gives the native player its own download control.
  const el = document.createElement(type);
  el.controls = true;
  el.preload = "metadata";
  el.src = src;

  el.addEventListener("loadedmetadata", () => {
    const duration = Number.isFinite(el.duration) ? `${Math.round(el.duration)}s` : "";
    meta.textContent = [`${type === "audio" ? "Audio" : "Video"} loaded`, duration]
      .filter(Boolean)
      .join(" — ");
  });

  el.addEventListener("error", () => {
    meta.textContent = "This stream could not be loaded.";
    fallback.style.display = "block";
  });

  slot.appendChild(el);
}
