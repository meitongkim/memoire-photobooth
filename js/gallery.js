/**
 * gallery.js — Meimonde Photo Booth
 * Renders saved photos as a responsive grid.
 * Handles download, delete, and clear-all actions.
 */

const galleryGrid     = document.getElementById('gallery-grid');
const galleryEmpty    = document.getElementById('gallery-empty');
const galleryCount    = document.getElementById('gallery-count');
const btnClearGallery = document.getElementById('btn-clear-gallery');

/* ── RENDER ── */

function refresh() {
  const photos = window.Capture.loadPhotos();
  updateCount(photos.length);

  // Remove existing cards
  galleryGrid.querySelectorAll('.gallery-card').forEach(c => c.remove());

  if (photos.length === 0) {
    galleryEmpty.style.display = 'block';
    return;
  }

  galleryEmpty.style.display = 'none';

  photos.forEach((photo, i) => {
    const card = createCard(photo, i);
    galleryGrid.appendChild(card);
  });

  // Also update footer rects with most recent strip
  updateFooterRects(photos);
}

function updateCount(n) {
  galleryCount.textContent = `${n} ${n === 1 ? 'photo' : 'photos'} saved`;
}

/* ── CARD FACTORY ── */

function createCard(photo, index) {
  const card = document.createElement('article');
  card.className = 'gallery-card';
  card.style.animationDelay = `${index * 50}ms`;
  card.dataset.id = photo.id;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'gallery-card__img-wrap';

  const img = document.createElement('img');
  img.src = photo.dataUrl;
  img.alt = photo.caption || 'Captured memory';
  img.loading = 'lazy';

  const actions = document.createElement('div');
  actions.className = 'gallery-card__actions';

  const btnDl = document.createElement('button');
  btnDl.className = 'gallery-card__action-btn';
  btnDl.textContent = 'download';
  btnDl.addEventListener('click', () => download(photo));

  const btnDel = document.createElement('button');
  btnDel.className = 'gallery-card__action-btn';
  btnDel.textContent = 'delete';
  btnDel.addEventListener('click', () => remove(photo.id, card));

  actions.append(btnDl, btnDel);
  imgWrap.append(img, actions);

  const body = document.createElement('div');
  body.className = 'gallery-card__body';

  const caption = document.createElement('p');
  caption.className = 'gallery-card__caption';
  caption.textContent = photo.caption || '';

  const meta = document.createElement('p');
  meta.className = 'gallery-card__meta';
  meta.textContent = formatDate(photo.timestamp);
  if (photo.filter && photo.filter !== 'none') {
    meta.textContent += ` · ${photo.filter}`;
  }

  body.append(caption, meta);
  card.append(imgWrap, body);
  return card;
}

/* ── FOOTER RECT: show recent strip thumbnails ── */
function updateFooterRects(photos) {
  const recentsEl = document.getElementById('footer-recent-strips');
  if (!recentsEl) return;

  const stripPhotos = photos.filter(p => p.type === 'strip').slice(0, 4);
  if (stripPhotos.length === 0) {
    recentsEl.innerHTML = '<span class="footer-rect__label">recent strips</span>';
    return;
  }

  recentsEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:2px;width:100%;height:100%;';

  stripPhotos.forEach(p => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow:hidden;position:relative;';
    const img = document.createElement('img');
    img.src = p.dataUrl;
    img.alt = 'Strip photo';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);';
    wrap.appendChild(img);
    grid.appendChild(wrap);
  });

  recentsEl.appendChild(grid);
}

/* ── ACTIONS ── */

function download(photo) {
  window.Strip.downloadDataUrl(photo.dataUrl, `meimonde-${photo.id}.jpg`);
}

function remove(id, cardEl) {
  cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  cardEl.style.opacity = '0';
  cardEl.style.transform = 'scale(0.96)';
  setTimeout(() => {
    window.Capture.deletePhoto(id);
    cardEl.remove();
    const remaining = galleryGrid.querySelectorAll('.gallery-card').length;
    updateCount(remaining);
    if (remaining === 0) galleryEmpty.style.display = 'block';
  }, 300);
}

function clearAll() {
  const n = galleryGrid.querySelectorAll('.gallery-card').length;
  if (!n) return;
  if (!confirm(`Delete all ${n} saved ${n === 1 ? 'photo' : 'photos'}? This cannot be undone.`)) return;
  window.Capture.clearAllPhotos();
  refresh();
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  refresh();
  btnClearGallery.addEventListener('click', clearAll);
  window.Filters.initFilterUI();
});

window.Gallery = { refresh };
