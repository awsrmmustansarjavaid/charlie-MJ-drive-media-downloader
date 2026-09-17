import React, { useState } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [items, setItems] = useState([]);

  // Add a media URL manually. This is useful for testing the UI
  // with a direct URL that the browser/user is authorized to download.
  function addUrl(event) {
    event.preventDefault();

    if (!url.trim()) return;

    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        url: url.trim(),
        type: "media",
        status: "Ready",
      },
    ]);

    setUrl("");
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">charlie MJ</p>
        <h1>drive-media-downloader</h1>
        <p className="subtitle">
          A simple browser UI for media you are authorized to download.
        </p>
      </section>

      <section className="card">
        <form onSubmit={addUrl}>
          <label htmlFor="media-url">Authorized media URL</label>
          <div className="input-row">
            <input
              id="media-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a direct media URL"
              spellCheck="false"
            />
            <button type="submit">Add</button>
          </div>
        </form>

        <p className="notice">
          This app does not bypass permissions, DRM, authentication, or
          intentional download restrictions.
        </p>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Download queue</h2>
          <span>{items.length} item(s)</span>
        </div>

        {items.length === 0 ? (
          <div className="empty">No media added yet.</div>
        ) : (
          <div className="queue">
            {items.map((item) => (
              <article className="queue-item" key={item.id}>
                <div className="item-info">
                  <strong>{item.type}</strong>
                  <small>{item.url}</small>
                  <span>{item.status}</span>
                </div>

                <div className="actions">
                  {/* The browser handles the actual authorized download. */}
                  <a href={item.url} download>
                    Download
                  </a>
                  <button onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
