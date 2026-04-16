/**
 * camera.js — Mémoire Photobooth
 * Manages webcam access, live video preview, and stream lifecycle.
 * Handles permission errors gracefully with styled error UI.
 */

/* ── DOM REFERENCES ── */
const videoEl      = document.getElementById('video');
const cameraError  = document.getElementById('camera-error');
const captureCanvas = document.getElementById('capture-canvas');

/* ── STREAM STATE ── */
let mediaStream = null;

/**
 * Returns the live MediaStream if active.
 * @returns {MediaStream|null}
 */
function getStream() {
  return mediaStream;
}

/**
 * Returns the video element reference.
 * @returns {HTMLVideoElement}
 */
function getVideoElement() {
  return videoEl;
}

/**
 * Initialises the webcam.
 * Requests video (no audio), shows stream in <video>,
 * or shows an error state on failure.
 */
async function initCamera() {
  // Gracefully handle browsers without getUserMedia
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError('Your browser does not support camera access. Please try Chrome or Firefox.');
    return;
  }

  try {
    const constraints = {
      video: {
        width:       { ideal: 1280 },
        height:      { ideal: 960 },
        facingMode:  'user'          // prefer front camera on mobile
      },
      audio: false
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = mediaStream;

    // Wait until video metadata is ready before allowing capture
    await new Promise((resolve) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play();
        resolve();
      };
    });

    // Sync canvas size to actual video dimensions
    syncCanvasToVideo();

    // Hide any error state (in case of retry)
    cameraError.style.display = 'none';
    videoEl.style.display     = 'block';

    console.log('[camera] Stream active:', mediaStream.getVideoTracks()[0].label);

  } catch (err) {
    handleCameraError(err);
  }
}

/**
 * Maps canvas to the video's NATIVE resolution.
 * This is the key fix for preventing stretch — never assume dimensions.
 */
function syncCanvasToVideo() {
  captureCanvas.width  = videoEl.videoWidth  || 1280;
  captureCanvas.height = videoEl.videoHeight || 720;
}

/**
 * Captures the current video frame at NATIVE resolution.
 * STRETCH FIX: always re-sync to actual videoWidth/videoHeight before drawing,
 * so the canvas always matches the real pixel dimensions of the stream.
 * The CSS `transform: scaleX(-1)` mirror is visual-only and not captured here.
 * @returns {HTMLCanvasElement}
 */
function captureFrameToCanvas() {
  // Re-sync every capture in case resolution changed (mobile rotation etc.)
  captureCanvas.width  = videoEl.videoWidth;
  captureCanvas.height = videoEl.videoHeight;

  // willReadFrequently = true → optimize for getImageData calls (filters)
  const ctx = captureCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas;
}

/**
 * Stops all video tracks, releasing the camera.
 */
function stopCamera() {
  if (!mediaStream) return;
  mediaStream.getTracks().forEach(track => track.stop());
  mediaStream = null;
  videoEl.srcObject = null;
  console.log('[camera] Stream stopped.');
}

/* ── ERROR HANDLING ── */

/**
 * Routes camera API errors to appropriate user messages.
 * @param {Error} err
 */
function handleCameraError(err) {
  console.error('[camera] Error:', err.name, err.message);

  let message = 'An unexpected error occurred while accessing the camera.';

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      message = 'Camera permission was denied. Please click the camera icon in your browser\'s address bar and allow access, then refresh.';
      break;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      message = 'No camera was found on your device. Please connect a camera and refresh.';
      break;
    case 'NotReadableError':
    case 'TrackStartError':
      message = 'Your camera is already in use by another application. Please close it and refresh.';
      break;
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      message = 'Could not start camera with the requested settings. Please try a different browser.';
      break;
    case 'NotSupportedError':
      message = 'Camera access is not supported in this browser. Please try Chrome or Firefox.';
      break;
    case 'SecurityError':
      message = 'Camera access is blocked due to security restrictions. Ensure you\'re on HTTPS.';
      break;
  }

  showCameraError(message);
}

/**
 * Shows the camera error state with a given message.
 * @param {string} message
 */
function showCameraError(message) {
  videoEl.style.display = 'none';
  cameraError.style.display = 'flex';
  cameraError.querySelector('.error-message').textContent = message;
}

/* ── INIT ON DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {
  initCamera();
});

/* ── EXPOSE TO OTHER MODULES ── */
window.Camera = {
  initCamera,
  stopCamera,
  getStream,
  getVideoElement,
  captureFrameToCanvas
};
