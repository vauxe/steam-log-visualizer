# Steam Log Visualizer

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://vauxe.github.io/steam-log-visualizer/)

Steam Log Visualizer is a browser-based dashboard for exploring personal Steam play history. Drop your `connection_log.txt` and `content_log.txt` files straight from the Steam client logs and the app reconstructs sessions, aggregates playtime, and renders interactive charts locally in browser.

## Live Demo

This project is deployed on GitHub Pages. You can try it out instantly in your browser.

**https://vauxe.github.io/steam-log-visualizer/**

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer (bundled with Node.js 18+)

### Install and run

```bash
git clone <repo-url>
npm install
npm run dev
```

## Bringing Your Steam Logs

The app expects the standard Steam client log files. On most systems they live in:

- Windows: `%ProgramFiles(x86)%/Steam/logs/`
- macOS: `~/Library/Application Support/Steam/logs/`
- Linux: `~/.steam/steam/logs/`

Select the latest `connection_log.txt` and `content_log.txt` from that directory. In the browser UI use the file picker (or drag-and-drop) to load both files. Once loaded, the dashboard rebuilds sessions and updates charts instantly.

## Star Map

The `Star Map` tab renders a point cloud of Steam titles using Three.js. It consumes the bundled dataset at `web/public/data/steam_dataset.csv` (an extract of the Steam app data). You can orbit, zoom, and filter directly in the browser.

## Development Workflow

- `npm run dev` – Start the Vite dev server with hot-module reload.
- `npm run build` – Generate a production build (type-check included via `tsc -b`).
- `npm run preview` – Serve the production build locally for smoke testing.
- `npm run lint` – Run ESLint against the TypeScript sources.
- `npm run test` – Execute Vitest-based unit tests.

## License

MIT
