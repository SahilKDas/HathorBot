# Canonical Hathor artwork

This directory contains one final transparent PNG per species. The running bot only reads these static assets; it never generates images or calls remove.bg.

Source renders are kept in the ignored `.tmp/imagegen/source/hathors` build directory. With `REMOVE_BG_API_KEY` configured locally, run:

```text
npm run assets:remove-bg
```

The Daycare background is intentionally opaque and lives at `assets/daycare/background.png`.
