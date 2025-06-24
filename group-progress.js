import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vpqmpfqlcftmifrumvgb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcW1wZnFsY2Z0bWlmcnVtdmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjA3NTAsImV4cCI6MjA2NjE5Njc1MH0.Tr-Kv0LhmfqkqIoNPmJ1W5J-xY7yX_sdKZ_8waFHFWg'
);

window.addEventListener('DOMContentLoaded', async () => {
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

  // Get DOM elements
  const loginGoogleBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authMessage = document.getElementById('auth-message');
  const leaderboard = document.getElementById('leaderboard');
  const refreshLeaderboardBtn = document.getElementById('refresh-leaderboard');
  const totalMembersEl = document.getElementById('total-members');
  const averageLevelEl = document.getElementById('average-level');
  const totalCompletedEl = document.getElementById('total-completed');
  const groupProgressEl = document.getElementById('group-progress');
  const loadingOverlay = document.getElementById('loading-overlay');

  let currentUser = null;
  let currentUserIsAdmin = false;

  function showLoading() {
    loadingOverlay.classList.remove('hidden');
  }
  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  // Show loading initially
  showLoading();

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
      hideLoading(); // Only hide loading if not logged in
    }
  } catch (error) {
    console.error('Error during initial auth check:', error);
    authMessage.textContent = 'Error checking authentication status';
    hideLoading();
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    showLoading();
    try {
      if (event === 'SIGNED_IN' && session) {
        await handleUserLogin(session.user);
      } else if (event === 'SIGNED_OUT') {
        handleUserLogout();
      }
    } finally {
      hideLoading();
    }
  });

  async function handleUserLogin(user) {
    showLoading();
    try {
      currentUser = user;
      // Fetch user data to get the name and admin status
      let displayName = user.email;
      let isAdmin = false;
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('name, is_admin')
          .eq('id', user.id)
          .single();
        if (existingUser && !fetchError) {
          displayName = existingUser.name || user.email;
          isAdmin = !!existingUser.is_admin;
        }
      } catch (error) {
        // fallback to email
      }
      currentUserIsAdmin = isAdmin;
      authMessage.textContent = `Welcome, ${displayName}!`;
      showGroupSection();
      await loadCommunityProgress();
    } finally {
      hideLoading();
    }
  }

  function handleUserLogout() {
    currentUser = null;
    authMessage.textContent = '';
    showLoginState();
    leaderboard.innerHTML = '';
    totalMembersEl.textContent = '0';
    averageLevelEl.textContent = '0';
    totalCompletedEl.textContent = '0';
    groupProgressEl.textContent = 'Please log in';
  }

  function showLoginState() {
    loginGoogleBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    const groupStats = document.getElementById('group-stats');
    const leaderboardSection = document.getElementById('leaderboard-section');
    if (groupStats) groupStats.style.display = 'none';
    if (leaderboardSection) leaderboardSection.style.display = 'none';
    leaderboard.innerHTML = '';
  }

  function showGroupSection() {
    loginGoogleBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    document.getElementById('group-stats').style.display = 'grid';
    document.getElementById('leaderboard-section').style.display = 'block';
  }

  // Google login event listener
  loginGoogleBtn.addEventListener('click', async () => {
    showLoading();
    try {
      authMessage.textContent = 'Signing in...';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/group-progress.html'
        }
      });
      if (error) {
        console.error('OAuth login error:', error);
        authMessage.textContent = `Login error: ${error.message}`;
      }
    } catch (error) {
      console.error('Login error:', error);
      authMessage.textContent = 'Login failed. Please try again.';
    } finally {
      hideLoading();
    }
  });

  // Logout event listener
  logoutBtn.addEventListener('click', async () => {
    showLoading();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        authMessage.textContent = `Logout error: ${error.message}`;
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      hideLoading();
    }
  });

  // Refresh leaderboard
  refreshLeaderboardBtn.addEventListener('click', async () => {
    showLoading();
    refreshLeaderboardBtn.textContent = '🔄 Refreshing...';
    try {
      await loadCommunityProgress();
    } finally {
      refreshLeaderboardBtn.textContent = '🔄 Refresh';
      hideLoading();
    }
  });

  async function loadCommunityProgress() {
    if (!currentUser) return;
    showLoading();
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('name, level, completed_tasks, tasks, email, avatar_url, id, is_admin')
        .order('level', { ascending: false });
      if (error) {
        console.error('Error fetching community progress:', error);
        return;
      }
      displayStats(users);
      displayLeaderboard(users);
    } catch (error) {
      console.error('Error loading community progress:', error);
    } finally {
      hideLoading();
    }
  }

  function displayStats(users) {
    const totalMembers = users.length;
    const totalCompleted = users.reduce((sum, user) => sum + (user.completed_tasks || 0), 0);
    const averageLevel = totalMembers > 0 ? (users.reduce((sum, user) => sum + (user.level || 0), 0) / totalMembers).toFixed(1) : 0;
    
    totalMembersEl.textContent = totalMembers;
    averageLevelEl.textContent = averageLevel;
    totalCompletedEl.textContent = totalCompleted;
    groupProgressEl.textContent = `${totalMembers} members, avg level ${averageLevel}`;
  }

  function getUserAvatar(user) {
    // Treat empty string or null as missing
    const avatarUrl = user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : null;
    if (avatarUrl) {
      return { type: 'img', src: avatarUrl };
    } else if (user.level !== undefined && levelAvatars[user.level]) {
      return { type: 'img', src: levelAvatars[user.level] };
    } else {
      return { type: 'default' };
    }
  }

  // Add modal HTML to the page if not present
  let userTasksModal = document.getElementById('user-tasks-modal');
  if (!userTasksModal) {
    userTasksModal = document.createElement('div');
    userTasksModal.id = 'user-tasks-modal';
    userTasksModal.style.display = 'none'; // Ensure hidden by default
    userTasksModal.style.position = 'fixed';
    userTasksModal.style.top = '0';
    userTasksModal.style.left = '0';
    userTasksModal.style.width = '100vw';
    userTasksModal.style.height = '100vh';
    userTasksModal.style.background = 'rgba(0,0,0,0.7)';
    userTasksModal.style.zIndex = '3000';
    userTasksModal.style.justifyContent = 'center';
    userTasksModal.style.alignItems = 'center';
    userTasksModal.style.display = 'none'; // Only flex when shown
    userTasksModal.innerHTML = `
      <div id="user-tasks-modal-content" style="background:#fff;padding:32px 24px 24px 24px;border-radius:16px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.25);position:relative;text-align:center;">
        <button id="close-user-tasks-modal" style="position:absolute;top:12px;right:12px;font-size:1.5rem;background:none;border:none;cursor:pointer;color:#f54242;">&times;</button>
        <h2 id="user-tasks-modal-title" style="margin-bottom:18px;font-size:1.3rem;color:#f54242;"></h2>
        <ul id="user-tasks-modal-list" style="list-style:none;padding:0;margin:0 0 10px 0;"></ul>
      </div>
    `;
    document.body.appendChild(userTasksModal);
    document.getElementById('close-user-tasks-modal').onclick = () => {
      userTasksModal.style.display = 'none';
    };
    userTasksModal.onclick = (e) => {
      if (e.target === userTasksModal) userTasksModal.style.display = 'none';
    };
  }

  function showUserTasksModal(user) {
    const modal = document.getElementById('user-tasks-modal');
    const title = document.getElementById('user-tasks-modal-title');
    const list = document.getElementById('user-tasks-modal-list');
    title.textContent = `${user.name || user.email || 'User'}'s Daily Tasks`;
    list.innerHTML = '';
    if (user.tasks && user.tasks.length > 0) {
      // Show completed vs incomplete tasks
      const completedCount = user.completed_tasks || 0;
      user.tasks.forEach((task, idx) => {
        const li = document.createElement('li');
        li.style.textAlign = 'left';
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid #eee';
        if (idx < completedCount) {
          li.innerHTML = `✅ <span style="text-decoration:line-through;opacity:0.7;">${task}</span>`;
        } else {
          li.innerHTML = `⬜ <span>${task}</span>`;
        }
        list.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No tasks found.';
      list.appendChild(li);
    }
    modal.style.display = 'flex';
  }

  async function toggleAdmin(userId, makeAdmin) {
    showLoading();
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: makeAdmin })
        .eq('id', userId);
      if (error) {
        alert('Failed to update admin status.');
      } else {
        await loadCommunityProgress();
      }
    } finally {
      hideLoading();
    }
  }

  function displayLeaderboard(users) {
    if (!currentUser) {
      leaderboard.innerHTML = '';
      return;
    }
    leaderboard.innerHTML = '';
    if (users.length === 0) {
      leaderboard.innerHTML = '<p>No users found.</p>';
      return;
    }
    users.forEach((user, index) => {
      const userCard = document.createElement('div');
      userCard.className = 'user-card';
      // Add special styling for current user
      const isCurrentUser = currentUser && user.email === currentUser.email;
      if (isCurrentUser) {
        userCard.classList.add('current-user');
      }
      const rank = index + 1;
      const rankEmoji = getRankEmoji(rank);
      const levelEmoji = getLevelEmoji(user.level || 0);
      const avatar = getUserAvatar(user);
      let avatarHTML = '';
      if (avatar.type === 'img') {
        avatarHTML = `<img src="${avatar.src}" alt="Avatar" class="profile-avatar" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:2px solid #f54242;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-right:10px;" onerror="this.style.display='none';">`;
      } else {
        avatarHTML = `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:2.2rem;background:#fff;border-radius:50%;border:2px solid #f54242;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-right:10px;">👤</div>`;
      }
      // Level avatar (always shown)
      const userLevel = user.level !== undefined ? user.level : 0;
      const levelAvatarSrc = levelAvatars[userLevel] || levelAvatars[0];
      const levelAvatarHTML = `<img src="${levelAvatarSrc}" alt="Level Avatar" class="level-avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #f54242;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);vertical-align:middle;" title="Level Avatar">`;
      let adminBadge = '';
      if (user.is_admin) {
        adminBadge = `<span style="background:#28a745;color:#fff;padding:2px 10px;border-radius:8px;font-size:0.9rem;margin-left:8px;vertical-align:middle;">Admin</span>`;
      }
      let adminButton = '';
      let removeUserButton = '';
      let resetProgressButton = '';
      let emailInfo = '';
      if (currentUserIsAdmin && !isCurrentUser) {
        if (user.is_admin) {
          adminButton = `<button class="toggle-admin-btn" data-user-id="${user.id}" data-make-admin="false" style="margin-top:8px;background:#f54242;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Remove Admin</button>`;
        } else {
          adminButton = `<button class="toggle-admin-btn" data-user-id="${user.id}" data-make-admin="true" style="margin-top:8px;background:#28a745;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Make Admin</button>`;
        }
        removeUserButton = `<button class="remove-user-btn" data-user-id="${user.id}" style="margin-top:8px;background:#222;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Remove User</button>`;
        resetProgressButton = `<button class="reset-progress-btn" data-user-id="${user.id}" style="margin-top:8px;background:#f5a142;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Reset Progress</button>`;
        emailInfo = `<p style="font-size:0.95rem;color:#888;margin:2px 0 0 0;">${user.email}</p>`;
      }
      userCard.innerHTML = `
        <div class="user-rank">
          <span class="rank-number">${rankEmoji} #${rank}</span>
        </div>
        <div class="user-info" style="display:flex;align-items:center;gap:8px;">
          ${avatarHTML}
          ${levelAvatarHTML}
          <div style="display:flex;flex-direction:column;align-items:flex-start;">
            <h3>${user.name || 'Anonymous'} ${isCurrentUser ? '(You)' : ''} ${adminBadge}</h3>
            ${emailInfo}
            <p>Level: ${user.level || 0} ${levelEmoji}</p>
            <p>Tasks Completed: ${user.completed_tasks || 0}/10</p>
            <p>Total Tasks: ${user.tasks ? user.tasks.length : 0}</p>
            ${adminButton}
            ${resetProgressButton}
            ${removeUserButton}
          </div>
        </div>
        <div class="user-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${((user.level || 0) / 10) * 100}%"></div>
          </div>
        </div>
      `;
      // Add click event to show tasks modal
      userCard.style.cursor = 'pointer';
      userCard.onclick = (e) => {
        // Prevent modal if admin button is clicked
        if (e.target.classList.contains('toggle-admin-btn')) return;
        showUserTasksModal(user);
      };
      // Add event for admin button
      if (adminButton) {
        userCard.querySelector('.toggle-admin-btn').onclick = (e) => {
          e.stopPropagation();
          const userId = e.target.getAttribute('data-user-id');
          const makeAdmin = e.target.getAttribute('data-make-admin') === 'true';
          toggleAdmin(userId, makeAdmin);
        };
      }
      // Add event for remove user button
      if (removeUserButton) {
        userCard.querySelector('.remove-user-btn').onclick = async (e) => {
          e.stopPropagation();
          const userId = e.target.getAttribute('data-user-id');
          if (confirm('Are you sure you want to remove this user? This cannot be undone.')) {
            showLoading();
            try {
              const { error } = await supabase.from('users').delete().eq('id', userId);
              if (error) {
                alert('Failed to remove user.');
              } else {
                await loadCommunityProgress();
              }
            } finally {
              hideLoading();
            }
          }
        };
      }
      // Add event for reset progress button
      if (resetProgressButton) {
        userCard.querySelector('.reset-progress-btn').onclick = async (e) => {
          e.stopPropagation();
          const userId = e.target.getAttribute('data-user-id');
          if (confirm('Reset this user\'s progress (tasks, completed tasks, level, and rewards) to zero?')) {
            showLoading();
            try {
              const { error } = await supabase.from('users').update({ tasks: [], rewards: [], completed_tasks: 0, level: 0 }).eq('id', userId);
              if (error) {
                alert('Failed to reset user progress.');
              } else {
                await loadCommunityProgress();
              }
            } finally {
              hideLoading();
            }
          }
        };
      }
      leaderboard.appendChild(userCard);
    });
  }

  function getRankEmoji(rank) {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  }

  function getLevelEmoji(level) {
    if (level === 10) return '🔥🦍';
    if (level >= 8) return '💪';
    if (level >= 6) return '👍';
    if (level >= 4) return '📈';
    if (level >= 2) return '🌱';
    return '⭐';
  }

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    if (currentUser) {
      await loadCommunityProgress();
    }
  }, 30000);
});