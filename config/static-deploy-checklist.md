# Static Deployment Checklist

- [ ] Remove Vercel rewrites routing all `/api/*` traffic to serverless handlers.
- [ ] Ensure no frontend code depends on `/api/*` for core page rendering.
- [ ] Route execution features through `kernel/runtime/runtime-fallback.js`.
- [ ] Route API-style calls through `kernel/api/noop-adapter.js`.
- [ ] Verify all static pages load with browser-only JS (no build step).
- [ ] Verify fallback banner/message is shown for offline execution features.
- [ ] Verify no runtime crash occurs when backend is unavailable.
- [ ] Verify site works on GitHub Pages pathing (relative URLs).
