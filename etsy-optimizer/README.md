# Etsy Listing Optimizer

A small local web app that takes a product photo plus optional seller context,
sends it to the Claude API, and returns an optimized Etsy listing (title, 13
tags, description, and a shipping-cost flag).

## Project structure

```
etsy-optimizer/
  server.js        Express backend + Anthropic API call
  .env             Your ANTHROPIC_API_KEY (not committed)
  public/
    index.html     Single-page UI
    style.css       Styling
    app.js          Upload, form handling, results rendering
  package.json
```

## Setup

1. **Install dependencies**

   ```bash
   cd etsy-optimizer
   npm install
   ```

2. **Add your Anthropic API key**

   Copy the example env file and fill in your key:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` so it contains:

   ```
   ANTHROPIC_API_KEY=your-actual-api-key-here
   ```

   Get a key from the [Anthropic Console](https://console.anthropic.com/). Never commit
   `.env` — it's already listed in `.gitignore`.

3. **Run it**

   ```bash
   npm start
   ```

   Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Using the app

1. Upload or drag-and-drop a product photo.
2. Optionally fill in material, handmade/vintage/POD, target occasion, price
   point, and shipping cost.
3. Click **Generate Listing**.
4. Review the title (with live character count vs. Etsy's 70-char cap), 13
   tags, description, and any shipping-cost warning. Use the **Copy** button
   next to each field to paste it straight into Etsy.

If the AI response can't be parsed or fails validation, the app shows a clear
error message with a **Retry** button instead of failing silently.

## Notes

- The backend calls `claude-opus-4-8` (a current vision-capable Claude model)
  via `@anthropic-ai/sdk`, sending the photo as a base64 image content block
  alongside the seller's context and a fixed system prompt.
- No database — everything is generated per-request and lives only in the
  browser session.
