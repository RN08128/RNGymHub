// nav.js - Destaca automaticamente o link da página atual com base no URL
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  if (currentPath.includes('history.html')) {
    document.getElementById('nav-history')?.classList.add('active');
  } else if (currentPath.includes('create-workout.html')) {
    document.getElementById('nav-create')?.classList.add('active');
  } else {
    // Padrão (workouts.html, index.html ou raiz)
    document.getElementById('nav-workouts')?.classList.add('active');
  }
});