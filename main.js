import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vpqmpfqlcftmifrumvgb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcW1wZnFsY2Z0bWlmcnVtdmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjA3NTAsImV4cCI6MjA2NjE5Njc1MH0.Tr-Kv0LhmfqkqIoNPmJ1W5J-xY7yX_sdKZ_8waFHFWg'
);

window.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const habitInput = document.getElementById('habit-input');
  const addHabitBtn = document.getElementById('add-habit-btn');
  const startDayBtn = document.getElementById('start-day-btn');
  const clearBtn = document.getElementById('clear-btn');
  const habitList = document.getElementById('habit-list');
  const taskCountText = document.getElementById('task-count');
  const yourProgress = document.getElementById('your-progress');
  const levelText = document.getElementById('level');
  const loginGoogleBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authMessage = document.getElementById('auth-message');
  const habitSection = document.getElementById('habit-section'); // You might need to add this div around your habit controls
  const loadingOverlay = document.getElementById('loading-overlay');

  let tasks = [];
  let completedTasks = 0;
  let level = 0;
  let currentUser = null;

  // Loading overlay functions
  function showLoading() {
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  // Show loading initially
  showLoading();

  // Make variables globally accessible for debugging
  window.debugInfo = {
    getTasks: () => tasks,
    getCompletedTasks: () => completedTasks,
    getLevel: () => level,
    getCurrentUser: () => currentUser
  };

  const preDayList = document.createElement('div');
  document.body.insertBefore(preDayList, habitList);

  // Check initial session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      authMessage.textContent = 'Error checking authentication status';
    }

    if (session) {
      await handleUserLogin(session.user);
    } else {
      showLoginState();
    }
  } catch (error) {
    console.error('Error during initial auth check:', error);
    authMessage.textContent = 'Error checking authentication status';
  } finally {
    // Hide loading after authentication check is complete
    hideLoading();
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' && session) {
      await handleUserLogin(session.user);
    } else if (event === 'SIGNED_OUT') {
      handleUserLogout();
    }
  });

  async function updateGroupProgressHeader() {
    const groupProgressEl = document.getElementById('group-progress');
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('level, completed_tasks');
      
      if (error) {
        groupProgressEl.textContent = 'Error loading';
        return;
      }
      
      const totalMembers = users.length;
      const averageLevel = totalMembers > 0 
        ? (users.reduce((sum, user) => sum + (user.level || 0), 0) / totalMembers).toFixed(1)
        : 0;
      
      groupProgressEl.textContent = `${totalMembers} members, avg ${averageLevel}`;
    } catch (error) {
      groupProgressEl.textContent = 'Error loading';
    }
  }

  async function handleUserLogin(user) {
    currentUser = user;
    console.log("Logged in as:", user.email);
    authMessage.textContent = `Welcome, ${user.email}!`;

    try {
      // First, try to get existing user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Fetched user data:', existingUser);
      console.log('Fetch error:', fetchError);

      if (existingUser && !fetchError) {
        // Load existing progress
        tasks = existingUser.tasks || [];
        completedTasks = existingUser.completed_tasks || 0;
        level = existingUser.level || 0;
        
        console.log('Loaded from database:', { tasks, completedTasks, level });
        
        // Update UI with loaded data
        loadUserProgress();
      } else {
        // Create new user record
        const { error } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name ?? user.email.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url ?? null,
          level: 0,
          tasks: [],
          completed_tasks: 0
        });

        console.log('Created new user, error:', error);

        if (error) {
          console.error('Error creating user:', error);
          authMessage.textContent = 'Error saving user data';
        }
      }
    } catch (error) {
      console.error('Database error:', error);
    }

    showHabitSection();
    await updateGroupProgressHeader();
  }

  function handleUserLogout() {
    currentUser = null;
    authMessage.textContent = '';
    showLoginState();
    
    // Reset all data
    tasks = [];
    completedTasks = 0;
    level = 0;
    preDayList.innerHTML = "";
    habitList.innerHTML = "";
    habitInput.value = "";
    taskCountText.textContent = "Tasks added: 0 / 10";
    yourProgress.textContent = "Level: 0";
    levelText.textContent = "Level: 0";
  }

  function showLoginState() {
    loginGoogleBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    
    // Hide habit controls
    habitInput.style.display = 'none';
    addHabitBtn.style.display = 'none';
    startDayBtn.style.display = 'none';
    clearBtn.style.display = 'none';
    taskCountText.style.display = 'none';
    levelText.style.display = 'none';
  }

  function showHabitSection() {
    loginGoogleBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    
    // Show habit controls
    habitInput.style.display = 'block';
    addHabitBtn.style.display = 'inline-block';
    startDayBtn.style.display = 'inline-block';
    clearBtn.style.display = 'inline-block';
    taskCountText.style.display = 'block';
    levelText.style.display = 'block';
  }

  // Google login event listener
  loginGoogleBtn.addEventListener('click', async () => {
    try {
      authMessage.textContent = 'Signing in...';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) {
        console.error('OAuth login error:', error);
        authMessage.textContent = `Login error: ${error.message}`;
      }
    } catch (error) {
      console.error('Login error:', error);
      authMessage.textContent = 'Login failed. Please try again.';
    }
  });

  // Logout event listener
  logoutBtn.addEventListener('click', async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        authMessage.textContent = `Logout error: ${error.message}`;
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  addHabitBtn.addEventListener('click', async () => {
    const habitText = habitInput.value.trim();

    if (habitText !== "" && tasks.length < 10) {
      tasks.push(habitText);
      taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
      habitInput.value = "";

      const taskItem = document.createElement('div');
      taskItem.classList.add('habit-item');

      const label = document.createElement('span');
      label.textContent = habitText;

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

      removeBtn.addEventListener('click', async () => {
        const index = tasks.indexOf(habitText);
        if (index > -1) {
          tasks.splice(index, 1);
        }
        preDayList.removeChild(taskItem);
        taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
        if (tasks.length < 10) {
          startDayBtn.disabled = true;
        }
        
        // Save updated tasks to database
        await saveUserProgress();
      });

      taskItem.appendChild(label);
      taskItem.appendChild(removeBtn);
      preDayList.appendChild(taskItem);

      if (tasks.length === 10) {
        startDayBtn.disabled = false;
      }
      
      // Save updated tasks to database
      await saveUserProgress();
    }
  });

  startDayBtn.addEventListener('click', async () => {
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

      checkbox.addEventListener('change', async () => {
        if (checkbox.checked) {
          completedTasks = Math.min(completedTasks + 1, 10);
        } else {
          completedTasks = Math.max(completedTasks - 1, 0);
        }
        updateLevel();
        label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        
        // Save progress to database
        await saveUserProgress();
      });

      habitItem.appendChild(checkbox);
      habitItem.appendChild(label);
      habitList.appendChild(habitItem);
    });

    habitInput.style.display = "none";
    addHabitBtn.style.display = "none";
    startDayBtn.style.display = "none";
    taskCountText.style.display = "none";
    
    // Save that user has started their day
    await saveUserProgress();
  });

  clearBtn.addEventListener('click', async () => {
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
    
    // Save cleared progress to database
    await saveUserProgress();
  });

  function updateLevel() {
    level = completedTasks;

    if (level > 10) level = 10;

    if (level === 10) {
      yourProgress.textContent = "Level: 10";
      levelText.textContent = "🔥🦍🦍  LFG!!!!! DAY CONQUERED — LEVEL 10 🦍🦍🔥";
    } else {
      yourProgress.textContent = `Level: ${level}`;
      levelText.textContent = `Level: ${level}`;
    }
  }

  function loadUserProgress() {
    // Update task counter
    taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
    
    // Update level display
    updateLevel();
    
    // If user has tasks but hasn't started the day, show them in pre-day list
    if (tasks.length > 0 && completedTasks === 0) {
      preDayList.innerHTML = "";
      tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('habit-item');

        const label = document.createElement('span');
        label.textContent = task;

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

        removeBtn.addEventListener('click', async () => {
          const index = tasks.indexOf(task);
          if (index > -1) {
            tasks.splice(index, 1);
          }
          preDayList.removeChild(taskItem);
          taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
          startDayBtn.disabled = tasks.length < 10;
          
          // Save updated tasks to database
          await saveUserProgress();
        });

        taskItem.appendChild(label);
        taskItem.appendChild(removeBtn);
        preDayList.appendChild(taskItem);
      });
      
      startDayBtn.disabled = tasks.length < 10;
    }
    
    // If user has started the day (has completed tasks tracked), show checkboxes
    if (tasks.length > 0 && completedTasks >= 0) {
      habitList.innerHTML = "";
      let currentCompletedCount = 0;
      
      tasks.forEach((task, index) => {
        const habitItem = document.createElement('div');
        habitItem.classList.add('habit-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        
        // Check if this task should be completed based on our completed count
        if (currentCompletedCount < completedTasks) {
          checkbox.checked = true;
          currentCompletedCount++;
        }

        const label = document.createElement('span');
        label.textContent = task;
        label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';

        checkbox.addEventListener('change', async () => {
          if (checkbox.checked) {
            completedTasks = Math.min(completedTasks + 1, 10);
          } else {
            completedTasks = Math.max(completedTasks - 1, 0);
          }
          updateLevel();
          label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
          
          // Save progress to database
          await saveUserProgress();
        });

        habitItem.appendChild(checkbox);
        habitItem.appendChild(label);
        habitList.appendChild(habitItem);
      });
      
      // Hide the pre-day controls if day has started
      if (completedTasks > 0 || tasks.length === 10) {
        habitInput.style.display = "none";
        addHabitBtn.style.display = "none";
        startDayBtn.style.display = "none";
        taskCountText.style.display = "none";
      }
    }
  }

  async function saveUserProgress() {
    if (!currentUser) return;
    
    console.log('Saving progress:', { tasks, completedTasks, level });
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          tasks: tasks,
          completed_tasks: completedTasks,
          level: level,
        })
        .eq('id', currentUser.id);
        
      if (error) {
        console.error('Error saving progress:', error);
      } else {
        console.log('Progress saved successfully');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }
});