/**
 * gallery.js — Mémoire Photobooth
 * Renders saved photos from localStorage as a responsive grid.
 * Handles download, delete, and clear-all actions.
 * Newest photos appear first.
 */

/* ── DOM REFERENCES ── */
const galleryGrid    = document.getElementById('gallery-grid');
const galleryEmpty   = document.getElementById('gallery-empty');
const galleryCount   = document.getElementById('gallery-count');
const btnClearGallery = document.getElementById('btn-clear-gallery');

/* ──────────────────────────────────────────
   RENDER
   ────────────────────────────────────────── */

/**
 * Refreshes the gallery grid from localStorage.
 * Called on page load and after each capture.
 */
function refresh() {
  const photos = window.Capture.loadPhotos(); // already sorted newest-first

  // Update count badge
  updateCount(photos.length);

  // Clear existing cards (keep empty state el)
  const existingCards = galleryGrid.querySelectorAll('.gallery-card');
  existingCards.forEach(c => c.remove());

  if (photos.length === 0) {
    galleryEmpty.style.display = 'block';
    return;
  }

  galleryEmpty.style.display = 'none';

  // Render each photo as a card
  photos.forEach((photo, index) => {
    const card = createCard(photo, index);
    galleryGrid.appendChild(card);
  });
}

/**
 * Updates the gallery photo count label.
 * @param {number} count
 */
function updateCount(count) {
  const word = count === 1 ? 'photo' : 'photos';
  galleryCount.textContent = `${count} ${word} saved`;
}

/* ──────────────────────────────────────────
   CARD FACTORY
   ────────────────────────────────────────── */

/**
 * Creates a gallery card DOM element for a photo object.
 * @param {Object} photo - { id, dataUrl, filter, caption, timestamp, type }
 * @param {number} index - for staggered animation delay
 * @returns {HTMLElement}
 */
function createCard(photo, index) {
  const card = document.createElement('article');
  card.className = 'gallery-card';
  card.style.animationDelay = `${index * 55}ms`;
  card.dataset.id = photo.id;

  // ── Image area ──
  const imgWrap = document.createElement('div');
  imgWrap.className = 'gallery-card__img-wrap';

  const img = document.createElement('img');
  img.src  = photo.dataUrl;
  img.alt  = photo.caption || 'Captured memory';
  img.loading = 'lazy';

  // ── Hover actions overlay ──
  const actions = document.createElement('div');
  actions.className = 'gallery-card__actions';
  actions.setAttribute('aria-label', 'Photo actions');

  const btnDownload = document.createElement('button');
  btnDownload.className = 'gallery-card__action-btn';
  btnDownload.textContent = 'download';
  btnDownload.setAttribute('aria-label', 'Download this photo');
  btnDownload.addEventListener('click', () => downloadSinglePhoto(photo));

  const btnDelete = document.createElement('button');
  btnDelete.className = 'gallery-card__action-btn';
  btnDelete.textContent = 'delete';
  btnDelete.setAttribute('aria-label', 'Delete this photo');
  btnDelete.addEventListener('click', () => deleteSinglePhoto(photo.id, card));

  actions.appendChild(btnDownload);
  actions.appendChild(btnDelete);

  imgWrap.appendChild(img);
  imgWrap.appendChild(actions);

  // ── Caption + meta ──
  const body = document.createElement('div');
  body.className = 'gallery-card__body';

  const caption = document.createElement('p');
  caption.className = 'gallery-card__caption';
  caption.textContent = photo.caption || '';

  const meta = document.createElement('p');
  meta.className = 'gallery-card__meta';
  meta.textContent = formatDate(photo.timestamp);

  // Filter badge if not default
  if (photo.filter && photo.filter !== 'none') {
    const badge = document.createElement('span');
    badge.className = 'gallery-card__filter-badge';
    badge.textContent = `· ${photo.filter}`;
    meta.appendChild(badge);
  }

  body.appendChild(caption);
  body.appendChild(meta);

  card.appendChild(imgWrap);
  card.appendChild(body);

  return card;
}

/* ──────────────────────────────────────────
   ACTIONS
   ────────────────────────────────────────── */

/**
 * Downloads a single photo as a JPEG file.
 * @param {Object} photo
 */
function downloadSinglePhoto(photo) {
  const filename = `memoire-${photo.id}.jpg`;
  window.Strip.downloadDataUrl(photo.dataUrl, filename);
}

/**
 * Deletes a single photo, removes its card with animation.
 * @param {string} id
 * @param {HTMLElement} cardEl
 */
function deleteSinglePhoto(id, cardEl) {
  // Animate out
  cardEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  cardEl.style.opacity    = '0';
  cardEl.style.transform  = 'scale(0.95)';

  setTimeout(() => {
    window.Capture.deletePhoto(id);
    cardEl.remove();

    // Update count and maybe show empty state
    const remaining = galleryGrid.querySelectorAll('.gallery-card').length;
    updateCount(remaining);
    if (remaining === 0) {
      galleryEmpty.style.display = 'block';
    }
  }, 350);
}

/**
 * Clears all photos after confirmation.
 */
function clearAll() {
  const count = galleryGrid.querySelectorAll('.gallery-card').length;
  if (count === 0) return;

  const confirmed = window.confirm(
    `Are you sure you want to delete all ${count} saved ${count === 1 ? 'photo' : 'photos'}? This cannot be undone.`
  );
  if (!confirmed) return;

  window.Capture.clearAllPhotos();
  refresh();
}

/* ──────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────── */

/**
 * Formats a timestamp into a human-readable date/time string.
 * @param {number} timestamp - Unix ms
 * @returns {string}
 */
function formatDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-GB', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  });
}

/* ──────────────────────────────────────────
   INIT
   ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Initial render from localStorage
  refresh();

  // Clear all button
  btnClearGallery.addEventListener('click', clearAll);

  // Initialise filter UI (defined in filters.js)
  window.Filters.initFilterUI();
});

/* ── EXPOSE ── */
window.Gallery = {
  refresh
};
