/**
 * strip.js — Meimonde Photo Booth
 * Mode-aware strip generation: default, cd, phone booth note, café receipt.
 * STRETCH FIX: all photo draws use center-cover cropping.
 */

/* ── GLOBAL BOOTH STATE (read by modals.js) ── */
window.BoothState = {
  mode: 'default', // 'default' | 'cd' | 'phone' | 'cafe'
  cd: {
    title:      'Meimonde',
    subtitle:   'a moment, kept',
    color:      '#e8e4df',     // disc surface color
    colorName:  'pearl',
    font:       "'Pinyon Script', cursive",
    spotifyUrl: '',
    tracks:     []             // [ { title, artist } ]
  },
  phone: {
    note:         '',
    signature:    '',
    activityLog:  []
  },
  cafe: {
    drink:        'matcha',
    customerName: ''
  }
};

/* ── STRIP DESIGN CONSTANTS ── */
const STRIP_BORDER = 28;
const STRIP_GAP    = 10;
const STRIP_FOOTER = 58;
const STRIP_WIDTH  = 400;
const PHOTO_IN_W   = STRIP_WIDTH - STRIP_BORDER * 2;
const PHOTO_IN_H   = Math.round(PHOTO_IN_W * 3 / 4); // 4:3 ratio

/* ── DOM REFERENCES ── */
const stripModal       = document.getElementById('strip-modal');
const stripResultImg   = document.getElementById('strip-result-img');
const btnDownloadStrip = document.getElementById('btn-download-strip');
const btnCloseStrip    = document.getElementById('btn-close-strip');

let lastStripDataUrl = null;

/* ══════════════════════════════════════════════
   CORE HELPER: CENTER-COVER CROP
   Draws an image into a rectangle using cover sizing
   (never stretches, always fills, crops overflow)
══════════════════════════════════════════════ */
function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth  || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  // Scale to cover destination rect
  const scale    = Math.max(dw / iw, dh / ih);
  const scaledW  = iw * scale;
  const scaledH  = ih * scale;
  const offsetX  = dx + (dw - scaledW) / 2;
  const offsetY  = dy + (dh - scaledH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
  ctx.restore();
}

/* ══════════════════════════════════════════════
   VIGNETTE HELPER
══════════════════════════════════════════════ */
function applyVignette(ctx, x, y, w, h) {
  const gradient = ctx.createRadialGradient(
    x + w / 2, y + h / 2, h * 0.25,
    x + w / 2, y + h / 2, h * 0.8
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.20)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

/* ══════════════════════════════════════════════
   IMAGE LOADER
══════════════════════════════════════════════ */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img  = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/* ══════════════════════════════════════════════
   DATE / TIME HELPERS
══════════════════════════════════════════════ */
function fmtDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(d = new Date()) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════
   ROUTER: chooses correct generator based on mode
══════════════════════════════════════════════ */
async function generateStrip(frames) {
  const mode = window.BoothState.mode;
  let dataUrl;

  if (mode === 'phone')  dataUrl = await generatePhoneNote(frames);
  else if (mode === 'cafe') dataUrl = await generateCafeReceipt(frames);
  else                   dataUrl = await generateClassicStrip(frames);

  lastStripDataUrl = dataUrl;
  return dataUrl;
}

/* ══════════════════════════════════════════════
   CLASSIC STRIP (default + cd mode)
══════════════════════════════════════════════ */
async function generateClassicStrip(frames) {
  const n = frames.length;
  const totalH =
    STRIP_BORDER * 2 + PHOTO_IN_H * n + STRIP_GAP * (n - 1) + STRIP_FOOTER;

  const canvas = document.createElement('canvas');
  canvas.width  = STRIP_WIDTH;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, STRIP_WIDTH, totalH);

  // Outer border double-rule
  ctx.strokeStyle = '#d4c5b0';
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, STRIP_WIDTH - 14, totalH - 14);
  ctx.strokeStyle = '#e8e0d5';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(11, 11, STRIP_WIDTH - 22, totalH - 22);

  // Photos
  for (let i = 0; i < n; i++) {
    const img = await loadImage(frames[i].dataUrl);
    const x = STRIP_BORDER;
    const y = STRIP_BORDER + i * (PHOTO_IN_H + STRIP_GAP);
    drawImageCover(ctx, img, x, y, PHOTO_IN_W, PHOTO_IN_H);
    applyVignette(ctx, x, y, PHOTO_IN_W, PHOTO_IN_H);
  }

  // Footer
  drawClassicFooter(ctx, STRIP_WIDTH, totalH);

  return canvas.toDataURL('image/png');
}

function drawClassicFooter(ctx, w, h) {
  const fy = h - STRIP_FOOTER;
  ctx.strokeStyle = '#d4c5b0';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(STRIP_BORDER, fy + 12);
  ctx.lineTo(w - STRIP_BORDER, fy + 12);
  ctx.stroke();

  ctx.fillStyle = '#8b7d6b';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtDate(), STRIP_BORDER + 4, fy + 30);

  ctx.fillStyle = '#2a2624';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('Meimonde.', w - STRIP_BORDER - 4, fy + 30);

  ctx.fillStyle = '#c9b99a';
  ctx.font = '9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('photos for every moment', w / 2, fy + 46);
}

/* ══════════════════════════════════════════════
   PHONE BOOTH NOTE STRIP
   Output: lined notepad paper, activity log,
   custom message + signature
══════════════════════════════════════════════ */
async function generatePhoneNote(frames) {
  const W = 420;
  const noteState = window.BoothState.phone;
  const log       = noteState.activityLog || [];
  const note      = noteState.note || '';
  const sig       = noteState.signature || '';

  // Measure needed height
  const photoH    = 90;
  const photoW    = 120;
  const stripH    = STRIP_BORDER + photoH * 2 + 10 * 3;
  const logH      = Math.max(0, log.length) * 20 + 20;
  const noteLines = Math.max(1, Math.ceil(note.length / 38));
  const totalH    = 80 + stripH + logH + noteLines * 22 + 120;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // ── Lined paper background ──
  ctx.fillStyle = '#fefcf8';
  ctx.fillRect(0, 0, W, totalH);

  // Horizontal ruled lines
  ctx.strokeStyle = '#dde6f0';
  ctx.lineWidth = 0.8;
  for (let y = 52; y < totalH; y += 24) {
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.lineTo(W - 20, y);
    ctx.stroke();
  }

  // Left margin red line
  ctx.strokeStyle = '#e8b4b0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, 0);
  ctx.lineTo(50, totalH);
  ctx.stroke();

  // Top tear edge (zigzag)
  ctx.fillStyle = '#fefcf8';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 14) {
    ctx.lineTo(x + 7, 8);
    ctx.lineTo(x + 14, 0);
  }
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();

  // Shadow for torn edge
  const tearGrad = ctx.createLinearGradient(0, 0, 0, 16);
  tearGrad.addColorStop(0, 'rgba(0,0,0,0.12)');
  tearGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tearGrad;
  ctx.fillRect(0, 0, W, 16);

  let curY = 36;

  // ── Header ──
  ctx.fillStyle = '#3a3230';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('PHOTO BOOTH', 60, curY);

  ctx.fillStyle = '#8a8480';
  ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate() + '  ' + fmtTime(), W - 24, curY);
  curY += 28;

  // ── Photos in 2-column strip layout ──
  const cols = 2;
  for (let i = 0; i < frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px  = 60 + col * (photoW + 12);
    const py  = curY + row * (photoH + 12);
    const img = await loadImage(frames[i].dataUrl);
    ctx.strokeStyle = '#d0c8be';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, photoW, photoH);
    drawImageCover(ctx, img, px, py, photoW, photoH);
    applyVignette(ctx, px, py, photoW, photoH);

    // Frame number label
    ctx.fillStyle = '#8a8480';
    ctx.font = 'italic 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${i + 1}`, px + photoW / 2, py + photoH + 11);
  }
  curY += Math.ceil(frames.length / cols) * (photoH + 18) + 16;

  // ── Divider ──
  ctx.strokeStyle = '#c8bfb4';
  ctx.lineWidth = 0.7;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(52, curY);
  ctx.lineTo(W - 20, curY);
  ctx.stroke();
  ctx.setLineDash([]);
  curY += 18;

  // ── Activity log ──
  if (log.length > 0) {
    ctx.fillStyle = '#6a6460';
    ctx.font = 'italic 10px Georgia, serif';
    ctx.textAlign = 'left';
    log.slice(-6).forEach(entry => {
      ctx.fillText(`— ${entry}`, 60, curY);
      curY += 18;
    });
    curY += 6;
  }

  // ── Personal note ──
  if (note) {
    ctx.fillStyle = '#3a3230';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'left';
    wrapText(ctx, note, 60, curY, W - 80, 22);
    curY += noteLines * 22 + 8;
  }

  // ── Signature ──
  if (sig) {
    ctx.strokeStyle = '#c0b8b0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(60, curY + 20);
    ctx.lineTo(200, curY + 20);
    ctx.stroke();

    ctx.fillStyle = '#3a3230';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(sig, 60, curY + 14);
    curY += 32;
  }

  // ── Bottom branding ──
  curY += 14;
  ctx.fillStyle = '#b8b0a8';
  ctx.font = 'italic 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Meimonde · photos for every moment', W / 2, curY);

  return canvas.toDataURL('image/png');
}

/* ══════════════════════════════════════════════
   CAFÉ RECEIPT STRIP
   Output: thermal-receipt style from "Meimonda Café"
══════════════════════════════════════════════ */
async function generateCafeReceipt(frames) {
  const W     = 380;
  const state = window.BoothState.cafe;
  const drink = state.drink === 'matcha' ? 'Matcha Latte' : 'Café au Lait';
  const name  = state.customerName || 'Guest';

  const photoH  = 80;
  const photoW  = W - 60;
  const totalH  = 80 + frames.length * (photoH + 14) + 240;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // ── Receipt white background with subtle texture ──
  ctx.fillStyle = '#fefefe';
  ctx.fillRect(0, 0, W, totalH);

  // Slight paper tint
  ctx.fillStyle = 'rgba(240,230,210,0.08)';
  ctx.fillRect(0, 0, W, totalH);

  // Receipt left and right edge shadows (simulate paper roll)
  const lGrad = ctx.createLinearGradient(0, 0, 12, 0);
  lGrad.addColorStop(0, 'rgba(0,0,0,0.06)');
  lGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lGrad;
  ctx.fillRect(0, 0, 12, totalH);
  const rGrad = ctx.createLinearGradient(W - 12, 0, W, 0);
  rGrad.addColorStop(0, 'rgba(0,0,0,0)');
  rGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = rGrad;
  ctx.fillRect(W - 12, 0, 12, totalH);

  let y = 24;

  // ── Store header ──
  ctx.fillStyle = '#1a1816';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('MEIMONDA CAFÉ', W / 2, y);
  y += 22;

  ctx.fillStyle = '#8a8480';
  ctx.font = '9px Courier New, monospace';
  ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', W / 2, y);
  y += 16;

  ctx.font = '9px Courier New, monospace';
  ctx.fillText(`Date: ${fmtDate()}   Time: ${fmtTime()}`, W / 2, y);
  y += 14;
  ctx.fillText(`Customer: ${name}`, W / 2, y);
  y += 14;

  ctx.fillStyle = '#1a1816';
  ctx.fillText('ORDER #MEI-' + String(Date.now()).slice(-5), W / 2, y);
  y += 14;

  ctx.fillStyle = '#8a8480';
  ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', W / 2, y);
  y += 18;

  // ── Order items ──
  ctx.font = '10px Courier New, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1a1816';
  ctx.fillText(`1x  ${drink} Frame`, 24, y);
  ctx.textAlign = 'right';
  ctx.fillText('♡', W - 24, y);
  y += 16;

  ctx.textAlign = 'left';
  ctx.fillText(`${frames.length}x  Photo Exposure`, 24, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${frames.length} shots`, W - 24, y);
  y += 16;

  if (window.BoothState.cd && window.BoothState.cd.spotifyUrl) {
    ctx.textAlign = 'left';
    ctx.fillText('1x  Soundtrack Pairing', 24, y);
    y += 16;
  }

  ctx.fillStyle = '#8a8480';
  ctx.textAlign = 'center';
  ctx.fillText('- - - - - - - - - - - - - - - - - - - -', W / 2, y);
  y += 18;

  // ── Photos ──
  for (let i = 0; i < frames.length; i++) {
    const img = await loadImage(frames[i].dataUrl);
    const px  = 30;
    const py  = y;

    // Drink-colored border
    const borderColor = state.drink === 'matcha' ? '#5a7a5a' : '#7a5a3a';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 1, py - 1, photoW + 2, photoH + 2);

    drawImageCover(ctx, img, px, py, photoW, photoH);
    applyVignette(ctx, px, py, photoW, photoH);

    // Frame label
    ctx.fillStyle = borderColor;
    ctx.font = 'italic 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`frame ${i + 1}`, W / 2, py + photoH + 13);

    y += photoH + 22;
  }

  // ── Footer ──
  y += 4;
  ctx.fillStyle = '#8a8480';
  ctx.font = '9px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', W / 2, y);
  y += 16;
  ctx.fillStyle = '#1a1816';
  ctx.font = 'italic 11px Georgia, serif';
  ctx.fillText('Thank you for visiting Meimonda Café.', W / 2, y);
  y += 16;
  ctx.font = '9px Georgia, serif';
  ctx.fillStyle = '#8a8480';
  ctx.fillText('Keep this receipt · share the memory', W / 2, y);
  y += 20;
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillStyle = '#2a2624';
  ctx.fillText('Meimonde.', W / 2, y);

  // Bottom zigzag tear
  ctx.fillStyle = '#fefefe';
  ctx.beginPath();
  ctx.moveTo(0, totalH);
  for (let x = 0; x <= W; x += 12) {
    ctx.lineTo(x + 6, totalH - 8);
    ctx.lineTo(x + 12, totalH);
  }
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/* ══════════════════════════════════════════════
   CD ALBUM ART GENERATOR (front + back pages)
   Called separately from the CD modal.
══════════════════════════════════════════════ */
async function generateCDAlbum(frames) {
  const W = 500, H = 500;
  const state = window.BoothState.cd;

  // ── FRONT COVER ──
  const front = document.createElement('canvas');
  front.width = W; front.height = H;
  const fCtx = front.getContext('2d');

  fCtx.fillStyle = state.color || '#e8e4df';
  fCtx.fillRect(0, 0, W, H);

  // Subtle noise overlay
  for (let i = 0; i < 4000; i++) {
    const nx = Math.random() * W, ny = Math.random() * H;
    fCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`;
    fCtx.fillRect(nx, ny, 1, 1);
  }

  // Photo strip column on the left
  const fPhW = 140, fPhH = 105;
  const fPhX = 30;
  for (let i = 0; i < Math.min(frames.length, 4); i++) {
    const img = await loadImage(frames[i].dataUrl);
    const fPhY = 40 + i * (fPhH + 8);
    drawImageCover(fCtx, img, fPhX, fPhY, fPhW, fPhH);
    applyVignette(fCtx, fPhX, fPhY, fPhW, fPhH);
  }

  // White vertical band
  fCtx.fillStyle = 'rgba(255,255,255,0.22)';
  fCtx.fillRect(fPhX + fPhW + 10, 0, 2, H);

  // Title area (right side)
  const tx = fPhX + fPhW + 30;
  fCtx.fillStyle = '#2a2624';
  fCtx.font = `italic 34px Georgia, serif`;
  fCtx.textAlign = 'left';

  // Render title using selected font (fallback since canvas can't load @import)
  const fontChoice = state.font.includes('Pinyon') ? 'italic 38px Georgia, serif' : `italic 30px Georgia, serif`;
  fCtx.font = fontChoice;
  wrapTextCanvas(fCtx, state.title || 'Meimonde', tx, 90, W - tx - 20, 44);

  fCtx.font = '12px Georgia, serif';
  fCtx.fillStyle = '#6a6460';
  fCtx.fillText(state.subtitle || '', tx, 160);

  // Date bottom right
  fCtx.font = '10px Georgia, serif';
  fCtx.fillStyle = '#8a8480';
  fCtx.textAlign = 'right';
  fCtx.fillText(fmtDate(), W - 20, H - 20);

  // ── BACK COVER ──
  const back = document.createElement('canvas');
  back.width = W; back.height = H;
  const bCtx = back.getContext('2d');

  bCtx.fillStyle = darken(state.color || '#e8e4df', 18);
  bCtx.fillRect(0, 0, W, H);

  // Noise
  for (let i = 0; i < 4000; i++) {
    const nx = Math.random() * W, ny = Math.random() * H;
    bCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`;
    bCtx.fillRect(nx, ny, 1, 1);
  }

  // Barcode-like decorative element
  for (let i = 0; i < 30; i++) {
    const bh = 20 + Math.random() * 50;
    const bx = 30 + i * 11;
    bCtx.fillStyle = `rgba(42,38,36,${0.25 + Math.random() * 0.3})`;
    bCtx.fillRect(bx, H - 30 - bh, 5 + Math.random() * 4, bh);
  }

  // Tracks
  bCtx.fillStyle = '#2a2624';
  bCtx.font = 'bold 11px Georgia, serif';
  bCtx.textAlign = 'left';
  bCtx.fillText('TRACKLIST', 30, 40);

  if (state.tracks && state.tracks.length > 0) {
    state.tracks.forEach((t, i) => {
      bCtx.font = '11px Georgia, serif';
      bCtx.fillStyle = '#4a4240';
      bCtx.fillText(`${String(i+1).padStart(2,'0')}. ${t.title}${t.artist ? ' — ' + t.artist : ''}`, 30, 62 + i * 18);
    });
  } else if (state.spotifyUrl) {
    bCtx.font = 'italic 11px Georgia, serif';
    bCtx.fillStyle = '#6a6460';
    bCtx.fillText('Playlist: ' + state.spotifyUrl.slice(0, 45) + (state.spotifyUrl.length > 45 ? '…' : ''), 30, 62);
  } else {
    bCtx.font = 'italic 11px Georgia, serif';
    bCtx.fillStyle = '#8a8480';
    bCtx.fillText('No tracks listed.', 30, 62);
  }

  // Bottom info
  bCtx.font = '9px Georgia, serif';
  bCtx.fillStyle = '#8a8480';
  bCtx.textAlign = 'center';
  bCtx.fillText('Meimonde · photos for every moment · meimonde.store', W / 2, H - 20);

  return {
    front: front.toDataURL('image/png'),
    back:  back.toDataURL('image/png')
  };
}

/* ── helpers ── */
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = word + ' ';
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, y);
}

function wrapTextCanvas(ctx, text, x, y, maxW, lineH) {
  wrapText(ctx, text, x, y, maxW, lineH);
}

/* ══════════════════════════════════════════════
   STRIP MODAL
══════════════════════════════════════════════ */
function showStripModal(dataUrl) {
  lastStripDataUrl = dataUrl;
  stripResultImg.src = dataUrl;
  stripModal.style.display = 'flex';
}

function closeStripModal() {
  stripModal.style.display = 'none';
}

/* ══════════════════════════════════════════════
   DOWNLOAD
══════════════════════════════════════════════ */
function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ── EVENTS ── */
document.addEventListener('DOMContentLoaded', () => {
  btnDownloadStrip.addEventListener('click', () => {
    if (!lastStripDataUrl) return;
    downloadDataUrl(lastStripDataUrl, `meimonde-strip-${Date.now()}.png`);
  });
  btnCloseStrip.addEventListener('click', closeStripModal);
  stripModal.addEventListener('click', (e) => {
    if (e.target === stripModal) closeStripModal();
  });
});

window.Strip = {
  generateStrip,
  generateCDAlbum,
  showStripModal,
  closeStripModal,
  downloadDataUrl,
  loadImage
};
