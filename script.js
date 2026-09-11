const minutesSelect = document.getElementById("minutesSelect");
const stationCountSelect = document.getElementById("stationCountSelect");
const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
const soundToggle = document.getElementById("soundToggle");
const currentStationName = document.getElementById("currentStationName");
const roundLabel = document.getElementById("roundLabel");
const timerEl = document.getElementById("timer");
const progressBar = document.getElementById("progressBar");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const nextBtn = document.getElementById("nextBtn");
const stationsList = document.getElementById("stationsList");
const statusText = document.getElementById("statusText");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const defaults = [
  "Teacher Table",
  "IXL",
  "Independent Reading",
  "Partner Work",
  "Vocabulary",
  "Writing",
  "Practice",
  "Choice Board"
];

let durationMinutes = Number(localStorage.getItem("stationTimerMinutes")) || 10;
let stationCount = Number(localStorage.getItem("stationTimerCount")) || 4;
let stationNames = JSON.parse(localStorage.getItem("stationTimerNames") || "null") || [...defaults];
let currentStation = Number(localStorage.getItem("stationTimerCurrent")) || 0;
let autoAdvance = localStorage.getItem("stationTimerAuto") !== "false";
let soundOn = localStorage.getItem("stationTimerSound") !== "false";

let totalSeconds = durationMinutes * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;
let running = false;

for (let m = 5; m <= 30; m++) {
  const option = document.createElement("option");
  option.value = m;
  option.textContent = `${m} minutes`;
  if (m === durationMinutes) option.selected = true;
  minutesSelect.appendChild(option);
}

for (let n = 2; n <= 8; n++) {
  const option = document.createElement("option");
  option.value = n;
  option.textContent = `${n} stations`;
  if (n === stationCount) option.selected = true;
  stationCountSelect.appendChild(option);
}

autoAdvanceToggle.checked = autoAdvance;
soundToggle.checked = soundOn;

function saveNames() {
  localStorage.setItem("stationTimerNames", JSON.stringify(stationNames));
}

function saveSettings() {
  localStorage.setItem("stationTimerMinutes", durationMinutes);
  localStorage.setItem("stationTimerCount", stationCount);
  localStorage.setItem("stationTimerCurrent", currentStation);
  localStorage.setItem("stationTimerAuto", autoAdvance);
  localStorage.setItem("stationTimerSound", soundOn);
}

function ensureStationNames() {
  while (stationNames.length < stationCount) {
    stationNames.push(defaults[stationNames.length] || `Station ${stationNames.length + 1}`);
  }
}

function renderStations() {
  ensureStationNames();
  stationsList.innerHTML = "";

  stationNames.slice(0, stationCount).forEach((name, index) => {
    const row = document.createElement("div");
    row.className = `station-row ${index === currentStation ? "active" : ""}`;

    const number = document.createElement("div");
    number.className = "station-number";
    number.textContent = index + 1;

    const input = document.createElement("input");
    input.className = "station-name-input";
    input.value = name;
    input.setAttribute("aria-label", `Station ${index + 1} name`);
    input.addEventListener("input", (event) => {
      stationNames[index] = event.target.value || `Station ${index + 1}`;
      saveNames();
      updateDisplay();
    });

    row.append(number, input);
    stationsList.appendChild(row);
  });
}

function updateDisplay() {
  ensureStationNames();
  if (currentStation >= stationCount) currentStation = 0;

  currentStationName.textContent = stationNames[currentStation] || `Station ${currentStation + 1}`;
  roundLabel.textContent = `Station ${currentStation + 1} of ${stationCount}`;
  renderTimer();
  renderStations();
  saveSettings();
}

function renderTimer() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const pct = totalSeconds ? (remainingSeconds / totalSeconds) * 100 : 0;
  progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  document.title = `${timerEl.textContent} • ${stationNames[currentStation] || "Station Timer"}`;
}

function setRunning(value) {
  running = value;
  startPauseBtn.textContent = running ? "⏸ Pause" : "▶ Start";
}

function startTimer() {
  if (running) {
    clearInterval(intervalId);
    intervalId = null;
    setRunning(false);
    statusText.textContent = "Paused.";
    return;
  }

  setRunning(true);
  statusText.textContent = `Working at ${stationNames[currentStation]}.`;

  intervalId = setInterval(() => {
    remainingSeconds -= 1;
    renderTimer();

    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      setRunning(false);
      finishStation();
    }
  }, 1000);
}

function finishStation() {
  remainingSeconds = 0;
  renderTimer();

  if (soundOn) playBell();

  statusText.textContent = `${stationNames[currentStation]} is finished!`;

  if (autoAdvance) {
    setTimeout(() => {
      currentStation = (currentStation + 1) % stationCount;
      resetClock(false);
      updateDisplay();
      statusText.textContent = `Next up: ${stationNames[currentStation]}.`;
      startTimer();
    }, 1500);
  }
}

function resetClock(updateStatus = true) {
  clearInterval(intervalId);
  intervalId = null;
  setRunning(false);
  totalSeconds = durationMinutes * 60;
  remainingSeconds = totalSeconds;
  renderTimer();
  if (updateStatus) statusText.textContent = "Timer reset.";
}

function nextStation() {
  clearInterval(intervalId);
  intervalId = null;
  setRunning(false);
  currentStation = (currentStation + 1) % stationCount;
  resetClock(false);
  updateDisplay();
  statusText.textContent = `Moved to ${stationNames[currentStation]}.`;
}

function playBell() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    const chime = (frequency, start, duration, volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    const now = ctx.currentTime;
    chime(659.25, now, 0.55, 0.22);
    chime(783.99, now + 0.16, 0.7, 0.20);
    chime(1046.5, now + 0.34, 1.0, 0.18);
  } catch (e) {
    console.log("Sound unavailable", e);
  }
}

minutesSelect.addEventListener("change", () => {
  durationMinutes = Number(minutesSelect.value);
  resetClock(false);
  saveSettings();
  statusText.textContent = `Set to ${durationMinutes} minutes per station.`;
});

stationCountSelect.addEventListener("change", () => {
  stationCount = Number(stationCountSelect.value);
  if (currentStation >= stationCount) currentStation = 0;
  resetClock(false);
  updateDisplay();
  statusText.textContent = `${stationCount} stations selected.`;
});

autoAdvanceToggle.addEventListener("change", () => {
  autoAdvance = autoAdvanceToggle.checked;
  saveSettings();
});

soundToggle.addEventListener("change", () => {
  soundOn = soundToggle.checked;
  saveSettings();
  if (soundOn) playBell();
});

startPauseBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", () => resetClock(true));
nextBtn.addEventListener("click", nextStation);

fullscreenBtn.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      document.body.classList.add("fullscreen-mode");
      fullscreenBtn.textContent = "✕ Exit Full Screen";
    } else {
      await document.exitFullscreen();
    }
  } catch {
    document.body.classList.toggle("fullscreen-mode");
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("fullscreen-mode");
    fullscreenBtn.textContent = "⛶ Full Screen";
  }
});

ensureStationNames();
resetClock(false);
updateDisplay();
