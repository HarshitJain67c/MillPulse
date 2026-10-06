# MillPulse

MillPulse is a responsive textile production intelligence prototype for monitoring
output, quality, line status, downtime, and delivery risk from one operations
dashboard.

## Live demo

[harshitjain67c.github.io/MillPulse](https://harshitjain67c.github.io/MillPulse/)

## Features

- live production, target, quality, and risk KPIs
- seven-shift throughput visualization
- production-line search and status/facility filters
- rule-based attention queue for downtime and quality exceptions
- order-risk cards connected to production constraints
- production-entry workflow with input validation
- browser-local persistence and one-click demo reset
- CSV export for the production board
- responsive layouts for desktop, tablet, and mobile
- optional WebMCP tools for reading the dashboard and adding a local update

## Run locally

No package installation or build step is required.

```bash
python3 -m http.server 8013
```

Open `http://localhost:8013`.

## Verify

```bash
./verify.sh
```

## Architecture

This draft is deliberately dependency-free: semantic HTML, responsive CSS, and
plain JavaScript. Demo records persist in `localStorage`, making the prototype
safe to host as a static GitHub Pages site without a database or credentials.

For a production release, replace browser-local records with authenticated APIs,
a durable database, role-based access control, audit history, and live machine or
ERP integrations.

## Portfolio summary

> Built MillPulse, a mobile-responsive textile operations dashboard that unifies
> production output, line utilization, quality signals, downtime alerts, and
> delivery risk. Implemented validated data-entry workflows, local persistence,
> filtering, CSV export, and responsive data visualization in a dependency-free
> static application.

## License

[MIT](LICENSE)
