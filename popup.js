// popup.js

const timerDisplay = document.getElementById('timer-display');
const timerStateDisplay = document.getElementById('timer-state-display');
const startButton = document.getElementById('start-timer');
const pauseButton = document.getElementById('pause-timer');
const resetButton = document.getElementById('reset-timer');
const pomodoroSetsInput = document.getElementById('pomodoro-sets');
const newTodoInput = document.getElementById('new-todo');
const addTodoButton = document.getElementById('add-todo');
const todoList = document.getElementById('todo-list');

// --- Timer Functions (communicating with background.js) ---

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(currentTimer, isRunning, timerState, currentSet, totalSets) {
  timerDisplay.textContent = formatTime(currentTimer);
  pomodoroSetsInput.value = totalSets;

  switch (timerState) {
    case 'work':
      timerStateDisplay.textContent = `Work (${currentSet + 1}/${totalSets})`;
      break;
    case 'break':
      timerStateDisplay.textContent = `Break (${currentSet}/${totalSets})`;
      break;
    case 'done':
      timerStateDisplay.textContent = 'Done!';
      timerDisplay.textContent = 'Good Job!';
      break;
  }

  startButton.style.display = isRunning ? 'none' : 'inline-block';
  pauseButton.style.display = isRunning ? 'inline-block' : 'none';
  resetButton.disabled = isRunning && timerState !== 'done';
}

// Request initial timer state from background.js
function getInitialTimerState() {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    if (response) {
      updateTimerDisplay(response.currentTimer, response.isRunning, response.timerState, response.currentSet, response.totalSets);
    }
  });
}

// --- Todo List Functions ---

function saveTodos(todos) {
  chrome.storage.local.set({ todos: todos });
}

function loadTodos() {
  chrome.storage.local.get(['todos'], function(result) {
    const todos = result.todos || [];
    todos.forEach(todo => addTodoToDOM(todo.text, todo.completed));
  });
}

function addTodoToDOM(text, completed = false) {
  const listItem = document.createElement('li');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = completed;
  checkbox.addEventListener('change', () => {
    listItem.classList.toggle('completed', checkbox.checked);
    updateTodosInStorage();
  });

  const todoText = document.createElement('span');
  todoText.textContent = text;

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', () => {
    listItem.remove();
    updateTodosInStorage();
  });

  listItem.appendChild(checkbox);
  listItem.appendChild(todoText);
  listItem.appendChild(deleteButton);
  todoList.appendChild(listItem);

  if (completed) {
    listItem.classList.add('completed');
  }
}

function updateTodosInStorage() {
  const todos = [];
  todoList.querySelectorAll('li').forEach(listItem => {
    const text = listItem.querySelector('span').textContent;
    const completed = listItem.querySelector('input[type="checkbox"]').checked;
    todos.push({ text, completed });
  });
  saveTodos(todos);
}

// --- Event Listeners ---

startButton.addEventListener('click', () => {
  const totalSets = parseInt(pomodoroSetsInput.value);
  chrome.runtime.sendMessage({ action: 'startTimer', totalSets: totalSets }).catch(error => {
    console.error("Error sending startTimer message:", error);
  });
});

pauseButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pauseTimer' }).catch(error => {
    console.error("Error sending pauseTimer message:", error);
  });
});

resetButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetTimer' }).catch(error => {
    console.error("Error sending resetTimer message:", error);
  });
});

pomodoroSetsInput.addEventListener('change', (event) => {
  const sets = parseInt(event.target.value);
  chrome.runtime.sendMessage({ action: 'setTotalPomodoroSets', sets: sets }).catch(error => {
    console.error("Error sending setTotalPomodoroSets message:", error);
  });
});

addTodoButton.addEventListener('click', () => {
  const todoText = newTodoInput.value.trim();
  if (todoText) {
    addTodoToDOM(todoText);
    updateTodosInStorage();
    newTodoInput.value = '';
  }
});

newTodoInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addTodoButton.click();
  }
});

// Listen for timer updates from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTimerDisplay') {
    updateTimerDisplay(request.currentTimer, request.isRunning, request.timerState, request.currentSet, request.totalSets);
  }
});

// Initial load
getInitialTimerState();
loadTodos();
