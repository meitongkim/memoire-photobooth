/**
 * capture.js — Mémoire Photobooth
 * Handles single-photo capture, strip sequence (4-photo countdown),
 * caption modal, and localStorage persistence.
 */

/* ── CONSTANTS ── */
const STORAGE_KEY      = 'memoire_photos';     // localStorage key
const STRIP_STORAGE_KEY = 'memoire_strip_photos'; // in-progress strip frames
const COUNTDOWN_SECS   = 3;                    // seconds between shots in strip
const PHOTO_WIDTH      = 1280;                 // capture resolution
const PHOTO_HEIGHT     = 960;

/* ── DOM REFERENCES ── */
const btnSingle      = document.getElementById('btn-single');
const btnStrip       = document.getElementById('btn-strip');
const btnResetStrip  = document.getElementById('btn-reset-strip');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber  = document.getElementById('countdown-number');
const flashOverlay   = document.getElementById('flash-overlay');
const statusMsg      = document.getElementById('status-msg');
const captionModal   = document.getElementById('caption-modal');
const modalPreviewImg = document.getElementById('modal-preview-img');
const captionInput   = document.getElementById('caption-input');
const btnSaveCaption = document.getElementById('btn-save-caption');
const btnSkipCaption = document.getElementById('btn-skip-caption');

/* ── MODULE STATE ── */
let isBusy           = false;    // prevents concurrent captures
let pendingPhoto     = null;     // photo awaiting caption { dataUrl, filter, timestamp }
let stripQueue       = [];       // collected frames for current strip (up to 4)
let captionResolve   = null;     // resolve function for caption promise

/* ──────────────────────────────────────────
   STORAGE HELPERS
   ────────────────────────────────────────── */

/**
 * Loads all saved photos from localStorage.
 * Returns array sorted newest-first.
 * @returns {Array<Object>}
 */
function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const photos = raw ? JSON.parse(raw) : [];
    return photos.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    console.warn('[capture] Failed to parse stored photos.');
    return [];
  }
}

/**
 * Saves a new photo object to localStorage.
 * Prepends newest first.
 * @param {Object} photo - { id, dataUrl, filter, caption, timestamp }
 */
function savePhoto(photo) {
  const photos = loadPhotos();
  photos.unshift(photo); // prepend newest
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    // localStorage quota exceeded — notify user
    setStatus('⚠ Storage full. Please clear some photos first.');
    console.error('[capture] localStorage quota exceeded:', e);
  }
}

/**
 * Deletes a single photo by ID from localStorage.
 * @param {string} id
 */
function deletePhoto(id) {
  const photos = loadPhotos().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

/**
 * Clears all photos from localStorage.
 */
function clearAllPhotos() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ──────────────────────────────────────────
   CAPTURE UTILITIES
   ────────────────────────────────────────── */

/**
 * Triggers the visual flash effect on the camera frame.
 */
function triggerFlash() {
  flashOverlay.classList.add('flashing');
  setTimeout(() => flashOverlay.classList.remove('flashing'), 180);
}

/**
 * Sets the status message displayed below the camera controls.
 * @param {string} msg
 */
function setStatus(msg) {
  statusMsg.textContent = msg;
}

/**
 * Creates a unique ID for each photo.
 * @returns {string}
 */
function generateId() {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Captures the current video frame, applies the active filter,
 * and returns a base64 data URL.
 * @returns {string} base64 PNG data URL
 */
function captureCurrentFrame() {
  const canvas = window.Camera.captureFrameToCanvas();
  window.Filters.applyFilterToCanvas(canvas);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/* ──────────────────────────────────────────
   COUNTDOWN HELPER
   ────────────────────────────────────────── */

/**
 * Displays a countdown from `from` to 1, then resolves.
 * @param {number} from - starting number (e.g. 3)
 * @returns {Promise<void>}
 */
function runCountdown(from) {
  return new Promise((resolve) => {
    let count = from;

    // Show overlay
    countdownOverlay.classList.add('active');
    countdownNumber.textContent = count;

    const tick = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(tick);
        countdownOverlay.classList.remove('active');
        countdownNumber.textContent = '';
        resolve();
      } else {
        // Re-trigger animation by cloning the element
        const fresh = countdownNumber.cloneNode(true);
        fresh.textContent = count;
        countdownNumber.parentNode.replaceChild(fresh, countdownNumber);
        // Re-cache reference after clone
        Object.assign(window, { countdownNumber: fresh });
        resolve;
        // Actually we just update text and restart animation via class toggle
        countdownNumber.textContent = count;
        countdownNumber.style.animation = 'none';
        void countdownNumber.offsetHeight; // reflow
        countdownNumber.style.animation = '';
      }
    }, 1000);
  });
}

/* ──────────────────────────────────────────
   CAPTION MODAL
   ────────────────────────────────────────── */

/**
 * Opens the caption modal for a just-captured photo.
 * Returns a Promise that resolves with the caption string (or '' if skipped).
 * @param {string} dataUrl - photo data URL for preview
 * @returns {Promise<string>}
 */
function promptForCaption(dataUrl) {
  return new Promise((resolve) => {
    captionResolve = resolve;

    // Show photo preview
    modalPreviewImg.src = dataUrl;
    captionInput.value = '';
    captionModal.style.display = 'flex';
    captionInput.focus();
  });
}

/**
 * Closes the caption modal.
 */
function closeCaptionModal() {
  captionModal.style.display = 'none';
  captionInput.value = '';
  modalPreviewImg.src = '';
}

/* Caption save */
btnSaveCaption.addEventListener('click', () => {
  const caption = captionInput.value.trim();
  closeCaptionModal();
  if (captionResolve) { captionResolve(caption); captionResolve = null; }
});

/* Caption skip */
btnSkipCaption.addEventListener('click', () => {
  closeCaptionModal();
  if (captionResolve) { captionResolve(''); captionResolve = null; }
});

/* Caption submit on Enter key */
captionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSaveCaption.click();
});

/* Close modal on backdrop click */
captionModal.addEventListener('click', (e) => {
  if (e.target === captionModal) {
    closeCaptionModal();
    if (captionResolve) { captionResolve(''); captionResolve = null; }
  }
});

/* ──────────────────────────────────────────
   SINGLE CAPTURE
   ────────────────────────────────────────── */

/**
 * Takes a single photo with a countdown, prompts for caption,
 * saves to localStorage, and triggers gallery refresh.
 */
async function captureSingle() {
  if (isBusy) return;
  isBusy = true;
  btnSingle.disabled = true;
  btnStrip.disabled  = true;

  try {
    setStatus('get ready…');
    await runCountdown(COUNTDOWN_SECS);

    // Flash + capture
    triggerFlash();
    const dataUrl = captureCurrentFrame();
    const filter  = window.Filters.getActiveFilter();

    setStatus('beautiful ✦ adding a caption?');

    // Prompt caption
    const caption = await promptForCaption(dataUrl);

    // Save to storage
    const photo = {
      id:        generateId(),
      dataUrl,
      filter,
      caption,
      timestamp: Date.now(),
      type:      'single'
    };
    savePhoto(photo);

    setStatus('memory saved ✦');
    setTimeout(() => setStatus(''), 3000);

    // Refresh gallery
    window.Gallery.refresh();

  } catch (err) {
    console.error('[capture] Single capture failed:', err);
    setStatus('Something went wrong. Please try again.');
  } finally {
    isBusy = false;
    btnSingle.disabled = false;
    btnStrip.disabled  = false;
  }
}

/* ──────────────────────────────────────────
   STRIP CAPTURE SEQUENCE
   ────────────────────────────────────────── */

/**
 * Runs a 4-photo strip sequence with countdowns between each shot.
 * Updates strip preview slots as each photo is taken.
 * On completion, triggers strip generation.
 */
async function captureStrip() {
  if (isBusy) return;
  isBusy = true;
  btnSingle.disabled    = true;
  btnStrip.disabled     = true;
  btnResetStrip.style.display = 'none';
  stripQueue = [];

  const totalShots = 4;

  try {
    for (let shot = 0; shot < totalShots; shot++) {
      setStatus(`photo ${shot + 1} of ${totalShots} — get ready…`);
      await runCountdown(COUNTDOWN_SECS);

      // Capture frame
      triggerFlash();
      const dataUrl = captureCurrentFrame();
      const filter  = window.Filters.getActiveFilter();

      // Store in queue
      stripQueue.push({ dataUrl, filter, timestamp: Date.now() });

      // Update strip preview slot
      updateStripSlot(shot, dataUrl);

      setStatus(`${shot + 1} of ${totalShots} captured ✦`);

      // Brief pause between shots (except last)
      if (shot < totalShots - 1) {
        await delay(800);
      }
    }

    setStatus('generating your strip…');

    // Generate the strip image
    const stripDataUrl = await window.Strip.generateStrip(stripQueue);

    // Save all individual frames to gallery
    for (const frame of stripQueue) {
      const photo = {
        id:        generateId(),
        dataUrl:   frame.dataUrl,
        filter:    frame.filter,
        caption:   '',
        timestamp: frame.timestamp,
        type:      'strip'
      };
      savePhoto(photo);
    }

    // Show strip modal
    window.Strip.showStripModal(stripDataUrl);

    setStatus('');
    btnResetStrip.style.display = 'inline-flex';

  } catch (err) {
    console.error('[capture] Strip capture failed:', err);
    setStatus('Something went wrong during the strip. Please try again.');
  } finally {
    isBusy = false;
    btnSingle.disabled = false;
    btnStrip.disabled  = false;
    window.Gallery.refresh();
  }
}

/**
 * Updates a strip preview thumbnail slot.
 * @param {number} index - 0–3
 * @param {string} dataUrl
 */
function updateStripSlot(index, dataUrl) {
  const slot = document.querySelector(`.strip-slot[data-index="${index}"]`);
  if (!slot) return;

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = `Strip photo ${index + 1}`;
  slot.innerHTML = '';
  slot.appendChild(img);
  slot.classList.add('filled');
}

/**
 * Resets all strip preview slots back to empty numbered placeholders.
 */
function resetStripSlots() {
  for (let i = 0; i < 4; i++) {
    const slot = document.querySelector(`.strip-slot[data-index="${i}"]`);
    if (!slot) continue;
    slot.innerHTML = `<span>${i + 1}</span>`;
    slot.classList.remove('filled');
  }
  stripQueue = [];
  btnResetStrip.style.display = 'none';
  setStatus('');
}

/* ──────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────── */

/**
 * Simple promise-based delay.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ──────────────────────────────────────────
   EVENT BINDINGS
   ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  btnSingle.addEventListener('click', captureSingle);
  btnStrip.addEventListener('click', captureStrip);
  btnResetStrip.addEventListener('click', resetStripSlots);
});

/* ── EXPOSE ── */
window.Capture = {
  captureSingle,
  captureStrip,
  loadPhotos,
  savePhoto,
  deletePhoto,
  clearAllPhotos,
  generateId
};
