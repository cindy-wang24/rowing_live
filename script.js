const startBtn = document.getElementById("startBtn");
const videoEl = document.getElementById("inputVideo");
const canvasEl = document.getElementById("canvas");
const resultsEl = document.getElementById("results");
const ctx = canvasEl.getContext("2d");

let lastUpdateTime = 0;
let latestSuggestion = "Waiting for pose...";

// Initialize Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onResults);

// Start button
startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  resultsEl.textContent = "Starting camera...";

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoEl.srcObject = stream;
  await videoEl.play();

  videoEl.width = videoEl.videoWidth;
  videoEl.height = videoEl.videoHeight;
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  canvasEl.style.display = "block";

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await pose.send({ image: videoEl });
    },
    width: videoEl.videoWidth,
    height: videoEl.videoHeight,
  });

  camera.start();
});

// --- MediaPipe results handler ---
function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // Mirror horizontally
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
  ctx.restore();

  if (!results.poseLandmarks) {
    resultsEl.textContent = "No person detected.";
    return;
  }

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

// --- Helper: extract key landmarks ---
function extractKeyLandmarks(landmarks, width, height) {
  const keypoints = {
    nose: 0, wrist_l: 15, wrist_r: 16,
    shoulder_l: 11, shoulder_r: 12,
    l_elbow: 13, r_elbow: 14,
    hip_l: 23, hip_r: 24,
    knee_l: 25, knee_r: 26,
    ankle_l: 27, ankle_r: 28
  };
  const extracted = {};
  for (let [k, i] of Object.entries(keypoints)) {
    extracted[k] = [landmarks[i].x * width, landmarks[i].y * height];
  }
  return extracted;
}

// --- Helper: compute angle ---
function angle(p1, mid, p2) {
  const v1 = [p1[0] - mid[0], -(p1[1] - mid[1])];
  const v2 = [p2[0] - mid[0], -(p2[1] - mid[1])];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.hypot(v1[0], v1[1]);
  const mag2 = Math.hypot(v2[0], v2[1]);
  return Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
}

// --- Rowing feedback logic ---
function analyzeRowing(keypoints) {
  const wrist = keypoints.wrist_r;
  const shoulder = keypoints.shoulder_r;
  const hip = keypoints.hip_r;
  const knee = keypoints.knee_r;
  const elbow = keypoints.r_elbow;

  if (!wrist || !shoulder || !hip || !knee || !elbow) return "No clear pose.";

  const angleSEW = angle(shoulder, elbow, wrist);
  const angleHSW = angle(hip, shoulder, wrist);
  let suggestion = "";

  if (
    Math.abs(elbow[0] - shoulder[0]) < Math.abs(elbow[1] - shoulder[1]) &&
    angleSEW > 180 &&
    Math.abs(wrist[1] - hip[1]) < 0.7 * Math.abs(wrist[1] - shoulder[1])
  ) {
    suggestion = "Great Rowing!";
  } else if (
    Math.abs(elbow[0] - shoulder[0]) > Math.abs(elbow[1] - shoulder[1]) &&
    angleSEW < 70 &&
    Math.abs(wrist[1] - hip[1]) > Math.abs(wrist[1] - shoulder[1])
  ) {
    suggestion = "Great Rowing!";
  } else {
    if (angleSEW < 90 && angleHSW < 30) {
      suggestion = "Lift your elbows 45° from your sides.";
    } else if (angleSEW < 90 && Math.abs(wrist[1] - hip[1]) > 0.7 * Math.abs(hip[1] - shoulder[1])) {
      suggestion = "Lean forward as your hands approach the front.";
    } else if (angleSEW > 150) {
      suggestion = "Keep your arms straight as you approach the front.";
    } else {
      suggestion = "Adjust your form.";
    }
  }

  return suggestion;
}
