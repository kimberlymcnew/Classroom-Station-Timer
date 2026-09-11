const minutesSelect = document.getElementById("minutesSelect");
const transitionSelect = document.getElementById("transitionSelect");
const stationCountSelect = document.getElementById("stationCountSelect");
const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
const soundToggle = document.getElementById("soundToggle");
const currentStationName = document.getElementById("currentStationName");
const roundLabel = document.getElementById("roundLabel");
const modeLabel = document.getElementById("modeLabel");
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

let durationMinutes =
  Number(localStorage.getItem("stationTimerMinutes")) || 10;

let transitionMinutes =
  Number(localStorage.getItem("stationTimerTransition"));

if (Number.isNaN(transitionMinutes)) {
  transitionMinutes = 1;
}

let stationCount =
  Number(localStorage.getItem("stationTimerCount")) || 4;

let stationNames =
  JSON.parse(localStorage.getItem("stationTimerNames") || "null") ||
  [...defaults];

let currentStation =
  Number(localStorage.getItem("stationTimerCurrent")) || 0;

let autoAdvance =
  localStorage.getItem("stationTimerAuto") !== "false";

let soundOn =
  localStorage.getItem("stationTimerSound") !== "false";

let totalSeconds = durationMinutes * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;
let running = false;
let isTransition = false;


// --------------------
// CREATE MENU OPTIONS
// --------------------

for (let m = 5; m <= 30; m++) {
  const option = document.createElement("option");
  option.value = m;
  option.textContent = `${m} minutes`;

  if (m === durationMinutes) {
    option.selected = true;
  }

  minutesSelect.appendChild(option);
}

for (let t = 0; t <= 5; t++) {
  const option = document.createElement("option");
  option.value = t;

  option.textContent =
    t === 0
      ? "No transition"
      : `${t} minute${t === 1 ? "" : "s"}`;

  if (t === transitionMinutes) {
    option.selected = true;
  }

  transitionSelect.appendChild(option);
}

for (let n = 2; n <= 8; n++) {
  const option = document.createElement("option");
  option.value = n;
  option.textContent = `${n} stations`;

  if (n === stationCount) {
    option.selected = true;
  }

  stationCountSelect.appendChild(option);
}

autoAdvanceToggle.checked = autoAdvance;
soundToggle.checked = soundOn;


// --------------------
// SAVE SETTINGS
// --------------------

function saveNames() {
  localStorage.setItem(
    "stationTimerNames",
    JSON.stringify(stationNames)
  );
}

function saveSettings() {
  localStorage.setItem(
    "stationTimerMinutes",
    durationMinutes
  );

  localStorage.setItem(
    "stationTimerTransition",
    transitionMinutes
  );

  localStorage.setItem(
    "stationTimerCount",
    stationCount
  );

  localStorage.setItem(
    "stationTimerCurrent",
    currentStation
  );

  localStorage.setItem(
    "stationTimerAuto",
    autoAdvance
  );

  localStorage.setItem(
    "stationTimerSound",
    soundOn
  );
}


// --------------------
// STATION NAMES
// --------------------

function ensureStationNames() {
  while (stationNames.length < stationCount) {
    stationNames.push(
      defaults[stationNames.length] ||
      `Station ${stationNames.length + 1}`
    );
  }
}

function renderStations() {
  ensureStationNames();

  stationsList.innerHTML = "";

  stationNames
    .slice(0, stationCount)
    .forEach((name, index) => {

      const row = document.createElement("div");

      row.className =
        `station-row ${
          index === currentStation ? "active" : ""
        }`;

      const number = document.createElement("div");

      number.className = "station-number";
      number.textContent = index + 1;

      const input = document.createElement("input");

      input.className = "station-name-input";
      input.value = name;

      input.setAttribute(
        "aria-label",
        `Station ${index + 1} name`
      );

      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "words");


      // IPAD FIX:
      // We DO NOT redraw the input while typing.
      // This keeps the keyboard open.

      input.addEventListener("input", (event) => {

        stationNames[index] =
          event.target.value;

        if (
          index === currentStation &&
          !isTransition
        ) {
          currentStationName.textContent =
            event.target.value.trim() ||
            `Station ${index + 1}`;
        }

        saveNames();
      });


      // Clean up the name only after
      // the user finishes editing.

      input.addEventListener("blur", (event) => {

        const cleanName =
          event.target.value.trim() ||
          `Station ${index + 1}`;

        stationNames[index] = cleanName;
        event.target.value = cleanName;

        if (
          index === currentStation &&
          !isTransition
        ) {
          currentStationName.textContent =
            cleanName;
        }

        saveNames();
      });

      row.append(number, input);

      stationsList.appendChild(row);
    });
}


function updateActiveStationHighlight() {

  document
    .querySelectorAll(".station-row")
    .forEach((row, index) => {

      row.classList.toggle(
        "active",
        index === currentStation
      );

    });
}


// --------------------
// DISPLAY
// --------------------

function updateDisplay({
  rebuildStations = false
} = {}) {

  ensureStationNames();

  if (currentStation >= stationCount) {
    currentStation = 0;
  }

  if (isTransition) {

    modeLabel.textContent =
      "Transition Time";

    currentStationName.textContent =
      "Move to the next station";

  } else {

    modeLabel.textContent =
      "Current Station";

    currentStationName.textContent =
      stationNames[currentStation]?.trim() ||
      `Station ${currentStation + 1}`;
  }

  roundLabel.textContent =
    `Station ${currentStation + 1} of ${stationCount}`;

  renderTimer();

  if (rebuildStations) {
    renderStations();
  } else {
    updateActiveStationHighlight();
  }

  saveSettings();
}


function renderTimer() {

  const mins =
    Math.floor(remainingSeconds / 60);

  const secs =
    remainingSeconds % 60;

  timerEl.textContent =
    `${String(mins).padStart(2, "0")}:` +
    `${String(secs).padStart(2, "0")}`;

  const pct =
    totalSeconds
      ? (remainingSeconds / totalSeconds) * 100
      : 0;

  progressBar.style.width =
    `${Math.max(0, Math.min(100, pct))}%`;

  document.title =
    `${timerEl.textContent} • ${
      isTransition
        ? "Transition"
        : stationNames[currentStation]
    }`;
}


// --------------------
// TIMER
// --------------------

function setRunning(value) {

  running = value;

  startPauseBtn.textContent =
    running
      ? "⏸ Pause"
      : "▶ Start";
}


function startTimer() {

  if (running) {

    clearInterval(intervalId);

    intervalId = null;

    setRunning(false);

    statusText.textContent =
      "Paused.";

    return;
  }


  setRunning(true);

  statusText.textContent =
    isTransition
      ? "Transition time — clean up and move."
      : `Working at ${stationNames[currentStation]}.`;


  intervalId = setInterval(() => {

    remainingSeconds -= 1;

    renderTimer();


    if (remainingSeconds <= 0) {

      clearInterval(intervalId);

      intervalId = null;

      setRunning(false);


      if (isTransition) {
        finishTransition();
      } else {
        finishStation();
      }

    }

  }, 1000);
}


// --------------------
// STATION FINISHED
// --------------------

function finishStation() {

  remainingSeconds = 0;

  renderTimer();


  if (soundOn) {
    playBell();
  }


  statusText.textContent =
    `${stationNames[currentStation]} is finished!`;


  if (!autoAdvance) {
    return;
  }


  if (transitionMinutes > 0) {

    startTransition();

  } else {

    moveToNextStationAndStart();

  }
}


// --------------------
// TRANSITION TIMER
// --------------------

function startTransition() {

  isTransition = true;

  totalSeconds =
    transitionMinutes * 60;

  remainingSeconds =
    totalSeconds;

  updateDisplay();

  statusText.textContent =
    `Transition time: ${transitionMinutes} ` +
    `minute${transitionMinutes === 1 ? "" : "s"}.`;

  startTimer();
}


function finishTransition() {

  if (soundOn) {
    playBell();
  }

  moveToNextStationAndStart();
}


// --------------------
// NEXT STATION
// --------------------

function moveToNextStationAndStart() {

  isTransition = false;

  currentStation =
    (currentStation + 1) %
    stationCount;

  totalSeconds =
    durationMinutes * 60;

  remainingSeconds =
    totalSeconds;

  updateDisplay();

  statusText.textContent =
    `Next up: ${stationNames[currentStation]}.`;

  startTimer();
}


// --------------------
// RESET
// --------------------

function resetClock(
  updateStatus = true
) {

  clearInterval(intervalId);

  intervalId = null;

  setRunning(false);

  isTransition = false;

  totalSeconds =
    durationMinutes * 60;

  remainingSeconds =
    totalSeconds;

  updateDisplay();

  if (updateStatus) {
    statusText.textContent =
      "Timer reset.";
  }
}


// --------------------
// MANUAL NEXT STATION
// --------------------

function nextStation() {

  clearInterval(intervalId);

  intervalId = null;

  setRunning(false);

  isTransition = false;

  currentStation =
    (currentStation + 1) %
    stationCount;

  totalSeconds =
    durationMinutes * 60;

  remainingSeconds =
    totalSeconds;

  updateDisplay();

  statusText.textContent =
    `Moved to ${stationNames[currentStation]}.`;
}


// --------------------
// SOUND
// --------------------

function playBell() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const ctx =
      new AudioContext();


    const chime = (
      frequency,
      start,
      duration,
      volume
    ) => {

      const osc =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      osc.type = "sine";

      osc.frequency.setValueAtTime(
        frequency,
        start
      );

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        start + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);

      osc.stop(
        start + duration + 0.05
      );
    };


    const now =
      ctx.currentTime;

    chime(
      659.25,
      now,
      0.55,
      0.22
    );

    chime(
      783.99,
      now + 0.16,
      0.7,
      0.20
    );

    chime(
      1046.5,
      now + 0.34,
      1.0,
      0.18
    );

  } catch (e) {

    console.log(
      "Sound unavailable",
      e
    );

  }
}


// --------------------
// SETTINGS EVENTS
// --------------------

minutesSelect.addEventListener(
  "change",
  () => {

    durationMinutes =
      Number(minutesSelect.value);

    resetClock(false);

    saveSettings();

    statusText.textContent =
      `Set to ${durationMinutes} minutes per station.`;
  }
);


transitionSelect.addEventListener(
  "change",
  () => {

    transitionMinutes =
      Number(transitionSelect.value);

    saveSettings();

    statusText.textContent =
      transitionMinutes === 0
        ? "Transition timer turned off."
        : `Transition time set to ${transitionMinutes} minute${
            transitionMinutes === 1 ? "" : "s"
          }.`;
  }
);


stationCountSelect.addEventListener(
  "change",
  () => {

    stationCount =
      Number(stationCountSelect.value);

    if (
      currentStation >= stationCount
    ) {
      currentStation = 0;
    }

    resetClock(false);

    updateDisplay({
      rebuildStations: true
    });

    statusText.textContent =
      `${stationCount} stations selected.`;
  }
);


autoAdvanceToggle.addEventListener(
  "change",
  () => {

    autoAdvance =
      autoAdvanceToggle.checked;

    saveSettings();
  }
);


soundToggle.addEventListener(
  "change",
  () => {

    soundOn =
      soundToggle.checked;

    saveSettings();

    if (soundOn) {
      playBell();
    }
  }
);


// --------------------
// BUTTONS
// --------------------

startPauseBtn.addEventListener(
  "click",
  startTimer
);

resetBtn.addEventListener(
  "click",
  () => resetClock(true)
);

nextBtn.addEventListener(
  "click",
  nextStation
);


// --------------------
// FULL SCREEN
// --------------------

fullscreenBtn.addEventListener(
  "click",
  async () => {

    try {

      if (!document.fullscreenElement) {

        await document.documentElement
          .requestFullscreen();

        document.body.classList.add(
          "fullscreen-mode"
        );

        fullscreenBtn.textContent =
          "✕ Exit Full Screen";

      } else {

        await document.exitFullscreen();

      }

    } catch {

      document.body.classList.toggle(
        "fullscreen-mode"
      );

      fullscreenBtn.textContent =
        document.body.classList.contains(
          "fullscreen-mode"
        )
          ? "✕ Exit Full Screen"
          : "⛶ Full Screen";
    }
  }
);


document.addEventListener(
  "fullscreenchange",
  () => {

    if (!document.fullscreenElement) {

      document.body.classList.remove(
        "fullscreen-mode"
      );

      fullscreenBtn.textContent =
        "⛶ Full Screen";
    }
  }
);


// --------------------
// STARTUP
// --------------------

ensureStationNames();

totalSeconds =
  durationMinutes * 60;

remainingSeconds =
  totalSeconds;

renderStations();

updateDisplay();
