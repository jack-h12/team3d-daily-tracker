import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vpqmpfqlcftmifrumvgb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcW1wZnFsY2Z0bWlmcnVtdmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjA3NTAsImV4cCI6MjA2NjE5Njc1MH0.Tr-Kv0LhmfqkqIoNPmJ1W5J-xY7yX_sdKZ_8waFHFWg',
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

window.addEventListener('DOMContentLoaded', async () => {
  // Add avatar card to main page FIRST
  const avatarCard = document.createElement('div');
  avatarCard.id = 'main-avatar-card';
  avatarCard.style.display = 'flex';
  avatarCard.style.flexDirection = 'column';
  avatarCard.style.justifyContent = 'center';
  avatarCard.style.alignItems = 'center';
  avatarCard.style.margin = '30px 0 10px 0';

  // Main profile avatar (custom or fallback)
  const avatarImg = document.createElement('img');
  avatarImg.id = 'main-avatar-img';
  avatarImg.style.width = '280px';
  avatarImg.style.height = '280px';
  avatarImg.style.borderRadius = '50%';
  avatarImg.style.objectFit = 'cover';
  avatarImg.style.border = '12px solid #f54242';
  avatarImg.style.background = '#fff';
  avatarImg.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
  avatarImg.alt = 'Profile Avatar';
  avatarCard.appendChild(avatarImg);

  // Level avatar badge (always shows level-based avatar)
  const levelAvatarBadge = document.createElement('div');
  levelAvatarBadge.id = 'level-avatar-badge';
  levelAvatarBadge.style.display = 'flex';
  levelAvatarBadge.style.flexDirection = 'column';
  levelAvatarBadge.style.alignItems = 'center';
  levelAvatarBadge.style.marginTop = '18px';

  const levelAvatarImg = document.createElement('img');
  levelAvatarImg.id = 'level-avatar-img';
  levelAvatarImg.style.width = '180px';
  levelAvatarImg.style.height = '180px';
  levelAvatarImg.style.borderRadius = '50%';
  levelAvatarImg.style.objectFit = 'cover';
  levelAvatarImg.style.border = '8px solid #f54242';
  levelAvatarImg.style.background = '#fff';
  levelAvatarImg.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
  levelAvatarImg.alt = 'Level Avatar';
  levelAvatarBadge.appendChild(levelAvatarImg);

  const levelAvatarLabel = document.createElement('span');
  levelAvatarLabel.textContent = 'Level Avatar';
  levelAvatarLabel.style.fontSize = '0.95rem';
  levelAvatarLabel.style.color = '#f54242';
  levelAvatarLabel.style.marginTop = '2px';
  levelAvatarBadge.appendChild(levelAvatarLabel);

  avatarCard.appendChild(levelAvatarBadge);

  // Insert avatar card into the left column of the new layout
  const leftColumn = document.getElementById('left-column');
  if (leftColumn) {
    leftColumn.appendChild(avatarCard);
  }

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
  const rewardInput = document.getElementById('reward-input');

  let tasks = [];
  let rewards = [];
  let completedTasks = 0;
  let level = 0;
  let currentUser = null;
  let currentUserAvatarUrl = null;

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
  const rightColumn = document.getElementById('right-column');
  if (rightColumn && habitList) {
    rightColumn.insertBefore(preDayList, habitList);
  }

  // Level avatar mapping (now using /avatars/ for correct public path)
  const levelAvatars = {
    0: '/avatars/level-0-gollum.jpg',
    1: '/avatars/level-1-babythanos.webp',
    2: '/avatars/level-2-boythanos.jpg',
    3: '/avatars/level-3-injuredthanos.jpg',
    4: '/avatars/level-4-basethanos.jpg',
    5: '/avatars/level-5-basethanosupgrade.jpg',
    6: '/avatars/level-6-thanoswithonestone.webp',
    7: '/avatars/level-7-thanoswith2infinitystones.avif',
    8: '/avatars/level-8-thanoswith4inifinitystones.jpg',
    9: '/avatars/level-9-thanoswithallinfinitystones.webp',
    10: '/avatars/level-10-thanosgoku.jpg',
  };

  // Helper to update avatar image
  function updateMainAvatar(userData) {
    // Custom profile avatar (if any)
    if (userData && userData.avatar_url) {
      avatarImg.src = userData.avatar_url;
    } else {
      avatarImg.src = '/avatars/level-0-gollum.webp';
    }
    // Level avatar badge (always level-based)
    const userLevel = userData && userData.level !== undefined ? userData.level : 0;
    levelAvatarImg.src = levelAvatars[userLevel] || levelAvatars[0];
  }

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
    // Fetch user data to get the name
    let displayName = user.email;
    try {
      // First, try to get existing user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser && !fetchError) {
        displayName = existingUser.name || user.email;
        // Load existing progress
        tasks = existingUser.tasks || [];
        rewards = existingUser.rewards || [];
        completedTasks = existingUser.completed_tasks || 0;
        level = existingUser.level || 0;
        currentUserAvatarUrl = existingUser.avatar_url || null;
        console.log('Loaded from database:', { tasks, completedTasks, level });
        
        // Update UI with loaded data
        loadUserProgress();
        updateMainAvatar({ avatar_url: currentUserAvatarUrl, level });
      } else {
        // Create new user record
        const { error } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name ?? user.email.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url ?? null,
          level: 0,
          tasks: [],
          rewards: [],
          completed_tasks: 0
        });
        currentUserAvatarUrl = user.user_metadata?.avatar_url ?? null;
        console.log('Created new user, error:', error);

        if (error) {
          console.error('Error creating user:', error);
          authMessage.textContent = 'Error saving user data';
        }
        // Show default avatar
        updateMainAvatar({ avatar_url: currentUserAvatarUrl, level: 0 });
      }
    } catch (error) {
      console.error('Database error:', error);
      updateMainAvatar({ avatar_url: currentUserAvatarUrl, level: 0 });
    }

    authMessage.textContent = `Welcome, ${displayName}!`;
    showHabitSection();
    await updateGroupProgressHeader();
  }

  function handleUserLogout() {
    currentUser = null;
    currentUserAvatarUrl = null;
    authMessage.textContent = '';
    showLoginState();
    
    // Reset all data
    tasks = [];
    rewards = [];
    completedTasks = 0;
    level = 0;
    preDayList.innerHTML = "";
    habitList.innerHTML = "";
    habitInput.value = "";
    rewardInput.value = "";
    taskCountText.textContent = "Tasks added: 0 / 10";
    yourProgress.textContent = "Level: 0";
    levelText.textContent = "Level: 0";
    // Show default avatar
    updateMainAvatar({ avatar_url: null, level: 0 });
    rewardInput.style.display = 'none';
  }

  function showLoginState() {
    loginGoogleBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    // Hide avatar card
    avatarCard.style.display = 'none';
    // Hide habit controls
    habitInput.style.display = 'none';
    addHabitBtn.style.display = 'none';
    startDayBtn.style.display = 'none';
    clearBtn.style.display = 'none';
    taskCountText.style.display = 'none';
    levelText.style.display = 'none';
    rewardInput.style.display = 'none';
  }

  function showHabitSection() {
    loginGoogleBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    // Show avatar card
    avatarCard.style.display = 'flex';
    // Show habit controls
    habitInput.style.display = 'block';
    addHabitBtn.style.display = 'inline-block';
    startDayBtn.style.display = 'inline-block';
    clearBtn.style.display = 'inline-block';
    taskCountText.style.display = 'block';
    levelText.style.display = 'block';
    rewardInput.style.display = 'block';
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
      // Get the current session
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session before logout:', sessionError);
        authMessage.textContent = 'Error checking session before logout.';
        return;
      }

      if (data.session) {
        // Only attempt to sign out if a session exists
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Logout error:', error);
          authMessage.textContent = `Logout error: ${error.message}`;
        } else {
          console.log('User successfully logged out');
          authMessage.textContent = 'Logged out successfully.';
        }
      } else {
        console.warn('No active session to log out.');
        authMessage.textContent = 'No active session to log out.';
      }
    } catch (error) {
      console.error('Logout error:', error);
      authMessage.textContent = `Logout error: ${error.message}`;
    }
  });

  addHabitBtn.addEventListener('click', async () => {
    const habitText = habitInput.value.trim();
    const rewardText = rewardInput.value.trim();
    if (habitText !== "" && tasks.length < 10) {
      tasks.push(habitText);
      rewards.push(rewardText); // Can be empty string
      taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
      habitInput.value = "";
      rewardInput.value = "";
      const taskItem = document.createElement('div');
      taskItem.classList.add('habit-item');
      const label = document.createElement('span');
      label.textContent = habitText;
      // Reward display (optional)
      const rewardLabel = document.createElement('span');
      rewardLabel.style.fontStyle = 'italic';
      rewardLabel.style.color = '#888';
      rewardLabel.style.marginLeft = '10px';
      if (rewardText) rewardLabel.textContent = `🎁 ${rewardText}`;
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
          rewards.splice(index, 1);
        }
        preDayList.removeChild(taskItem);
        taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
        startDayBtn.disabled = tasks.length < 1;
        await saveUserProgress();
      });
      taskItem.appendChild(label);
      if (rewardText) taskItem.appendChild(rewardLabel);
      taskItem.appendChild(removeBtn);
      preDayList.appendChild(taskItem);
      startDayBtn.disabled = tasks.length < 1;
      await saveUserProgress();
    }
  });

  startDayBtn.addEventListener('click', async () => {
    completedTasks = 0;
    level = 0;
    updateLevel();
    habitList.innerHTML = "";
    preDayList.innerHTML = "";
    tasks.forEach((task, idx) => {
      const habitItem = document.createElement('div');
      habitItem.classList.add('habit-item');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      const label = document.createElement('span');
      label.textContent = task;
      // Reward display (optional)
      const rewardLabel = document.createElement('span');
      rewardLabel.style.fontStyle = 'italic';
      rewardLabel.style.color = '#888';
      rewardLabel.style.marginLeft = '10px';
      if (rewards[idx]) rewardLabel.textContent = `🎁 ${rewards[idx]}`;
      checkbox.addEventListener('change', async () => {
        if (checkbox.checked) {
          completedTasks = Math.min(completedTasks + 1, 10);
        } else {
          completedTasks = Math.max(completedTasks - 1, 0);
        }
        updateLevel();
        label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        await saveUserProgress();
      });
      habitItem.appendChild(checkbox);
      habitItem.appendChild(label);
      if (rewards[idx]) habitItem.appendChild(rewardLabel);
      habitList.appendChild(habitItem);
    });
    habitInput.style.display = "none";
    rewardInput.style.display = "none";
    addHabitBtn.style.display = "none";
    startDayBtn.style.display = "none";
    taskCountText.style.display = "none";
    await saveUserProgress();
  });

  clearBtn.addEventListener('click', async () => {
    tasks = [];
    rewards = [];
    completedTasks = 0;
    level = 0;
    preDayList.innerHTML = "";
    habitList.innerHTML = "";
    habitInput.style.display = "block";
    rewardInput.style.display = "block";
    addHabitBtn.style.display = "inline-block";
    startDayBtn.style.display = "inline-block";
    taskCountText.style.display = "block";
    habitInput.value = "";
    rewardInput.value = "";
    taskCountText.textContent = "Tasks added: 0 / 10";
    yourProgress.textContent = "Level: 0";
    levelText.textContent = "Level: 0";
    startDayBtn.disabled = true;
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
    // Update the level avatar live, always pass avatar_url
    updateMainAvatar({ avatar_url: currentUserAvatarUrl, level });
  }

  function loadUserProgress() {
    taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
    updateLevel();
    preDayList.innerHTML = "";
    habitList.innerHTML = "";
    if (tasks.length > 0 && completedTasks === 0) {
      tasks.forEach((task, idx) => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('habit-item');
        const label = document.createElement('span');
        label.textContent = task;
        // Reward display (optional)
        const rewardLabel = document.createElement('span');
        rewardLabel.style.fontStyle = 'italic';
        rewardLabel.style.color = '#888';
        rewardLabel.style.marginLeft = '10px';
        if (rewards[idx]) rewardLabel.textContent = `🎁 ${rewards[idx]}`;
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
            rewards.splice(index, 1);
          }
          preDayList.removeChild(taskItem);
          taskCountText.textContent = `Tasks added: ${tasks.length} / 10`;
          startDayBtn.disabled = tasks.length < 1;
          await saveUserProgress();
        });
        taskItem.appendChild(label);
        if (rewards[idx]) taskItem.appendChild(rewardLabel);
        taskItem.appendChild(removeBtn);
        preDayList.appendChild(taskItem);
      });
      startDayBtn.disabled = tasks.length < 1;
    }
    else if (tasks.length > 0 && completedTasks > 0) {
      let currentCompletedCount = 0;
      tasks.forEach((task, idx) => {
        const habitItem = document.createElement('div');
        habitItem.classList.add('habit-item');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        if (currentCompletedCount < completedTasks) {
          checkbox.checked = true;
          currentCompletedCount++;
        }
        const label = document.createElement('span');
        label.textContent = task;
        label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        // Reward display (optional)
        const rewardLabel = document.createElement('span');
        rewardLabel.style.fontStyle = 'italic';
        rewardLabel.style.color = '#888';
        rewardLabel.style.marginLeft = '10px';
        if (rewards[idx]) rewardLabel.textContent = `🎁 ${rewards[idx]}`;
        checkbox.addEventListener('change', async () => {
          if (checkbox.checked) {
            completedTasks = Math.min(completedTasks + 1, 10);
          } else {
            completedTasks = Math.max(completedTasks - 1, 0);
          }
          updateLevel();
          label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
          await saveUserProgress();
        });
        habitItem.appendChild(checkbox);
        habitItem.appendChild(label);
        if (rewards[idx]) habitItem.appendChild(rewardLabel);
        habitList.appendChild(habitItem);
      });
      if (completedTasks > 0 || tasks.length >= 1) {
        habitInput.style.display = "none";
        rewardInput.style.display = "none";
        addHabitBtn.style.display = "none";
        startDayBtn.style.display = "none";
        taskCountText.style.display = "none";
      }
    }
  }

  async function saveUserProgress() {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          tasks: tasks,
          rewards: rewards,
          completed_tasks: completedTasks,
          level: level,
        })
        .eq('id', currentUser.id);
      if (error) {
        console.error('Error saving progress:', error);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }
});