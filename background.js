// background.js

let offscreenWindow;

// Debug flag for shorter durations
const DEBUG = false; // Set to true for 25s work / 5s break

// Timer state variables
const pomodoroDuration = DEBUG ? 25 : 25 * 60; // 25 minutes or 25 seconds
const breakDuration = DEBUG ? 5 : 5 * 60; // 5 minutes or 5 seconds
let currentTimer = pomodoroDuration;
let isRunning = false;
let timerState = 'work'; // 'work', 'break', 'done'
let currentSet = 0;
let totalSets = 4; // Default value
let timerIntervalId; // To store setInterval ID for real-time updates

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

// Function to play alarm sound
async function playAlarm() {
  await setupOffscreenDocument('offscreen.html');
  chrome.runtime.sendMessage({ action: 'playAlarmInOffscreen' });
}

// Function to handle timer tick
function tick() {
  currentTimer--;
  sendTimerStateToPopup();

  if (currentTimer <= 0) {
    clearInterval(timerIntervalId);
    playAlarm();

    if (timerState === 'work') {
      // Work session ended, start break
      startBreak();
    } else if (timerState === 'break') {
      // Break session ended, check for next work session or finish
      currentSet++; // Increment set after break
      if (currentSet >= totalSets) {
        finishAll();
      } else {
        startWork();
      }
    }
  }
  saveTimerState();
}

// Function to start a work session
function startWork() {
  timerState = 'work';
  currentTimer = pomodoroDuration;
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
  }
  timerIntervalId = setInterval(tick, 1000);
  isRunning = true;
  sendTimerStateToPopup();
  saveTimerState();
}

// Function to start a break session
function startBreak() {
  timerState = 'break';
  currentTimer = breakDuration;
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
  }
  timerIntervalId = setInterval(tick, 1000);
  isRunning = true;
  sendTimerStateToPopup();
  saveTimerState();
}

// Function to finish all sets
function finishAll() {
  timerState = 'done';
  isRunning = false;
  clearInterval(timerIntervalId);
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon_clock48.png',
    title: 'All Sets Complete!',
    message: 'You have finished all your Pomodoro sets.',
    priority: 2,
  });
  sendTimerStateToPopup();
  saveTimerState();
}

// Function to pause the timer
function pauseTimer() {
  isRunning = false;
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
      return true; // Indicates we will send a response asynchronously
    case 'startTimer':
      if (!isRunning) {
        if (request.totalSets) {
          totalSets = request.totalSets;
        }
        // If starting from a fresh state or after 'done', reset and start work
        if (timerState === 'done' || currentSet === 0) {
           resetTimer(); // This will set timerState to 'work' and currentSet to 0
           totalSets = request.totalSets; // Ensure totalSets is updated after reset
        }
        startWork();
      }
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
  return false; // No asynchronous response for other messages
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
