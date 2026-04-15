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
 * Maps video dimensions to capture canvas.
 * Called once stream is ready, ensures captured frames match video.
 */
function syncCanvasToVideo() {
  captureCanvas.width  = videoEl.videoWidth  || 1280;
  captureCanvas.height = videoEl.videoHeight || 960;
}

/**
 * Captures the current video frame onto captureCanvas.
 * Returns the canvas element with the frame drawn on it.
 * @returns {HTMLCanvasElement}
 */
function captureFrameToCanvas() {
  const ctx = captureCanvas.getContext('2d');
  // Draw current video frame (un-mirrored — CSS mirror is visual only)
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
