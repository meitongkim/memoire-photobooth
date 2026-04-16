/**
 * strip.js — Mémoire Photobooth
 * Generates a vertical 4-photo strip on a canvas:
 * white border, spacing, optional branding text.
 * Exports as a downloadable PNG.
 */

/* ── STRIP DESIGN CONSTANTS ── */
const STRIP_BORDER   = 28;   // outer white border (px)
const STRIP_GAP      = 12;   // gap between photos (px)
const STRIP_FOOTER   = 56;   // footer area height for branding text (px)
const STRIP_RATIO    = 4/3;  // each photo aspect ratio
const STRIP_WIDTH    = 420;  // total strip width (px) — tall and narrow
const PHOTO_IN_W     = STRIP_WIDTH - STRIP_BORDER * 2;
const PHOTO_IN_H     = Math.round(PHOTO_IN_W / STRIP_RATIO);

/* ── DOM REFERENCES ── */
const stripModal       = document.getElementById('strip-modal');
const stripResultImg   = document.getElementById('strip-result-img');
const btnDownloadStrip = document.getElementById('btn-download-strip');
const btnCloseStrip    = document.getElementById('btn-close-strip');

/* ── MODULE STATE ── */
let lastStripDataUrl = null; // most recently generated strip

/* ──────────────────────────────────────────
   STRIP GENERATION
   ────────────────────────────────────────── */

/**
 * Generates a vertical photo strip from an array of frame objects.
 * Each frame: { dataUrl, filter, timestamp }
 * Returns a Promise that resolves to the strip data URL (PNG).
 *
 * @param {Array<{dataUrl:string, filter:string, timestamp:number}>} frames
 * @returns {Promise<string>} base64 PNG data URL
 */
async function generateStrip(frames) {
  // Compute total canvas height
  const numPhotos   = frames.length;
  const totalHeight =
    STRIP_BORDER * 2                       // top + bottom border
    + PHOTO_IN_H * numPhotos               // photos stacked
    + STRIP_GAP * (numPhotos - 1)          // gaps between photos
    + STRIP_FOOTER;                        // branding footer

  const canvas = document.createElement('canvas');
  canvas.width  = STRIP_WIDTH;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');

  // ── Background: warm white ──
  ctx.fillStyle = '#faf7f3';
  ctx.fillRect(0, 0, STRIP_WIDTH, totalHeight);

  // ── Subtle border decoration ──
  ctx.strokeStyle = '#d4c5b0';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, STRIP_WIDTH - 16, totalHeight - 16);

  ctx.strokeStyle = '#e0d5c5';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(12, 12, STRIP_WIDTH - 24, totalHeight - 24);

  // ── Load and draw each photo ──
  for (let i = 0; i < numPhotos; i++) {
    const frame = frames[i];
    const img   = await loadImage(frame.dataUrl);

    const x = STRIP_BORDER;
    const y = STRIP_BORDER + i * (PHOTO_IN_H + STRIP_GAP);

    // Draw photo
    ctx.drawImage(img, x, y, PHOTO_IN_W, PHOTO_IN_H);

    // Optional: subtle vignette per photo
    applyVignette(ctx, x, y, PHOTO_IN_W, PHOTO_IN_H);
  }

  // ── Branding footer text ──
  drawStripFooter(ctx, STRIP_WIDTH, totalHeight);

  // ── Store and return ──
  lastStripDataUrl = canvas.toDataURL('image/png');
  return lastStripDataUrl;
}

/* ──────────────────────────────────────────
   VIGNETTE HELPER
   ────────────────────────────────────────── */

/**
 * Draws a subtle radial vignette over a photo rectangle.
 * Adds depth and vintage feel.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function applyVignette(ctx, x, y, w, h) {
  const gradient = ctx.createRadialGradient(
    x + w / 2, y + h / 2, h * 0.2,  // inner circle
    x + w / 2, y + h / 2, h * 0.75  // outer circle
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.18)');

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

/* ──────────────────────────────────────────
   FOOTER BRANDING
   ────────────────────────────────────────── */

/**
 * Draws the decorative footer area at the bottom of the strip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} stripW
 * @param {number} stripH
 */
function drawStripFooter(ctx, stripW, stripH) {
  const footerY = stripH - STRIP_FOOTER;

  // Separator line
  ctx.strokeStyle = '#d4c5b0';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(STRIP_BORDER, footerY + 12);
  ctx.lineTo(stripW - STRIP_BORDER, footerY + 12);
  ctx.stroke();

  // Date string
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  ctx.fillStyle = '#8b7d6b';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, STRIP_BORDER + 4, footerY + 30);

  // Brand name — right aligned
  // Use a fallback serif since canvas doesn't load web fonts by default
  ctx.fillStyle = '#2c2218';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('Mémoire', stripW - STRIP_BORDER - 4, footerY + 30);

  // Tagline
  ctx.fillStyle = '#c9b99a';
  ctx.font = '9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('a moment, kept forever', stripW / 2, footerY + 46);
}

/* ──────────────────────────────────────────
   IMAGE LOADER HELPER
   ────────────────────────────────────────── */

/**
 * Loads a data URL or URL into an HTMLImageElement.
 * Returns a Promise that resolves when the image is ready.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 40)}…`));
    img.src = src;
  });
}

/* ──────────────────────────────────────────
   STRIP MODAL
   ────────────────────────────────────────── */

/**
 * Displays the generated strip in the result modal.
 * @param {string} dataUrl - PNG strip data URL
 */
function showStripModal(dataUrl) {
  lastStripDataUrl = dataUrl;
  stripResultImg.src = dataUrl;
  stripModal.style.display = 'flex';
}

/**
 * Closes the strip modal.
 */
function closeStripModal() {
  stripModal.style.display = 'none';
}

/* ──────────────────────────────────────────
   DOWNLOAD
   ────────────────────────────────────────── */

/**
 * Downloads a data URL as a file.
 * @param {string} dataUrl
 * @param {string} filename
 */
function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href     = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ──────────────────────────────────────────
   EVENT BINDINGS
   ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Download strip
  btnDownloadStrip.addEventListener('click', () => {
    if (!lastStripDataUrl) return;
    const filename = `memoire-strip-${Date.now()}.png`;
    downloadDataUrl(lastStripDataUrl, filename);
  });

  // Close strip modal
  btnCloseStrip.addEventListener('click', closeStripModal);

  // Close on backdrop click
  stripModal.addEventListener('click', (e) => {
    if (e.target === stripModal) closeStripModal();
  });
});

/* ── EXPOSE ── */
window.Strip = {
  generateStrip,
  showStripModal,
  closeStripModal,
  downloadDataUrl
};
