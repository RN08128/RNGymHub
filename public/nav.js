// nav.js - Destaca automaticamente o link da página atual com base no URL
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  if (currentPath.includes('workouts.html') || currentPath === '') {
    const navWorkouts = document.getElementById('nav-workouts');
    if (navWorkouts) navWorkouts.classList.add('active');
  } else if (currentPath.includes('history.html')) {
    const navHistory = document.getElementById('nav-history');
    if (navHistory) navHistory.classList.add('active');
  } else if (currentPath.includes('tdee.html')) {
    const navTdee = document.getElementById('nav-tdee');
    if (navTdee) navTdee.classList.add('active');
  } else if (currentPath.includes('create-workout.html')) {
    const navCreate = document.getElementById('nav-create');
    if (navCreate) navCreate.classList.add('active');
  }
});