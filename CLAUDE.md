# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Two unrelated things share this repo:

1. **GitHub Skills "Introduction to GitHub" course** (repo root, `.github/`, `images/`) — a template course driven entirely by GitHub Actions.
2. **`etsy-optimizer/`** — a standalone Node/Express web app that turns a product photo into an Etsy listing via the Claude API. It has its own `package.json`, `.gitignore` and README.

## Course mechanics (`.github/`)

- `.github/steps/-step.txt` holds the learner's current step (`0`–`4`, then `X`). Every workflow in `.github/workflows/` first reads this file and only runs its main job when the step matches its own number.
- Each workflow advances the course with `skills/action-update-step@v2`, which rewrites the root `README.md` with the matching `.github/steps/<n>-*.md` and bumps `-step.txt`. The root `README.md` is therefore generated — edit the step files, not the README.
- The workflows hard-code the branch name `my-first-branch` (step 1 fires on its creation, step 2 on pushes to it, step 3 on a PR from it). Pushes to `main` trigger steps 0 and 4. Renaming that branch, or editing `-step.txt` by hand, breaks course progression.

## etsy-optimizer

All commands run from `etsy-optimizer/`:

```bash
npm install
cp .env.example .env      # then set ANTHROPIC_API_KEY
npm start                 # http://localhost:3000 (override with PORT)
node --check server.js    # syntax check; there is no test suite, linter or build step
```

Run `npm start` from inside `etsy-optimizer/`: `express.static('public')` resolves relative to the working directory, so starting it from the repo root serves no frontend.

### Architecture

- **`server.js`** — single endpoint `POST /api/generate-listing`. Takes JSON `{ image, material, listingType, occasion, pricePoint, shippingCost }` where `image` is a base64 data URL (JSON body limit raised to 15 MB for this). Sends the image plus a seller-context text block to `anthropic.messages.create` with a fixed `SYSTEM_PROMPT`, then parses the text reply as JSON (stripping stray code fences) and validates it with `validateListing`.
- **Response contract** — the shape `{ title, tags[13], description, shipping_flag: { triggered, note } }` is defined in three places that must stay in sync: the OUTPUT FORMAT section of `SYSTEM_PROMPT`, `validateListing()` in `server.js`, and `renderResults()` in `public/app.js`.
- **Errors** — failures return `{ error, retryable }`; the frontend shows a Retry button only when `retryable` is true. Parse/validation failures and Anthropic API/rate-limit errors are retryable; auth and bad-input errors are not.
- **`public/`** — vanilla HTML/CSS/JS, no framework or bundler. `app.js` reads the photo with `FileReader` into a data URL and posts it; the 70-char title limit is mirrored client-side as `TITLE_LIMIT`.
- The model ID is the `MODEL` constant in `server.js`. No database — nothing is persisted.
