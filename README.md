# daxini.xyz deployment notes

## Production deployment (Vercel)

This repo is deployed directly as static HTML/CSS/JS plus `api/index.js` serverless routes.

### Required commands

- `npm run build` → predeploy validation checks
- `npm run smoke` → smoke tests for homepage, assets, and critical rewrites
- `npm run vercel-build` → Vercel build command (runs both checks and fails deploy on regression)

### Why this prevents UI regressions

- Service worker cache versioning in `sw.js` is pinned and updated so stale old homepage shells are not kept forever.
- `vercel.json` sets explicit rewrites for `/zayvora` and `/workspace` and no-cache headers for `sw.js`.
- Validation and smoke scripts fail CI/deploy if core UI files, brand markers, assets, or route rewrites disappear.

### Operational checklist

1. Keep `index.html`, `workspace.html`, and `zayvora.html` committed at repo root.
2. Keep `assets/` paths valid and relative to site root.
3. Do not bypass `npm run vercel-build` in Vercel project settings.
