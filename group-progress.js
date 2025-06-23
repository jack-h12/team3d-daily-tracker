import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vpqmpfqlcftmifrumvgb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcW1wZnFsY2Z0bWlmcnVtdmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjA3NTAsImV4cCI6MjA2NjE5Njc1MH0.Tr-Kv0LhmfqkqIoNPmJ1W5J-xY7yX_sdKZ_8waFHFWg'
);

window.addEventListener('DOMContentLoaded', async () => {
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

  let currentUser = null;

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

  async function handleUserLogin(user) {
    currentUser = user;
    console.log("Logged in as:", user.email);
    authMessage.textContent = `Welcome, ${user.email}!`;
    showGroupSection();
    await loadCommunityProgress();
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
    document.getElementById('group-stats').style.display = 'none';
    document.getElementById('leaderboard-section').style.display = 'none';
  }

  function showGroupSection() {
    loginGoogleBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    document.getElementById('group-stats').style.display = 'grid';
    document.getElementById('leaderboard-section').style.display = 'block';
  }

  // Google login event listener
  loginGoogleBtn.addEventListener('click', async () => {
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

  // Refresh leaderboard
  refreshLeaderboardBtn.addEventListener('click', async () => {
    refreshLeaderboardBtn.textContent = '🔄 Refreshing...';
    await loadCommunityProgress();
    refreshLeaderboardBtn.textContent = '🔄 Refresh';
  });

  async function loadCommunityProgress() {
    if (!currentUser) return;
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('name, level, completed_tasks, tasks, email')
        .order('level', { ascending: false });
      
      if (error) {
        console.error('Error fetching community progress:', error);
        return;
      }
      
      displayStats(users);
      displayLeaderboard(users);
    } catch (error) {
      console.error('Error loading community progress:', error);
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

  function displayLeaderboard(users) {
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
      
      userCard.innerHTML = `
        <div class="user-rank">
          <span class="rank-number">${rankEmoji} #${rank}</span>
        </div>
        <div class="user-info">
          <h3>${user.name || 'Anonymous'} ${isCurrentUser ? '(You)' : ''}</h3>
          <p>Level: ${user.level || 0} ${levelEmoji}</p>
          <p>Tasks Completed: ${user.completed_tasks || 0}/10</p>
          <p>Total Tasks: ${user.tasks ? user.tasks.length : 0}</p>
        </div>
        <div class="user-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${((user.level || 0) / 10) * 100}%"></div>
          </div>
        </div>
      `;
      
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