const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const resultsEl = document.getElementById("results");

let lastFeedbackTime = 0;

// Initialize MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  resultsEl.textContent = "Starting camera...";
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.play();
  video.style.display = "none"; // hide raw video
  resultsEl.textContent = "Analyzing rowing posture...";
  startCamera();
});

function startCamera() {
  const camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 640,
    height: 480
  });
  camera.start();
}

// ---- Helper functions ----

function extractKeyLandmarks(landmarks, width, height) {
  const keypoints = {
    nose: 0, wrist_r: 16, shoulder_r: 12,
    hip_r: 24, knee_r: 26, r_elbow: 14
  };
  const extracted = {};
  for (let [k, i] of Object.entries(keypoints)) {
    extracted[k] = {
      x: landmarks[i].x * width,
      y: landmarks[i].y * height
    };
  }
  return extracted;
}

function angle(p1, mid, p2) {
  const v1 = [p1.x - mid.x, -(p1.y - mid.y)];
  const v2 = [p2.x - mid.x, -(p2.y - mid.y)];
  const dot = v1[0]*v2[0] + v1[1]*v2[1];
  const mag1 = Math.hypot(v1[0], v1[1]);
  const mag2 = Math.hypot(v2[0], v2[1]);
  return Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
}

// ---- Rowing feedback logic (YOUR ORIGINAL CONDITIONS) ----
function analyzeRowing(kp) {
  const wrist = kp.wrist_r;
  const shoulder = kp.shoulder_r;
  const hip = kp.hip_r;
  const knee = kp.knee_r;
  const elbow = kp.r_elbow;

  if (
    Math.abs(elbow.x - shoulder.x) < Math.abs(elbow.y - shoulder.y) &&
    angle(shoulder, elbow, wrist) > 180 &&
    Math.abs(wrist.y - hip.y) < 0.7 * Math.abs(wrist.y - shoulder.y)
  ) {
    return "Great Rowing!";
  } else if (
    Math.abs(elbow.x - shoulder.x) > Math.abs(elbow.y - shoulder.y) &&
    angle(shoulder, elbow, wrist) < 70 &&
    Math.abs(wrist.y - hip.y) > Math.abs(wrist.y - shoulder.y)
  ) {
    return "Great Rowing!";
  } else {
    if (angle(shoulder, elbow, wrist) < 90 && angle(hip, shoulder, wrist) < 30) {
      return "Lift your elbows 45 degrees from your sides.";
    } else if (
      angle(shoulder, elbow, wrist) < 90 &&
      Math.abs(wrist.y - hip.y) > 0.7 * Math.abs(hip.y - shoulder.y)
    ) {
      return "Lean forward as your hands approach the front.";
    } else if (angle(shoulder, elbow, wrist) > 150) {
      return "Keep your arms straight as you approach the front.";
    } else {
      return "Adjust your form slightly.";
    }
  }
}

// ---- MediaPipe results handler ----
function onResults(results) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) return;

  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'white', lineWidth: 3 });
  drawLandmarks(ctx, results.poseLandmarks, { color: 'red', lineWidth: 2 });

  const now = Date.now();
  if (now - lastFeedbackTime > 2000) { // once every 2 seconds
    const kp = extractKeyLandmarks(results.poseLandmarks, canvas.width, canvas.height);
    const feedback = analyzeRowing(kp);
    resultsEl.textContent = feedback;
    lastFeedbackTime = now;
  }
}
