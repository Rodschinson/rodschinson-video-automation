#!/usr/bin/env node
/**
 * Rodschinson — Teaser PDF Renderer
 *
 * Renders property teaser HTML templates to A4 PDF + PNG thumbnail.
 *
 * USAGE:
 *   node teaser_renderer.js --script teaser.json --template teaser_hotel \
 *       --output-pdf out.pdf --output-thumb out.png \
 *       --brand-name "Rodschinson" --brand-primary "#08316F" --brand-accent "#C8A96E"
 */

'use strict';

const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');

// ── Parse CLI args ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : null; };
  return {
    script:       get('--script'),
    template:     get('--template') || 'teaser_building',
    outputPdf:    get('--output-pdf'),
    outputThumb:  get('--output-thumb'),
    brandName:    get('--brand-name')    || 'Rodschinson',
    brandPrimary: get('--brand-primary') || '#08316F',
    brandAccent:  get('--brand-accent')  || '#C8A96E',
  };
}

// ── Template resolution ─────────────────────────────────────────────────────
const TMPL_DIR = path.join(__dirname, 'templates');

function resolveTemplate(name) {
  const file = path.join(TMPL_DIR, `${name}.html`);
  if (fs.existsSync(file)) return file;
  // Fallback
  const fallback = path.join(TMPL_DIR, 'teaser_building.html');
  if (fs.existsSync(fallback)) return fallback;
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (!opts.script) {
    console.error('❌ Usage: node teaser_renderer.js --script PATH --template NAME --output-pdf PATH --output-thumb PATH');
    process.exit(1);
  }

  // Read teaser data
  const teaserData = JSON.parse(fs.readFileSync(opts.script, 'utf8'));

  // Resolve template
  const tmplPath = resolveTemplate(opts.template);
  if (!tmplPath) {
    console.error(`❌ Template "${opts.template}" not found in ${TMPL_DIR}`);
    process.exit(1);
  }

  console.log(`[teaser] Template: ${path.basename(tmplPath)}`);
  console.log(`[teaser] Brand: ${opts.brandName} (${opts.brandPrimary} / ${opts.brandAccent})`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();

    // A4 at 2x for crisp PDF: 794 × 1123 CSS px (A4 at 96 DPI)
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    await page.goto(`file://${tmplPath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 300));

    // Wait for fonts
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    // Inject brand colours
    await page.evaluate((brand) => {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', brand.primary);
      root.style.setProperty('--brand-accent', brand.accent);
      root.style.setProperty('--navy', brand.primary);
      root.style.setProperty('--gold', brand.accent);
    }, { primary: opts.brandPrimary, accent: opts.brandAccent });

    // Inject teaser data
    const loaded = await page.evaluate((data, brandName) => {
      if (typeof window.loadTeaser === 'function') {
        return window.loadTeaser(data, brandName);
      }
      return false;
    }, teaserData, opts.brandName);

    if (!loaded) {
      console.error('❌ Template loadTeaser() returned false — check template');
      process.exit(1);
    }

    // Small pause for rendering
    await new Promise(r => setTimeout(r, 200));

    // Generate PDF
    const pdfPath = opts.outputPdf || opts.script.replace(/\.json$/, '.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`[teaser] PDF → ${pdfPath}`);

    // Generate thumbnail PNG
    const thumbPath = opts.outputThumb || opts.script.replace(/\.json$/, '_thumb.png');
    await page.screenshot({
      path: thumbPath,
      type: 'png',
      fullPage: false,
    });
    console.log(`[teaser] Thumbnail → ${thumbPath}`);

    await page.close();

    // Output manifest
    const manifest = { pdf: pdfPath, thumbnail: thumbPath, template: opts.template };
    console.log(JSON.stringify(manifest));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
