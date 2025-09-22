# Steam Session Visualization

An interactive visualization for Steam play sessions built with Vite + ECharts. It parses connection_log.txt and content_log.txt, aggregates playtime, and renders multiple charts (24×7 heatmap, calendar heatmap, trends, treemap, etc.).

## Getting Started

```bash
npm install
npm run dev
# build
npm run build
```

## Project Structure

```
web/
  src/                # new TS modules live here (progressively migrated)
    aggregations/     # typed facades and future TS implementations
    charts/           # chart rendering modules (to be migrated from assets/src)
    i18n/             # en, zh-CN, and i18n runtime
    state/            # cache, aggregator client, hashing
    workers/          # worker types (future TS workers)
  index.html
vite.config.ts
```
