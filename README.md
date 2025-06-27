# PomodoTo: Pomodoro Timer & Todo List

A simple yet powerful Chrome extension that combines a Pomodoro timer with a todo list to boost your productivity.

## Features

*   **Todo List:** A simple and effective todo list to manage your tasks.
*   **Pomodoro Timer:** A classic 25-minute work timer followed by a 5-minute break.
*   **Background Timer Management:** The timer runs in the background, so you can close the popup without interrupting your session.
*   **Automatic Work/Break Loop:** The timer automatically cycles through work and break sessions until the specified number of sets is complete.
*   **Alarm Sounds:** Plays an alarm sound to notify you when it's time to switch between work and break sessions.

## Screenshot

![Screenshot](images/screenshot.png)

## Installation

1.  Clone the repository from GitHub:
    ```bash
    git clone https://github.com/NoCodeAIMaster/pomodoto.git
    ```
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click on "Load unpacked".
5.  Select the cloned `pomodoto` directory.

## Usage

1.  **Set the number of Pomodoro sets:** Before starting, you can specify how many work/break cycles you want to complete.
2.  **Start:** Click the "Start" button to begin the first work session.
3.  **Pause/Resume:** You can pause the timer at any time and resume when you're ready.
4.  **Reset:** The "Reset" button stops the timer and resets the cycle to the beginning.

## For Developers

### Repository Structure

```
.
├── background.js       # Service worker for background tasks (timer logic)
├── manifest.json       # Extension manifest file
├── offscreen.html      # Offscreen document for playing audio
├── offscreen.js        # Script for the offscreen document
├── popup.css           # Styles for the popup
├── popup.html          # HTML for the extension's popup
├── popup.js            # Logic for the popup UI and user interaction
├── images/             # Icons and other image assets
└── sounds/             # Sound files for alarms
```

### Build/Test

There are no specific build or test steps required for this extension. Simply load the unpacked extension in Chrome as described in the installation instructions.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

---

![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)
_Made with ❤️ by Gemini_