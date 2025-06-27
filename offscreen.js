// offscreen.js

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'playAlarmInOffscreen') {
    const audio = new Audio('/sounds/alarm.mp3'); // Assuming alarm.mp3 is in a 'sounds' folder
    audio.play();
  }
});
