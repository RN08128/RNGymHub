window.API_URL = window.API_URL || 'http://localhost:3333';
var API_URL = window.API_URL;

let chartInstance = null;

async function init() {
  await fetchExercisesForSelect();
  await fetchHistoryLogs();
}

async function fetchExercisesForSelect() {
  try {
    const res = await fetch(`${API_URL}/exercises`);
    const exercises = await res.json();

    const select = document.getElementById('select-exercise');
    if (!exercises || exercises.length === 0) {
      select.innerHTML = '<option value="">Nenhum exercício cadastrado</option>';
      return;
    }

    select.innerHTML = exercises.map(ex => 
      `<option value="${ex.id}">${ex.name}</option>`
    ).join('');

    loadExerciseAnalytics();
  } catch (err) {
    console.error('Erro ao buscar exercícios no histórico:', err);
  }
}

async function loadExerciseAnalytics() {
  const select = document.getElementById('select-exercise');
  const exerciseId = select.value;
  if (!exerciseId) return;

  try {
    const res = await fetch(`${API_URL}/analytics/exercise/${exerciseId}`);
    const data = await res.json();

    const labels = data.map(d => d.date);
    const weights = data.map(d => d.max_weight);

    renderChart(labels, weights);
  } catch (err) {
    console.error('Erro ao carregar analytics:', err);
  }
}

function renderChart(labels, weights) {
  const canvas = document.getElementById('evolutionChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Sem registros'],
      datasets: [{
        label: 'Carga Máxima (kg)',
        data: weights.length > 0 ? weights : [0],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { grid: { color: '#262626' }, ticks: { color: '#888' } },
        x: { grid: { color: '#262626' }, ticks: { color: '#888' } }
      },
      plugins: {
        legend: { labels: { color: '#fff' } }
      }
    }
  });
}

async function fetchHistoryLogs() {
  try {
    const res = await fetch(`${API_URL}/history`);
    const sessions = await res.json();

    const container = document.getElementById('history-list');
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum treino concluído ainda.</p>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const dateFormatted = new Date(s.start_time).toLocaleDateString('pt-BR');
      return `
        <div class="history-card">
          <div>
            <div class="history-title">${s.workout_name}</div>
            <div class="history-meta">${dateFormatted} • ${s.total_sets} séries concluídas</div>
          </div>
          ${s.pr_count > 0 ? `<div class="pr-count">★ ${s.pr_count} PR(s)</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  }
}

init();