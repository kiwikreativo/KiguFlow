# Development server

If you detect a port running, work with that one. Restart it if needed, but do not start a server on a new port.

KiguFlow development uses port `4321`. If the server must be restarted, use `--port 4321 --strictPort` so Astro cannot fall back to another port.

# Design rules

## Modals

All modals use the shared `src/components/admin/Modal.tsx`. Do not build one-off modals.

- Never give the modal card a `max-height` with its own inner scroll (`max-h-* overflow-y-auto`). Brave/Chromium on Linux can fail to clip that inner scroll, so content (e.g. the submit button) paints outside the card after a repaint such as focusing an input.
- The card grows to fit its content (`m-auto`, no max height). The overlay (`fixed inset-0 flex overflow-y-auto`) is what scrolls on short screens. `m-auto` keeps the card centred without cutting off its top.
- The card does not clip, so any child touching its rounded edge needs its own radius (the sticky header has `rounded-t-[8px]`).
- Do not "fix" overflow with sticky buttons or background-colored box-shadows. They paint outside the card.
