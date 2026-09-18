const list = document.getElementById("list");
const clearButton = document.getElementById("clear");

function formatSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = value < 10 && unitIndex > 0 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function render(items) {
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No obvious media requests detected yet. Play the video in its Drive tab, then reopen this popup.";
    list.appendChild(empty);
    return;
  }

  const largestSize = items.reduce((max, item) => Math.max(max, item.size || 0), 0);

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item";
    if (item.size && item.size === largestSize) {
      row.classList.add("largest");
    }

    const main = document.createElement("div");
    main.className = "item-main";

    const top = document.createElement("div");
    top.className = "item-top";

    const chip = document.createElement("span");
    chip.className = `type-chip ${item.type}`;
    chip.textContent = item.itagLabel || item.type;
    top.appendChild(chip);

    const sizeText = formatSize(item.size);
    const sizeEl = document.createElement("span");
    sizeEl.className = sizeText ? "size" : "size unknown";
    sizeEl.textContent = sizeText || "size unknown";
    top.appendChild(sizeEl);

    const durationText = formatDuration(item.duration);
    if (durationText) {
      const durEl = document.createElement("span");
      durEl.className = "duration";
      durEl.textContent = durationText;
      top.appendChild(durEl);
    }

    if (item.size && item.size === largestSize) {
      const best = document.createElement("span");
      best.className = "badge-best";
      best.textContent = "Largest";
      top.appendChild(best);
    }

    main.appendChild(top);

    const urlEl = document.createElement("span");
    urlEl.className = "url";
    urlEl.textContent = item.cleanUrl;
    main.appendChild(urlEl);

    const openBtn = document.createElement("button");
    openBtn.className = "open-btn";
    openBtn.textContent = "Open";
    openBtn.title = "Open the full file in a new tab, then use ⋮ → Download";
    openBtn.addEventListener("click", () => {
      // cleanUrl already has the chunk-only params (range/rn/rbuf/ump/
      // srfvp) stripped, so this requests the whole file rather than one
      // byte range — the same fix you do manually before pasting the URL
      // into a new tab.
      chrome.tabs.create({ url: item.cleanUrl, active: true });
    });

    row.append(main, openBtn);
    list.appendChild(row);
  }
}

chrome.runtime.sendMessage({ type: "GET_MEDIA" }, (response) => {
  render(response?.items || []);
});

clearButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_MEDIA" }, () => {
    render([]);
  });
});
