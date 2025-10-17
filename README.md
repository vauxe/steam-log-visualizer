# Steam Log Visualizer

Steam Log Visualizer is a browser-based dashboard for exploring personal Steam play history. Drop your `connection_log.txt` and `content_log.txt` files straight from the Steam client logs and the app reconstructs sessions, aggregates playtime, and renders interactive charts locally in browser.

## Star Map

The `Star Map` tab renders a point cloud of Steam titles using Three.js. It consumes the bundled dataset at `web/public/data/steam_dataset.csv` (an extract of the Steam app list with embeddings). Use the search or random buttons to highlight games and review basic metadata.

## Project Structure

```
web/
	src/
		charts/          # ECharts renderers for dashboard widgets
		parsers/         # Log parsing helpers (account/session reconstruction)
		state/           # App state, aggregation cache, workers
		starMap/         # Three.js star map entry point
		workers/         # Aggregation workers invoked from the UI
```

## License

MIT
