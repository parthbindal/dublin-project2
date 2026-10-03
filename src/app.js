// Binsight UI: live camera or photo -> on-device object detection -> which bin.
// The model (COCO-SSD on TensorFlow.js) runs in the browser, so images never leave the device.
import { BINS, getGuidance, pickPrimary, updateStreak, emptyTally, addToTally } from './rules.js';

const MIN_SCORE = 0.55;
const PHOTO_MIN_SCORE = 0.3; // photos are a deliberate single shot, so accept less certain guesses and say so
const STABLE_FRAMES = 4; // frames in a row an item must be seen before we announce it
const TALLY_KEY = 'binsight.tally';
// The lite model is 2-8x faster per frame and did better on webcam-style frames in our tests.
// Add ?model=full to the URL to try the larger model instead.
const MODEL_BASE =
  new URLSearchParams(window.location.search).get('model') === 'full' ? 'mobilenet_v2' : 'lite_mobilenet_v2';

const byId = (id) => document.getElementById(id);
const el = {
  stage: byId('stage'),
  video: byId('video'),
  photo: byId('photo'),
  overlay: byId('overlay'),
  stageEmpty: byId('stage-empty'),
  stageBanner: byId('stage-banner'),
  status: byId('status'),
  btnCamera: byId('btn-camera'),
  btnFlip: byId('btn-flip'),
  btnUpload: byId('btn-upload'),
  fileInput: byId('file-input'),
  btnVoice: byId('btn-voice'),
  result: byId('result'),
  resultIcon: byId('result-icon'),
  resultBin: byId('result-bin'),
  resultItem: byId('result-item'),
  resultReason: byId('result-reason'),
  resultTip: byId('result-tip'),
  btnSorted: byId('btn-sorted'),
  total: byId('total'),
  totalLabel: byId('total-label'),
  tally: byId('tally'),
};

let model = null;
let stream = null;
let facingMode = 'environment';
// Each camera start, photo and detection loop takes a ticket. Bumping a counter cancels
// anything still holding an older ticket, so double clicks and mode switches cannot race.
let startToken = 0;
let photoToken = 0;
let loopId = 0;
let streak = updateStreak(null, null);
let emptyFrames = 0;
let lastAnnounced = null; // stops the same item being announced over and over
let cardGuidance = null; // what the result card is showing right now
let voiceOn = true;
let tally = loadTally();
let photoUrl = null;

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle('error', isError);
}

async function loadModel() {
  if (typeof window.cocoSsd === 'undefined') {
    setStatus('Could not download the AI library. Check your internet connection and reload.', true);
    return;
  }
  try {
    model = await window.cocoSsd.load({ base: MODEL_BASE });
    setControlsBusy(false);
    setStatus('Ready. Start the camera or upload a photo.');
  } catch (error) {
    setStatus(`Could not load the AI model (${error.message}). Check your connection and reload.`, true);
  }
}

function setControlsBusy(busy) {
  el.btnCamera.disabled = busy;
  el.btnFlip.disabled = busy;
  el.btnUpload.disabled = busy;
}

// ---------- Camera ----------

function cameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return 'The camera only works on https:// pages or localhost. Upload a photo instead.';
  }
  if (error.name === 'NotAllowedError') {
    return 'Camera access was blocked. Allow it in your browser settings, or upload a photo instead.';
  }
  if (error.name === 'NotFoundError') {
    return 'No camera found. Upload a photo instead.';
  }
  return `Could not start the camera (${error.message}). Upload a photo instead.`;
}

async function startCamera() {
  stopCamera();
  photoToken += 1; // abandon any photo still being processed
  const token = startToken;
  setControlsBusy(true);
  setStatus('Starting the camera…');
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    if (token !== startToken) {
      stopTracks(newStream);
      return;
    }
    stream = newStream;
    stream.getVideoTracks().forEach((track) => track.addEventListener('ended', handleCameraLost));
    el.video.srcObject = stream;
    await el.video.play();
  } catch (error) {
    if (token === startToken) {
      stopCamera();
      showSource('none');
      setStatus(cameraErrorMessage(error), true);
    }
    return;
  } finally {
    setControlsBusy(false);
  }
  if (token !== startToken) return;
  showSource('video');
  el.btnCamera.textContent = 'Stop camera';
  setStatus('Hold one item in front of the camera.');
  runDetectionLoop();
  const multiple = await hasMultipleCameras();
  if (token === startToken) el.btnFlip.hidden = !multiple;
}

function stopCamera() {
  startToken += 1;
  loopId += 1;
  if (stream) {
    stopTracks(stream);
    stream = null;
  }
  el.video.srcObject = null;
  el.btnCamera.textContent = 'Start camera';
  el.btnFlip.hidden = true;
  resetTracking();
}

function stopTracks(mediaStream) {
  mediaStream.getTracks().forEach((track) => track.stop());
}

function handleCameraLost() {
  stopCamera();
  hideResult();
  showSource('none');
  setStatus('The camera disconnected. Start it again.', true);
}

function resetTracking() {
  streak = updateStreak(null, null);
  emptyFrames = 0;
  lastAnnounced = null;
}

async function hasMultipleCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}

function runDetectionLoop() {
  loopId += 1;
  const id = loopId;
  const tick = async () => {
    if (id !== loopId) return;
    if (el.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const detections = await model.detect(el.video);
        if (id !== loopId) return;
        handleVideoFrame(detections);
      } catch (error) {
        if (id !== loopId) return;
        stopCamera();
        showSource('none');
        setStatus(`Detection stopped (${error.message}). Start the camera again.`, true);
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function handleVideoFrame(detections) {
  drawDetections(detections, el.video.videoWidth, el.video.videoHeight);
  const primary = pickPrimary(detections, MIN_SCORE);
  emptyFrames = primary ? 0 : emptyFrames + 1;
  if (emptyFrames >= STABLE_FRAMES) {
    lastAnnounced = null; // the item left the frame, so it may be announced again next time
  }
  streak = updateStreak(streak, primary ? primary.class : null);
  if (streak.count === STABLE_FRAMES && streak.label !== lastAnnounced) {
    showResult(getGuidance(streak.label));
  }
}

// ---------- Photo upload ----------

async function handlePhoto(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Please choose an image file.', true);
    return;
  }
  stopCamera();
  hideResult();
  photoToken += 1;
  const token = photoToken;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  el.photo.src = photoUrl;
  try {
    await el.photo.decode();
    if (token !== photoToken) return;
    showSource('photo');
    setStatus('Looking…');
    const detections = await model.detect(el.photo, 20, PHOTO_MIN_SCORE);
    if (token !== photoToken) return;
    showPhotoResult(pickPrimary(detections, PHOTO_MIN_SCORE));
  } catch (error) {
    if (token !== photoToken) return;
    showSource('none');
    setStatus(`Could not read that image (${error.message}). Try another photo.`, true);
  }
}

function showPhotoResult(primary) {
  drawDetections(primary ? [primary] : [], el.photo.naturalWidth, el.photo.naturalHeight, PHOTO_MIN_SCORE);
  if (!primary) {
    setStatus('I could not spot an item I know. Try a closer photo of a single item.');
    return;
  }
  showResult(getGuidance(primary.class));
  setStatus(
    primary.score >= MIN_SCORE
      ? 'Found it. Upload another photo or start the camera.'
      : `I think this is a ${primary.class}, but I'm not sure. A closer photo helps.`,
  );
}

// ---------- Drawing ----------

function showSource(kind) {
  el.video.hidden = kind !== 'video';
  el.photo.hidden = kind !== 'photo';
  el.stageEmpty.hidden = kind !== 'none';
  el.stage.classList.toggle('is-photo', kind === 'photo');
  const ctx = el.overlay.getContext('2d');
  ctx.clearRect(0, 0, el.overlay.width, el.overlay.height);
}

function drawDetections(detections, width, height, minScore = MIN_SCORE) {
  if (el.overlay.width !== width) el.overlay.width = width;
  if (el.overlay.height !== height) el.overlay.height = height;
  const ctx = el.overlay.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const fontSize = Math.max(16, Math.round(width / 32));
  ctx.lineWidth = Math.max(3, Math.round(width / 160));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  detections
    .filter((detection) => detection.score >= minScore)
    .forEach((detection) => {
      const guidance = getGuidance(detection.class);
      if (guidance) drawBox(ctx, detection, BINS[guidance.bin], fontSize);
    });
}

function drawBox(ctx, detection, bin, fontSize) {
  const [x, y, w, h] = detection.bbox;
  const text = `${detection.class} → ${bin.label}`;
  const pad = Math.round(fontSize * 0.3);
  const labelWidth = ctx.measureText(text).width + pad * 2;
  const labelHeight = fontSize + pad * 2;
  const labelY = y > labelHeight ? y - labelHeight : y;
  ctx.strokeStyle = bin.color;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = bin.color;
  ctx.fillRect(x, labelY, labelWidth, labelHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + pad, labelY + pad);
}

// ---------- Result card, voice and tally ----------

function showResult(guidance) {
  const bin = BINS[guidance.bin];
  cardGuidance = guidance;
  lastAnnounced = guidance.item;
  el.result.style.setProperty('--bin-color', bin.color);
  el.resultIcon.textContent = bin.icon;
  el.resultBin.textContent = bin.label;
  el.resultItem.textContent = guidance.item;
  el.resultReason.textContent = guidance.reason;
  el.resultTip.textContent = guidance.tip;
  el.result.hidden = false;
  el.stageBanner.style.setProperty('--bin-color', bin.color);
  el.stageBanner.textContent = `${bin.icon} ${guidance.item} → ${bin.label}`;
  el.stageBanner.hidden = false;
  speak(`${guidance.item}: ${bin.label}.`);
}

function hideResult() {
  cardGuidance = null;
  el.result.hidden = true;
  el.stageBanner.hidden = true;
}

function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// iPhones only allow speech that starts from a tap, so speak nothing on the first tap.
function unlockVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

function stopVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function markSorted() {
  if (!cardGuidance) return;
  tally = addToTally(tally, cardGuidance.bin);
  saveTally(tally);
  renderTally();
  hideResult();
  lastAnnounced = null; // the next item of the same kind should be announced too
  setStatus(`Nice! ${itemCount(sumTally(tally))} sorted so far. Show me the next one.`);
}

function itemCount(count) {
  return count === 1 ? '1 item' : `${count} items`;
}

function sumTally(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function loadTally() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TALLY_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return emptyTally();
    return Object.fromEntries(
      Object.keys(emptyTally()).map((binId) => {
        const count = saved[binId];
        return [binId, Number.isInteger(count) && count >= 0 ? count : 0];
      }),
    );
  } catch {
    return emptyTally(); // corrupted or blocked storage: start fresh
  }
}

function saveTally(counts) {
  try {
    window.localStorage.setItem(TALLY_KEY, JSON.stringify(counts));
  } catch {
    // Private browsing can block storage. The tally still works for this visit.
  }
}

function renderTally() {
  const total = sumTally(tally);
  el.total.textContent = String(total);
  el.totalLabel.textContent = total === 1 ? 'item' : 'items';
  const chips = Object.values(BINS).map((bin) => {
    const chip = document.createElement('li');
    chip.style.setProperty('--chip-color', bin.color);
    const name = document.createElement('span');
    name.textContent = `${bin.icon} ${bin.label}`;
    const count = document.createElement('strong');
    count.textContent = String(tally[bin.id]);
    chip.append(name, count);
    return chip;
  });
  el.tally.replaceChildren(...chips);
}

// ---------- Wiring ----------

el.btnCamera.addEventListener('click', () => {
  if (stream) {
    stopCamera();
    stopVoice();
    hideResult();
    showSource('none');
    setStatus('Camera stopped.');
    return;
  }
  unlockVoice();
  hideResult();
  startCamera();
});

el.btnFlip.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
});

el.btnUpload.addEventListener('click', () => {
  unlockVoice();
  el.fileInput.click();
});

el.fileInput.addEventListener('change', () => {
  const [file] = el.fileInput.files;
  el.fileInput.value = '';
  handlePhoto(file);
});

el.btnVoice.addEventListener('click', () => {
  voiceOn = !voiceOn;
  el.btnVoice.textContent = voiceOn ? 'Voice: on' : 'Voice: off';
  el.btnVoice.setAttribute('aria-pressed', String(voiceOn));
  if (!voiceOn) stopVoice();
});

el.btnSorted.addEventListener('click', markSorted);

renderTally();
loadModel();
