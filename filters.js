/**
 * filters.js — Mémoire Photobooth
 * Manages filter selection and canvas pixel manipulation.
 * All filters are applied directly to ImageData for full control.
 */

/* ── FILTER DEFINITIONS ── */

/**
 * Available filter configs.
 * Each entry: { label, id, apply(imageData) }
 */
const FILTERS = {

  /** No filter — pass through */
  none: {
    id: 'none',
    label: 'natural',
    apply(imageData) {
      return imageData; // untouched
    }
  },

  /** Classic black & white with luminance weights */
  bw: {
    id: 'bw',
    label: 'noir',
    apply(imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // ITU-R BT.601 luminance
        const lum = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
        data[i]   = lum;
        data[i+1] = lum;
        data[i+2] = lum;
      }
      return imageData;
    }
  },

  /** Warm vintage — lifted blacks, orange cast, slight desaturation */
  warm: {
    id: 'warm',
    label: 'golden hour',
    apply(imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];

        // Lift blacks (matte effect)
        r = Math.min(255, r * 0.88 + 30);
        g = Math.min(255, g * 0.82 + 18);
        b = Math.max(0,   b * 0.72 - 10);

        // Warm cast: boost red channel, slight cool reduction in blue
        r = Math.min(255, r + 18);
        g = Math.min(255, g + 6);
        b = Math.max(0,   b - 20);

        data[i]   = r;
        data[i+1] = g;
        data[i+2] = b;
      }
      return imageData;
    }
  },

  /**
   * Faded film — desaturated, lifted highlights, faded look
   * Simulates old 35mm with bleach bypass feel
   */
  fade: {
    id: 'fade',
    label: 'faded film',
    apply(imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];

        // Partial desaturation
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        const mix = 0.45;
        r = r * (1 - mix) + gray * mix;
        g = g * (1 - mix) + gray * mix;
        b = b * (1 - mix) + gray * mix;

        // Lift blacks (fade)
        r = r * 0.75 + 45;
        g = g * 0.75 + 42;
        b = b * 0.78 + 38;

        // Slight cool-neutral shift
        r = Math.min(255, r - 4);
        b = Math.min(255, b + 6);

        data[i]   = Math.min(255, r);
        data[i+1] = Math.min(255, g);
        data[i+2] = Math.min(255, b);
      }
      return imageData;
    }
  },

  /**
   * Dreamy — soft pink/lavender tint + subtle brightness lift
   * Romantic, hazy aesthetic
   */
  dreamy: {
    id: 'dreamy',
    label: 'dreamy',
    apply(imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];

        // Lift overall brightness
        r = r * 0.82 + 38;
        g = g * 0.80 + 32;
        b = b * 0.83 + 36;

        // Pink/lavender cast
        r = Math.min(255, r + 20);
        g = Math.min(255, g + 8);
        b = Math.min(255, b + 22);

        data[i]   = Math.min(255, r);
        data[i+1] = Math.min(255, g);
        data[i+2] = Math.min(255, b);
      }
      return imageData;
    }
  }

};

/* ── ACTIVE FILTER STATE ── */
let activeFilter = 'none';

/**
 * Returns the ID of the currently selected filter.
 * @returns {string}
 */
function getActiveFilter() {
  return activeFilter;
}

/**
 * Sets the active filter by ID.
 * @param {string} filterId
 */
function setActiveFilter(filterId) {
  if (!FILTERS[filterId]) {
    console.warn(`[filters] Unknown filter: "${filterId}", falling back to "none".`);
    filterId = 'none';
  }
  activeFilter = filterId;
}

/**
 * Applies the currently active filter to a canvas context.
 * Reads ImageData from the canvas, transforms it, and writes it back.
 * @param {HTMLCanvasElement} canvas
 */
function applyFilterToCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const filtered = FILTERS[activeFilter].apply(imageData);
  ctx.putImageData(filtered, 0, 0);
}

/**
 * Applies a specific named filter to a canvas (used in strip generation).
 * @param {HTMLCanvasElement} canvas
 * @param {string} filterId
 */
function applySpecificFilterToCanvas(canvas, filterId) {
  const filter = FILTERS[filterId] || FILTERS.none;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const filtered = filter.apply(imageData);
  ctx.putImageData(filtered, 0, 0);
}

/* ── FILTER UI BINDING ── */

/**
 * Binds filter button clicks to update active filter and re-style UI.
 * Called once on DOMContentLoaded.
 */
function initFilterUI() {
  const buttons = document.querySelectorAll('.filter-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterId = btn.dataset.filter;
      setActiveFilter(filterId);

      // Update aria + active class
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    });
  });
}

// Expose to other modules via window
window.Filters = {
  getActiveFilter,
  setActiveFilter,
  applyFilterToCanvas,
  applySpecificFilterToCanvas,
  initFilterUI,
  FILTERS
};
