# charlie MJ - drive-media-downloader

A small React + Vite web UI paired with a Chrome extension for downloading media that the user is already authorized to access.

## Important scope

This project does **not** bypass Google Drive permissions, DRM, authentication, or an owner's intentional download restrictions. The extension only works with media URLs that are available to the browser in an authorized session and can be downloaded under the applicable permissions.

## Project structure

```text
charlie-MJ-drive-media-downloader/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
├── .gitignore
└── LICENSE
```

## How to run the frontend

Requirements: Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## How to load the Chrome extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the `extension` folder.
6. Pin the extension if desired.
7. Open a page containing media you are authorized to download.
8. Play the media and open the extension popup.

The extension keeps a small in-memory list of media requests observed by the browser. It does not upload those URLs to a server.

## Design

The frontend is intentionally independent from Google accounts. It provides the UI and can receive authorized media URLs through the extension messaging bridge.

For a production application, review Google's current terms and the permissions required by your chosen browser-extension architecture before publishing.

## License

MIT. See `LICENSE`.
