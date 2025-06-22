window.addEventListener('DOMContentLoaded', () => {
  const habitInput = document.getElementById('habit-input');
  const addHabitBtn = document.getElementById('add-habit-btn');
  const startDayBtn = document.getElementById('start-day-btn');
  const clearBtn = document.getElementById('clear-btn'); // Clear All button
  const habitList = document.getElementById('habit-list');
  const taskCountText = document.getElementById('task-count');
  const yourProgress = document.getElementById('your-progress');
  const levelText = document.getElementById('level');

  let tasks = [];
  let completedTasks = 0;
  let level = 0;

  const preDayList = document.createElement('div');
  document.body.insertBefore(preDayList, habitList);

  addHabitBtn.addEventListener('click', () => {
    const habitText = habitInput.value.trim();

    if (habitText !== "" && tasks.length < 10) {
      tasks.push(habitText);
      taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
      habitInput.value = "";

      const taskItem = document.createElement('div');
      taskItem.classList.add('habit-item');

      // Label text
      const label = document.createElement('span');
      label.textContent = habitText;

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '❌';
      removeBtn.style.marginLeft = 'auto';
      removeBtn.style.background = 'transparent';
      removeBtn.style.border = 'none';
      removeBtn.style.color = '#f54242';
      removeBtn.style.fontSize = '1rem';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.padding = '0 6px';
      removeBtn.style.lineHeight = '1';
      removeBtn.style.userSelect = 'none';
      removeBtn.style.display = 'flex';
      removeBtn.style.alignItems = 'center';
      removeBtn.style.justifyContent = 'center';

      removeBtn.addEventListener('click', () => {
        const index = tasks.indexOf(habitText);
        if (index > -1) {
          tasks.splice(index, 1);
        }
        preDayList.removeChild(taskItem);
        taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
        if (tasks.length < 10) {
          startDayBtn.disabled = true;
        }
      });

      taskItem.appendChild(label);
      taskItem.appendChild(removeBtn);
      preDayList.appendChild(taskItem);

      if (tasks.length === 10) {
        startDayBtn.disabled = false;
      }
    }
  });

  startDayBtn.addEventListener('click', () => {
    completedTasks = 0;
    level = 0;
    updateLevel();

    habitList.innerHTML = "";
    preDayList.innerHTML = "";

    tasks.forEach(task => {
      const habitItem = document.createElement('div');
      habitItem.classList.add('habit-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      const label = document.createElement('span');
      label.textContent = task;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          completedTasks = Math.min(completedTasks + 1, 10);
        } else {
          completedTasks = Math.max(completedTasks - 1, 0);
        }
        updateLevel();
        label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
      });

      habitItem.appendChild(checkbox);
      habitItem.appendChild(label);
      habitList.appendChild(habitItem);
    });

    habitInput.style.display = "none";
    addHabitBtn.style.display = "none";
    startDayBtn.style.display = "none";
    taskCountText.style.display = "none";
  });

  // NEW: Clear All button functionality
  clearBtn.addEventListener('click', () => {
    tasks = [];
    completedTasks = 0;
    level = 0;

    preDayList.innerHTML = "";
    habitList.innerHTML = "";

    habitInput.style.display = "block";
    addHabitBtn.style.display = "inline-block";
    startDayBtn.style.display = "inline-block";
    taskCountText.style.display = "block";

    habitInput.value = "";
    taskCountText.textContent = "Tasks added: 0 / 10";
    yourProgress.textContent = "Level: 0";
    levelText.textContent = "Level: 0";
    startDayBtn.disabled = true;
  });

  function updateLevel() {
    level = completedTasks;

    if (level > 10) level = 10;

    if (level === 10) {
      yourProgress.textContent = "🔥🦍🦍  LFG!!!!! DAY CONQUERED  🦍🦍🔥";
    } else {
      yourProgress.textContent = `Level: ${level}`;
    }

    levelText.textContent = yourProgress.textContent;
  }
});
