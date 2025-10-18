const startBtn = document.getElementById("startBtn");
const canvasEl = document.getElementById("canvas");
const resultsEl = document.getElementById("results");
const ctx = canvasEl.getContext("2d");
const videoEl = document.createElement("video");
videoEl.style.display = "none";

let lastUpdateTime = 0;
let latestSuggestion = "Waiting for pose...";
let camera;

// --- MediaPipe Pose setup ---
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4/${file}`,
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
pose.onResults(onResults);

// --- Start button handler ---
startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoEl.srcObject = stream;

    videoEl.onloadedmetadata = () => {
      videoEl.play();
      resizeCanvas();

      canvasEl.style.display = "block";
      resultsEl.style.display = "block";
      startBtn.style.display = "none";

      camera = new Camera(videoEl, {
        onFrame: async () => await pose.send({ image: videoEl }),
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
      });
      camera.start();

      // Keep canvas responsive
      window.addEventListener("resize", resizeCanvas);
    };
  } catch (err) {
    alert("Camera access denied or not available.");
    console.error(err);
  }
});

// --- Resize the canvas to fit window ---
function resizeCanvas() {
  const aspect = videoEl.videoHeight / videoEl.videoWidth || 3 / 4;
  const width = Math.min(window.innerWidth * 0.9, 1000);
  canvasEl.width = width;
  canvasEl.height = width * aspect;
}

// --- Extract landmarks ---
function extractKeyLandmarks(landmarks, width, height) {
  const keypoints = { wrist_r: 16, shoulder_r: 12, r_elbow: 14, hip_r: 24 };
  const extracted = {};
  for (let [k, i] of Object.entries(keypoints)) {
    extracted[k] = [landmarks[i].x * width, landmarks[i].y * height];
  }
  return extracted;
}

// --- Angle helper ---
function angle(p1, mid, p2) {
  const v1 = [p1[0] - mid[0], -(p1[1] - mid[1])];
  const v2 = [p2[0] - mid[0], -(p2[1] - mid[1])];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.hypot(...v1);
  const mag2 = Math.hypot(...v2);
  return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
}

// --- Analyze rowing form ---
function analyzeRowing(keypoints) {
  const { wrist_r, shoulder_r, r_elbow, hip_r } = keypoints;
  const angleSEW = angle(shoulder_r, r_elbow, wrist_r);
  const angleHSW = angle(hip_r, shoulder_r, wrist_r);
  if (angleSEW > 150 && angleHSW > 40) return "Good finish position!";
  if (angleSEW < 90) return "Open your arms more during drive.";
  return "Maintain consistent form.";
}

// --- Main pose results handler ---
function onResults(results) {
  if (!results.poseLandmarks) {
    resultsEl.textContent = "No person detected.";
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // Mirror view like a webcam
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
  ctx.restore();

  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "white", lineWidth: 3 });
  drawLandmarks(ctx, results.poseLandmarks, { color: "red", lineWidth: 2 });

  const now = Date.now();
  if (now - lastUpdateTime >= 2000) {
    const keypoints = extractKeyLandmarks(results.poseLandmarks, canvasEl.width, canvasEl.height);
    latestSuggestion = analyzeRowing(keypoints);
    lastUpdateTime = now;
  }

  resultsEl.textContent = latestSuggestion;
}
