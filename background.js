"""// background.js

let offscreenWindow;

// Timer state variables
const pomodoroDuration = 25 * 60; // 25 minutes
const breakDuration = 5 * 60; // 5 minutes
let currentTimer = pomodoroDuration;
let isRunning = false;
let timerState = 'work'; // 'work', 'break', 'done'
let currentSet = 0;
let totalSets = 4; // Default value
let timerIntervalId;

// Function to save timer state to local storage
async function saveTimerState() {
  await chrome.storage.local.set({
    currentTimer,
    isRunning,
    timerState,
    currentSet,
    totalSets,
  });
}

// Function to load timer state from local storage
async function loadTimerState() {
  const result = await chrome.storage.local.get([
    'currentTimer',
    'isRunning',
    'timerState',
    'currentSet',
    'totalSets',
  ]);
  currentTimer = result.currentTimer !== undefined ? result.currentTimer : pomodoroDuration;
  isRunning = result.isRunning || false;
  timerState = result.timerState || 'work';
  currentSet = result.currentSet || 0;
  totalSets = result.totalSets || 4;
}

// Initialize timer state on startup
loadTimerState();

// Function to send timer state to popup
function sendTimerStateToPopup() {
  chrome.runtime.sendMessage({
    action: 'updateTimerDisplay',
    currentTimer,
    isRunning,
    timerState,
    currentSet,
    totalSets,
  }).catch(error => {
    if (error.message.includes('Could not establish connection')) {
      // Popup is not open, this is expected.
    } else {
      console.error("Error sending message to popup:", error);
    }
  });
}

// Function to start the timer
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  // Use a small delay to ensure the alarm doesn't fire immediately
  // if currentTimer is very short.
  const delayInMinutes = Math.max(currentTimer / 60, 0.01);
  chrome.alarms.create('pomodoroTimer', {
    delayInMinutes: delayInMinutes,
  });
  
  // Clear any existing interval before creating a new one
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
  }

  timerIntervalId = setInterval(() => {
    currentTimer--;
    sendTimerStateToPopup();
    if (currentTimer <= 0) {
      clearInterval(timerIntervalId);
    }
  }, 1000);
  saveTimerState();
}

// Function to pause the timer
function pauseTimer() {
  isRunning = false;
  chrome.alarms.clear('pomodoroTimer');
  clearInterval(timerIntervalId);
  saveTimerState();
  sendTimerStateToPopup();
}

// Function to reset the timer
function resetTimer() {
  pauseTimer();
  timerState = 'work';
  currentTimer = pomodoroDuration;
  currentSet = 0;
  saveTimerState();
  sendTimerStateToPopup();
}

// Alarm listener for session transitions
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoroTimer') {
    await setupOffscreenDocument('offscreen.html');
    chrome.runtime.sendMessage({ action: 'playAlarmInOffscreen' });

    if (timerState === 'work') {
      // Finished a work session
      currentSet++;
      if (currentSet >= totalSets) {
        // Final work session completed
        timerState = 'done';
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon_clock48.png',
          title: 'All Sets Complete!',
          message: 'You have finished all your Pomodoro sets.',
          priority: 2,
        });
        // We call pauseTimer here which handles clearing intervals and alarms
        pauseTimer();
      } else {
        // Start a break
        timerState = 'break';
        currentTimer = breakDuration;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon_clock48.png',
          title: 'Work Session Complete!',
          message: 'Time for a break.',
          priority: 2,
        });
        startTimer();
      }
    } else if (timerState === 'break') {
      // Finished a break session, start next work session
      timerState = 'work';
      currentTimer = pomodoroDuration;
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon_clock48.png',
        title: 'Break Complete!',
        message: 'Starting next work session.',
        priority: 2,
      });
      startTimer();
    }
    saveTimerState();
    sendTimerStateToPopup();
  }
});

// Message listener from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request.action);
  switch (request.action) {
    case 'getTimerState':
      sendResponse({
        currentTimer,
        isRunning,
        timerState,
        currentSet,
        totalSets,
      });
      break;
    case 'startTimer':
      if (request.totalSets && !isRunning) {
        totalSets = request.totalSets;
        if (timerState === 'done' || currentSet === 0) {
           resetTimer();
           totalSets = request.totalSets;
        }
      }
      startTimer();
      break;
    case 'pauseTimer':
      pauseTimer();
      break;
    case 'resetTimer':
      resetTimer();
      break;
    case 'setTotalPomodoroSets':
      totalSets = request.sets;
      if (!isRunning) {
        currentTimer = pomodoroDuration;
        currentSet = 0;
        timerState = 'work';
      }
      saveTimerState();
      sendTimerStateToPopup();
      break;
    case 'playAlarmInOffscreen':
        // This message is for the offscreen document, not the background script.
        // We can ignore it here.
        break;
    default:
      console.warn("Unknown action received:", request.action);
  }
  // Return true to indicate that we might send a response asynchronously.
  // This is important for preventing the message port from closing prematurely.
  return true;
});

// Offscreen document setup for alarm sound
async function setupOffscreenDocument(path) {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playing alarm sound for Pomodoro timer',
  });
}
""
