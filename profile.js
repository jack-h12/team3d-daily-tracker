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
  const profileSection = document.getElementById('profile-section');
  
  // Profile form elements
  const displayNameInput = document.getElementById('display-name');
  const emailDisplay = document.getElementById('email-display');
  const createdDate = document.getElementById('created-date');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const resetProfileBtn = document.getElementById('reset-profile-btn');
  
  // Avatar elements
  const avatarImg = document.getElementById('avatar-img');
  const avatarPlaceholder = document.getElementById('avatar-placeholder');
  const avatarUpload = document.getElementById('avatar-upload');
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  
  // Stats elements
  const statLevel = document.getElementById('stat-level');
  const statCompleted = document.getElementById('stat-completed');
  const statActive = document.getElementById('stat-active');
  const statMemberSince = document.getElementById('stat-member-since');
  
  // Danger zone
  const resetProgressBtn = document.getElementById('reset-progress-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');

  let currentUser = null;
  let originalUserData = {};

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
    
    await loadUserProfile();
    showProfileSection();
  }

  function handleUserLogout() {
    currentUser = null;
    authMessage.textContent = '';
    showLoginState();
    clearProfileForm();
  }

  function showLoginState() {
    loginGoogleBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    profileSection.style.display = 'none';
  }

  function showProfileSection() {
    loginGoogleBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    profileSection.style.display = 'block';
  }

  function clearProfileForm() {
    displayNameInput.value = '';
    emailDisplay.value = '';
    createdDate.textContent = '-';
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'block';
    removeAvatarBtn.style.display = 'none';
    
    // Clear stats
    statLevel.textContent = '0';
    statCompleted.textContent = '0';
    statActive.textContent = '0';
    statMemberSince.textContent = '-';
  }

  async function loadUserProfile() {
    if (!currentUser) return;

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        authMessage.textContent = 'Error loading profile data';
        return;
      }

      originalUserData = { ...userData };
      
      // Fill form
      displayNameInput.value = userData.name || '';
      emailDisplay.value = userData.email || '';
      
      // Format creation date
      if (userData.created_at) {
        const date = new Date(userData.created_at);
        createdDate.textContent = date.toLocaleDateString();
        statMemberSince.textContent = date.toLocaleDateString();
      }
      
      // Load avatar
      if (userData.avatar_url) {
        avatarImg.src = userData.avatar_url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        removeAvatarBtn.style.display = 'inline-block';
      }
      
      // Load stats
      statLevel.textContent = userData.level || 0;
      statCompleted.textContent = userData.completed_tasks || 0;
      statActive.textContent = userData.tasks ? userData.tasks.length : 0;

    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  // Event listeners
  loginGoogleBtn.addEventListener('click', async () => {
    try {
      authMessage.textContent = 'Signing in...';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/profile.html'
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

  changeAvatarBtn.addEventListener('click', () => {
    avatarUpload.click();
  });

  avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // For now, convert to base64 and store in database
    // In production, you'd upload to Supabase Storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      avatarImg.src = base64;
      avatarImg.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
      removeAvatarBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  });

  removeAvatarBtn.addEventListener('click', () => {
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'block';
    removeAvatarBtn.style.display = 'none';
    avatarImg.src = '';
    avatarUpload.value = '';
  });

  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    const name = displayNameInput.value.trim();
    if (!name) {
      alert('Display name is required');
      return;
    }

    saveProfileBtn.textContent = '💾 Saving...';
    saveProfileBtn.disabled = true;

    try {
      const updateData = {
        name: name,
        avatar_url: avatarImg.style.display === 'block' ? avatarImg.src : null
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
      } else {
        originalUserData = { ...originalUserData, ...updateData };
        authMessage.textContent = 'Profile saved successfully!';
        setTimeout(() => {
          authMessage.textContent = `Welcome, ${currentUser.email}!`;
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }

    saveProfileBtn.textContent = '💾 Save Changes';
    saveProfileBtn.disabled = false;
  });

  resetProfileBtn.addEventListener('click', () => {
    displayNameInput.value = originalUserData.name || '';
    
    if (originalUserData.avatar_url) {
      avatarImg.src = originalUserData.avatar_url;
      avatarImg.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
      removeAvatarBtn.style.display = 'inline-block';
    } else {
      avatarImg.style.display = 'none';
      avatarPlaceholder.style.display = 'block';
      removeAvatarBtn.style.display = 'none';
    }
  });

  resetProgressBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset all your progress? This action cannot be undone.')) {
      return;
    }

    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          level: 0,
          completed_tasks: 0,
          tasks: []
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error resetting progress:', error);
        alert('Error resetting progress. Please try again.');
      } else {
        alert('Progress reset successfully!');
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('Error resetting progress. Please try again.');
    }
  });

  deleteAccountBtn.addEventListener('click', async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      return;
    }

    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error deleting account:', error);
        alert('Error deleting account. Please try again.');
      } else {
        alert('Account deleted successfully.');
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    }
  });
});