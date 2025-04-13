document.addEventListener("DOMContentLoaded", () => {
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  profileBtn.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  window.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.add('hidden');
    }
  });
});
