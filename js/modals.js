/**
 * modals.js — Meimonde Photo Booth
 * All icon-bar modals: CD Studio (+ Spotify), Phone Booth Note,
 * Café Receipt, Menu (About / Submit form / Review).
 * Also manages frame-switching on the live viewport.
 */

/* ──────────────────────────────────────────
   MODAL HELPERS
   ────────────────────────────────────────── */

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  // Re-trigger animation by toggling a class
  const card = el.querySelector('.modal-card');
  if (card) {
    card.classList.remove('modal-animate');
    void card.offsetHeight;
    card.classList.add('modal-animate');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const card = el.querySelector('.modal-card');
  if (card) {
    card.style.animation = 'modalSlideDown 0.22s ease forwards';
    setTimeout(() => {
      el.style.display = 'none';
      card.style.animation = '';
    }, 220);
  } else {
    el.style.display = 'none';
  }
}

function bindBackdropClose(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.addEventListener('click', (e) => {
    if (e.target === el) closeModal(modalId);
  });
}

/* ──────────────────────────────────────────
   FRAME / VIEWPORT SWITCHING
   ────────────────────────────────────────── */

const FRAME_CLASSES = ['booth-mode--cd', 'booth-mode--phone', 'booth-mode--cafe'];

function applyBoothMode(mode) {
  const frame = document.getElementById('vintage-frame');
  if (!frame) return;

  FRAME_CLASSES.forEach(c => frame.classList.remove(c));
  window.BoothState.mode = mode;

  if (mode !== 'default') {
    frame.classList.add(`booth-mode--${mode}`);
  }

  // Update badge
  const badge = document.getElementById('mode-badge');
  if (badge) {
    const labels = { default: '', cd: '◎ CD Studio', phone: '☎ Phone Booth', cafe: '☕ Meimonda Café' };
    badge.textContent = labels[mode] || '';
    badge.style.opacity = mode === 'default' ? '0' : '1';
  }
}

/* ──────────────────────────────────────────
   CD STUDIO MODAL
   ────────────────────────────────────────── */

/* Pastel/matte color palette for the disc */
const CD_COLORS = [
  { name: 'Pearl',         value: '#e8e4df' },
  { name: 'Matcha',        value: '#b8cdb8' },
  { name: 'Petal Pink',    value: '#f0c8c8' },
  { name: 'Lavender',      value: '#cfc8e0' },
  { name: 'Dusty Rose',    value: '#d4a8a8' },
  { name: 'Sage',          value: '#a8baa8' },
  { name: 'Mist Blue',     value: '#b8c8d8' },
  { name: 'Ivory',         value: '#f4f0e8' },
  { name: 'Charcoal',      value: '#4a4440' },
  { name: 'Midnight',      value: '#2a2430' },
];

function initCDModal() {
  const titleInput   = document.getElementById('cd-title-input');
  const subInput     = document.getElementById('cd-sub-input');
  const titleDisplay = document.getElementById('cd-title-display');
  const subDisplay   = document.getElementById('cd-sub-display');
  const fontBtns     = document.querySelectorAll('.cd-font-btn');
  const disc         = document.getElementById('cd-disc');
  const btnBurn      = document.getElementById('btn-burn-cd');
  const burnOverlay  = document.getElementById('burn-overlay');
  const spotifyInput = document.getElementById('cd-spotify-input');
  const trackList    = document.getElementById('cd-tracklist');
  const btnAddTrack  = document.getElementById('btn-add-track');
  const colorGrid    = document.getElementById('cd-color-grid');

  // Populate color swatches
  if (colorGrid) {
    colorGrid.innerHTML = '';
    CD_COLORS.forEach((c, i) => {
      const swatch = document.createElement('button');
      swatch.className = 'cd-color-swatch' + (i === 0 ? ' active' : '');
      swatch.title = c.name;
      swatch.style.background = c.value;
      swatch.dataset.color = c.value;
      swatch.dataset.name  = c.name;
      swatch.addEventListener('click', () => {
        colorGrid.querySelectorAll('.cd-color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        applyDiscColor(c.value);
        window.BoothState.cd.color     = c.value;
        window.BoothState.cd.colorName = c.name;
      });
      colorGrid.appendChild(swatch);
    });
  }

  // Live title preview
  titleInput?.addEventListener('input', () => {
    const v = titleInput.value || 'your title';
    if (titleDisplay) titleDisplay.textContent = v;
    window.BoothState.cd.title = titleInput.value;
  });

  subInput?.addEventListener('input', () => {
    const v = subInput.value || 'subtitle';
    if (subDisplay) subDisplay.textContent = v;
    window.BoothState.cd.subtitle = subInput.value;
  });

  // Font selection
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (titleDisplay) titleDisplay.style.fontFamily = btn.dataset.font;
      window.BoothState.cd.font = btn.dataset.font;
    });
  });

  // Spotify URL
  spotifyInput?.addEventListener('input', () => {
    window.BoothState.cd.spotifyUrl = spotifyInput.value;
    updateSpotifyPreview(spotifyInput.value);
  });

  // Add track
  btnAddTrack?.addEventListener('click', () => {
    addTrackRow();
  });

  // Burn disc
  btnBurn?.addEventListener('click', async () => {
    collectTracks();
    closeModal('cd-modal');

    // Show burn animation
    if (burnOverlay) {
      burnOverlay.style.display = 'flex';
      burnOverlay.classList.add('burning');
    }

    setTimeout(async () => {
      if (burnOverlay) {
        burnOverlay.style.display = 'none';
        burnOverlay.classList.remove('burning');
      }

      // Generate album art
      const lastPhotos = window.Capture ? window.Capture.loadPhotos().slice(0, 4) : [];
      if (lastPhotos.length > 0) {
        const frames = lastPhotos.map(p => ({ dataUrl: p.dataUrl }));
        const art = await window.Strip.generateCDAlbum(frames);
        showAlbumModal(art);
      } else {
        showToast('Disc customized ✦ Take some photos first to generate album art!');
      }

      applyBoothMode('cd');
    }, 3200);
  });

  bindBackdropClose('cd-modal');
  document.getElementById('btn-close-cd')?.addEventListener('click', () => closeModal('cd-modal'));
}

function applyDiscColor(color) {
  const disc = document.getElementById('cd-disc');
  if (!disc) return;
  // Light or dark text based on brightness
  const hex = color.replace('#','');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  const brightness = (r*299 + g*587 + b*114) / 1000;
  const textColor = brightness > 150 ? '#2a2624' : '#f4f0e8';
  disc.style.background = `radial-gradient(circle at 35% 35%, ${lighten(color, 20)}, ${color}, ${darken(color, 15)})`;
  disc.querySelectorAll('.cd-label-title, .cd-label-sub').forEach(el => {
    el.style.color = textColor;
  });
}

function lighten(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}
function darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

function updateSpotifyPreview(url) {
  const preview = document.getElementById('cd-spotify-preview');
  if (!preview) return;
  if (url && url.includes('spotify')) {
    preview.innerHTML = `<span class="spotify-badge">🎵 Spotify playlist linked</span>`;
    // Extract embed URL
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) {
      const embed = document.getElementById('cd-spotify-embed');
      if (embed) {
        embed.src = `https://open.spotify.com/embed/playlist/${match[1]}?utm_source=generator&theme=0`;
        embed.style.display = 'block';
      }
    }
  } else {
    preview.innerHTML = '';
    const embed = document.getElementById('cd-spotify-embed');
    if (embed) embed.style.display = 'none';
  }
}

function addTrackRow(title = '', artist = '') {
  const trackList = document.getElementById('cd-tracklist');
  if (!trackList) return;
  const row = document.createElement('div');
  row.className = 'track-row';
  row.innerHTML = `
    <input type="text" class="track-title cd-input" placeholder="Track title" value="${title}" />
    <input type="text" class="track-artist cd-input" placeholder="Artist" value="${artist}" />
    <button class="track-remove" title="Remove">✕</button>
  `;
  row.querySelector('.track-remove').addEventListener('click', () => row.remove());
  trackList.appendChild(row);
}

function collectTracks() {
  const rows = document.querySelectorAll('.track-row');
  window.BoothState.cd.tracks = Array.from(rows).map(r => ({
    title:  r.querySelector('.track-title')?.value || '',
    artist: r.querySelector('.track-artist')?.value || ''
  })).filter(t => t.title);
}

/* Album art result modal */
function showAlbumModal(art) {
  // Reuse strip modal for showing album art
  const modal = document.getElementById('strip-modal');
  const img   = document.getElementById('strip-result-img');
  const title = modal?.querySelector('.modal-title');
  if (!modal || !img) return;
  img.src = art.front;
  if (title) title.textContent = 'Your album cover is ready.';
  modal.style.display = 'flex';

  // Add download back cover button if not already present
  let btnBack = document.getElementById('btn-download-back');
  if (!btnBack && art.back) {
    btnBack = document.createElement('button');
    btnBack.id = 'btn-download-back';
    btnBack.className = 'action-btn action-btn--ghost';
    btnBack.textContent = 'download back cover';
    btnBack.addEventListener('click', () => {
      window.Strip.downloadDataUrl(art.back, `meimonde-album-back-${Date.now()}.png`);
    });
    modal.querySelector('.modal-actions')?.appendChild(btnBack);
  }
}

/* ──────────────────────────────────────────
   PHONE BOOTH NOTE MODAL
   ────────────────────────────────────────── */

function initPhoneModal() {
  document.getElementById('btn-close-phone')?.addEventListener('click', () => closeModal('phone-modal'));
  bindBackdropClose('phone-modal');

  // Real-time note preview
  const noteInput = document.getElementById('phone-note-input');
  const sigInput  = document.getElementById('phone-sig-input');

  noteInput?.addEventListener('input', () => {
    window.BoothState.phone.note = noteInput.value;
    updateNotePreview();
  });

  sigInput?.addEventListener('input', () => {
    window.BoothState.phone.signature = sigInput.value;
    updateNotePreview();
  });

  // Apply phone mode and generate note strip
  document.getElementById('btn-apply-phone')?.addEventListener('click', async () => {
    collectNoteFields();
    applyBoothMode('phone');
    closeModal('phone-modal');
    showToast('📝 Phone Booth Note activated — take your photos!');
  });

  // Share strip
  document.getElementById('btn-phone-share')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-phone-share');
    if (!btn) return;

    // Dial animation
    btn.textContent = '📞 dialling…';
    btn.disabled = true;
    btn.classList.add('dialling');

    await delay(1800);

    const shareText = '📸 Check out my Meimonde phone booth strip!';
    const shareUrl  = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Meimonde', text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        showToast('Link copied to clipboard!');
      }
    } catch {}

    btn.textContent = '📞 share strip';
    btn.disabled = false;
    btn.classList.remove('dialling');
  });
}

function collectNoteFields() {
  const noteInput = document.getElementById('phone-note-input');
  const sigInput  = document.getElementById('phone-sig-input');
  window.BoothState.phone.note      = noteInput?.value || '';
  window.BoothState.phone.signature = sigInput?.value || '';
}

function updateNotePreview() {
  const preview = document.getElementById('phone-note-preview');
  if (!preview) return;
  const note = document.getElementById('phone-note-input')?.value || '';
  const sig  = document.getElementById('phone-sig-input')?.value || '';
  preview.innerHTML = `
    <p class="note-preview-text">${note || '<em>your note will appear here…</em>'}</p>
    ${sig ? `<p class="note-preview-sig">— ${sig}</p>` : ''}
  `;
}

/* ──────────────────────────────────────────
   CAFÉ MODE MODAL
   ────────────────────────────────────────── */

function initCafeModal() {
  document.getElementById('btn-close-cafe')?.addEventListener('click', () => closeModal('cafe-modal'));
  bindBackdropClose('cafe-modal');

  let selectedDrink = 'matcha';
  const opts = document.querySelectorAll('.cafe-opt');

  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      opts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedDrink = opt.dataset.cafe;
      window.BoothState.cafe.drink = selectedDrink;
    });
  });

  const nameInput = document.getElementById('cafe-name-input');
  nameInput?.addEventListener('input', () => {
    window.BoothState.cafe.customerName = nameInput.value;
  });

  document.getElementById('btn-apply-cafe')?.addEventListener('click', () => {
    window.BoothState.cafe.drink = selectedDrink;
    applyBoothMode('cafe');
    closeModal('cafe-modal');
    showToast(`☕ Meimonda Café activated — your receipt awaits!`);
  });
}

/* ──────────────────────────────────────────
   MENU MODAL
   ────────────────────────────────────────── */

function initMenuModal() {
  document.getElementById('btn-close-menu')?.addEventListener('click', () => closeModal('menu-modal'));
  bindBackdropClose('menu-modal');

  const menuItems = document.querySelectorAll('.menu-item');
  const panels    = ['about', 'submit', 'review'];

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      const target = item.dataset.panel;
      panels.forEach(p => {
        const el = document.getElementById(`panel-${p}`);
        if (el) el.style.display = (p === target) ? 'block' : 'none';
      });
    });
  });

  // Review: requires name + title + content, sends to email
  document.getElementById('btn-send-review')?.addEventListener('click', () => {
    const name    = document.getElementById('review-name')?.value?.trim() || '';
    const subject = document.getElementById('review-subject')?.value?.trim() || '';
    const body    = document.getElementById('review-textarea')?.value?.trim() || '';

    if (!name || !body) {
      showToast('Please fill in your name and review!', true);
      return;
    }

    const emailSubject = encodeURIComponent(`Meimonde Review: ${subject || 'My Experience'} by ${name}`);
    const emailBody    = encodeURIComponent(
      `Review by: ${name}\n\n${body}\n\n— Sent from Meimonde Photo Booth`
    );
    window.open(`mailto:meitongkimnyp@gmail.com?subject=${emailSubject}&body=${emailBody}`);
    showToast('Opening email — thank you for your review! ✦');
  });

  // Submission form
  document.getElementById('btn-submit-form')?.addEventListener('click', () => {
    const nameVal    = document.getElementById('submit-name')?.value?.trim();
    const handleVal  = document.getElementById('submit-handle')?.value?.trim();
    const emailVal   = document.getElementById('submit-email')?.value?.trim();
    const captionVal = document.getElementById('submit-caption')?.value?.trim();

    if (!nameVal || !emailVal) {
      showToast('Please fill in your name and email!', true);
      return;
    }

    const subject = encodeURIComponent(`Meimonde Submission by ${nameVal}`);
    const body    = encodeURIComponent(
      `Name: ${nameVal}\nHandle: ${handleVal || 'n/a'}\nEmail: ${emailVal}\n\nCaption: ${captionVal || ''}\n\n[Attach your photo below]\n\n— Submitted from Meimonde Photo Booth`
    );
    window.open(`mailto:meitongkimnyp@gmail.com?subject=${subject}&body=${body}`);
    showToast('Opening email — attach your photo and send! ✦');
  });
}

/* ──────────────────────────────────────────
   ICON BAR — modes + menu
   ────────────────────────────────────────── */

function initIconBar() {
  const iconModes = {
    'btn-mode-cd':    { modal: 'cd-modal',    mode: 'cd'    },
    'btn-mode-phone': { modal: 'phone-modal', mode: 'phone' },
    'btn-mode-cafe':  { modal: 'cafe-modal',  mode: 'cafe'  },
    'btn-menu':       { modal: 'menu-modal',  mode: null    }
  };

  Object.entries(iconModes).forEach(([btnId, cfg]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('active');

      // Clear all icon active states
      document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));

      if (!isActive) {
        btn.classList.add('active');
        openModal(cfg.modal);
      } else {
        // Deactivate mode if clicking same icon again
        if (cfg.mode) {
          applyBoothMode('default');
          showToast('Returned to classic booth');
        }
      }
    });
  });

  // Deactivate icon highlights when modals close
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
      }
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
    });
  });
}

/* ──────────────────────────────────────────
   TOAST NOTIFICATION
   ────────────────────────────────────────── */

function showToast(msg, isError = false) {
  let toast = document.getElementById('meimonde-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'meimonde-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' toast--error' : '');
  toast.classList.add('toast--visible');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('toast--visible'), 3200);
}

window.showToast = showToast;

/* ──────────────────────────────────────────
   UTILITY
   ────────────────────────────────────────── */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initIconBar();
  initCDModal();
  initPhoneModal();
  initCafeModal();
  initMenuModal();
});
