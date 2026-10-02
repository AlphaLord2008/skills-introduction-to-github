require('dotenv').config();

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Base64 product photos can be several MB — the default 100kb JSON body
// limit would reject them before they ever reach the handler.
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = 'claude-opus-4-8';

const SYSTEM_PROMPT = `You are an expert Etsy listing optimizer trained on Etsy's 2026 search
algorithm and buyer behavior data. Given a product photo and minimal
seller input, generate a complete, ready-to-use Etsy listing.

RULES YOU MUST FOLLOW:

TITLE:
- Maximum 70 characters (Etsy's 2026 soft cap — longer titles get flagged
  as keyword-stuffed and hurt mobile CTR)
- Lead with the clearest, most natural buyer-search phrase — not a string
  of disconnected keywords
- Must read as a real phrase a human would say, not "Keyword1, Keyword2,
  Keyword3, Gift, Cute, Custom"
- No repeated words across title and tags — every tag should cover a
  DIFFERENT search intent (occasion, audience, style, material, use case)

TAGS (13 total):
- Each tag must target a distinct buyer search intent — do not duplicate
  concepts already covered by the title or another tag
- Mix broad category tags with 2-4 word long-tail buyer-intent phrases
- No single-word filler tags ("cute," "gift" alone) unless paired with
  a modifier

DESCRIPTION:
- Opening line must hook a real reader in the first sentence — Etsy
  measures dwell time, so a description that's skimmed and abandoned
  hurts ranking, not just one that lacks keywords
- Written in natural, benefit-driven language a real buyer would want
  to read, not a keyword-dense wall of text
- Include material, dimensions/sizing, and care/use info ONLY if visible
  in the photo or provided by the seller — use "[confirm dimensions]" or
  similar placeholders rather than inventing specifics you can't verify
- End with a soft call to action

SHIPPING CHECK:
- If seller provides a shipping cost, flag if it exceeds $6 for US
  domestic — Etsy now penalizes listings above this threshold. Recommend
  absorbing shipping into item price if flagged.
- If no shipping cost provided, omit the flag (do not assume a value)

OUTPUT FORMAT: Return ONLY valid JSON, no other text, in this exact shape:
{
  "title": "string, max 70 chars",
  "tags": ["array", "of", "exactly", "13", "strings"],
  "description": "string",
  "shipping_flag": { "triggered": boolean, "note": "string or null" }
}`;

function buildContextText(context) {
  const {
    material,
    listingType,
    occasion,
    pricePoint,
    shippingCost,
  } = context;

  const lines = ['Seller-provided context (use only what applies; ignore blank fields):'];
  lines.push(`- Material: ${material || 'not provided'}`);
  lines.push(`- Listing type: ${listingType || 'not provided'}`);
  lines.push(`- Target occasion: ${occasion || 'not provided'}`);
  lines.push(`- Price point: ${pricePoint || 'not provided'}`);
  lines.push(
    `- Shipping cost (USD): ${shippingCost !== undefined && shippingCost !== '' ? shippingCost : 'not provided'}`
  );

  return lines.join('\n');
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

function extractListingJson(text) {
  // Claude is instructed to return only JSON, but strip code fences defensively
  // in case a stray ```json wrapper slips through.
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(trimmed);
}

function validateListing(listing) {
  if (!listing || typeof listing !== 'object') return 'Response was not a JSON object.';
  if (typeof listing.title !== 'string' || !listing.title) return 'Missing or invalid "title".';
  if (!Array.isArray(listing.tags) || listing.tags.length !== 13 || !listing.tags.every((t) => typeof t === 'string')) {
    return 'Missing or invalid "tags" (expected exactly 13 strings).';
  }
  if (typeof listing.description !== 'string' || !listing.description) return 'Missing or invalid "description".';
  if (
    !listing.shipping_flag ||
    typeof listing.shipping_flag !== 'object' ||
    typeof listing.shipping_flag.triggered !== 'boolean'
  ) {
    return 'Missing or invalid "shipping_flag".';
  }
  return null;
}

app.post('/api/generate-listing', async (req, res) => {
  try {
    const { image, material, listingType, occasion, pricePoint, shippingCost } = req.body || {};

    // A missing key throws a plain Error before any request is sent, so it
    // would skip the typed AuthenticationError branch below — check it here.
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY is not set. Add it to etsy-optimizer/.env and restart the server.',
      });
    }

    if (!image) {
      return res.status(400).json({ error: 'A product photo is required.' });
    }

    const parsedImage = parseDataUrl(image);
    if (!parsedImage) {
      return res.status(400).json({ error: 'Image must be a base64 data URL (e.g. data:image/png;base64,...).' });
    }

    const contextText = buildContextText({ material, listingType, occasion, pricePoint, shippingCost });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: parsedImage.mediaType,
                data: parsedImage.data,
              },
            },
            {
              type: 'text',
              text: `${contextText}\n\nGenerate the Etsy listing now.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'The AI response did not contain any text output.' });
    }

    let listing;
    try {
      listing = extractListingJson(textBlock.text);
    } catch (err) {
      return res.status(502).json({
        error: 'Could not parse the AI response as JSON. Please try again.',
        retryable: true,
      });
    }

    const validationError = validateListing(listing);
    if (validationError) {
      return res.status(502).json({
        error: `AI response failed validation: ${validationError}`,
        retryable: true,
      });
    }

    return res.json(listing);
  } catch (err) {
    console.error('generate-listing failed:', err);

    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'Invalid or missing ANTHROPIC_API_KEY on the server.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited by the Anthropic API. Please wait and try again.', retryable: true });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Anthropic API error: ${err.message}`, retryable: true });
    }

    return res.status(500).json({ error: 'Unexpected server error. Please try again.', retryable: true });
  }
});

app.listen(PORT, () => {
  console.log(`Etsy Listing Optimizer running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY is not set — add it to .env before generating listings.');
  }
});
