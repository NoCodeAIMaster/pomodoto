// background.js

let offscreenWindow;

// Timer state variables
const pomodoroDuration = 25 * 60; // 25 minutes
const breakDuration = 5 * 60; // 5 minutes
let currentTimer = pomodoroDuration;
let isRunning = false;
let timerState = 'work'; // 'work', 'break', 'done'
let setsCompleted = 0;
let totalSets = 4; // Default value
let timerIntervalId;

// Function to save timer state to local storage
async function saveTimerState() {
  await chrome.storage.local.set({
    currentTimer,
    isRunning,
    timerState,
    setsCompleted,
    totalSets,
  });
}

// Function to load timer state from local storage
async function loadTimerState() {
  const result = await chrome.storage.local.get([
    'currentTimer',
    'isRunning',
    'timerState',
    'setsCompleted',
    'totalSets',
  ]);
  currentTimer = result.currentTimer !== undefined ? result.currentTimer : pomodoroDuration;
  isRunning = result.isRunning || false;
  timerState = result.timerState || 'work';
  setsCompleted = result.setsCompleted || 0;
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
    setsCompleted,
    totalSets,
  });
}

// Function to start the timer
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  saveTimerState();
  chrome.alarms.create('pomodoroTimer', {
    delayInMinutes: currentTimer / 60,
  });
  // Start real-time updates if popup is open
  timerIntervalId = setInterval(() => {
    currentTimer--;
    sendTimerStateToPopup();
    if (currentTimer <= 0) {
      clearInterval(timerIntervalId);
    }
  }, 1000);
}

// Function to pause the timer
function pauseTimer() {
  isRunning = false;
  saveTimerState();
  chrome.alarms.clear('pomodoroTimer');
  clearInterval(timerIntervalId);
  sendTimerStateToPopup();
}

// Function to reset the timer
function resetTimer() {
  pauseTimer();
  timerState = 'work';
  currentTimer = pomodoroDuration;
  setsCompleted = 0;
  saveTimerState();
  sendTimerStateToPopup();
}

// Alarm listener for session transitions
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoroTimer') {
    await setupOffscreenDocument('offscreen.html');
    chrome.runtime.sendMessage({ action: 'playAlarmInOffscreen' });

    if (timerState === 'work') {
      setsCompleted++;
      if (setsCompleted >= totalSets) {
        timerState = 'done';
        pauseTimer();
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon_clock48.png',
          title: 'All Sets Complete!',
          message: 'You have finished all your Pomodoro sets.',
          priority: 2,
        });
      } else {
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
  if (request.action === 'getTimerState') {
    sendResponse({
      currentTimer,
      isRunning,
      timerState,
      setsCompleted,
      totalSets,
    });
  } else if (request.action === 'startTimer') {
    if (request.totalSets) {
      totalSets = request.totalSets;
    }
    startTimer();
  } else if (request.action === 'pauseTimer') {
    pauseTimer();
  } else if (request.action === 'resetTimer') {
    resetTimer();
  } else if (request.action === 'setTotalPomodoroSets') {
    totalSets = request.sets;
    if (!isRunning) {
      currentTimer = pomodoroDuration;
      setsCompleted = 0;
      timerState = 'work';
    }
    saveTimerState();
  }
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
