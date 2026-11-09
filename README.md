# FEEDGUARD

A client-side React + TypeScript + Vite application for checking supplier inventory CSV files against a store catalog.

## Run locally
1. Install Node.js (18+ recommended).
2. In this folder run: `npm install`
3. Run: `npm run dev`

## Build
Run `npm run build`, then `npm run preview`.

## Important
- CSV parsing and validation happen in the browser. The app does not currently include user accounts, a server, payment processing, or paid-access enforcement.
- Prices are currently displayed with a `$` prefix.
- Test with sample data before using business-critical inventory files.
- This package has been assembled from the source shared in the ChatGPT conversation. A dependency install/build was not run in this environment, so run `npm install` and `npm run build` before publishing.
