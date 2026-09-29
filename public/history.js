var API_URL = 'http://localhost:3000';

let chartInstance = null;

// Função auxiliar para capturar o Token salvo no localStorage
function getAuthToken() {
  return localStorage.getItem('@RNGymHub:token') || localStorage.getItem('token') || '';
}

async function init() {
  await fetchExercisesForSelect();
  await fetchHistoryLogs();
  
  // Adiciona o listener para atualizar o gráfico quando trocar o exercício selecionado
  const select = document.getElementById('select-exercise');
  if (select) {
    select.addEventListener('change', loadExerciseAnalytics);
  }
}

async function fetchExercisesForSelect() {
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error('Erro ao buscar exercícios:', res.statusText);
      return;
    }

    const exercises = await res.json();
    const select = document.getElementById('select-exercise');
    
    if (!select) return;

    if (!exercises || exercises.length === 0) {
      select.innerHTML = '<option value="">Nenhum exercício cadastrado</option>';
      return;
    }

    select.innerHTML = exercises.map(ex => 
      `<option value="${ex.id}">${ex.name}</option>`
    ).join('');

    // Carrega o gráfico do primeiro exercício por padrão
    loadExerciseAnalytics();
  } catch (err) {
    console.error('Erro ao buscar exercícios no histórico:', err);
  }
}

async function loadExerciseAnalytics() {
  const select = document.getElementById('select-exercise');
  if (!select) return;

  const exerciseId = select.value;
  if (!exerciseId) return;

  try {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/analytics/exercise/${exerciseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      renderChart([], []);
      return;
    }

    const data = await res.json();

    const labels = data.map(d => d.date);
    const weights = data.map(d => parseFloat(d.max_weight) || 0);

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
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const container = document.getElementById('history-list');
    if (!container) return;

    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Erro ao carregar histórico.</p>';
      return;
    }

    const sessions = await res.json();

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum treino concluído ainda.</p>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const dateFormatted = s.start_time 
        ? new Date(s.start_time).toLocaleDateString('pt-BR') 
        : 'Data Indefinida';

      const prCount = parseInt(s.pr_count, 10) || 0;

      return `
        <div class="history-card">
          <div>
            <div class="history-title">${s.workout_name || 'Treino'}</div>
            <div class="history-meta">${dateFormatted} • ${s.total_sets || 0} séries concluídas</div>
          </div>
          ${prCount > 0 ? `<div class="pr-count">★ ${prCount} PR(s)</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  }
}

// Inicializa no carregamento do DOM
document.addEventListener('DOMContentLoaded', init);