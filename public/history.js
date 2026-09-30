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

// Função disparada ao clicar em um card de treino no histórico
async function toggleSessionDetails(sessionId) {
  const detailsContainer = document.getElementById(`details-${sessionId}`);
  if (!detailsContainer) return;

  // Se já estiver visível, esconde (toggle)
  if (detailsContainer.style.display === 'block') {
    detailsContainer.style.display = 'none';
    return;
  }

  detailsContainer.style.display = 'block';

  // Evita fazer requisições repetidas se já carregou os dados dessa sessão
  if (detailsContainer.dataset.loaded === 'true') return;

  detailsContainer.innerHTML = '<p style="color: #a1a1aa; font-size: 12px;">Carregando séries...</p>';

  try {
    const res = await fetch(`${API_URL}/history/session/${sessionId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      detailsContainer.innerHTML = '<p style="color: #ef4444; font-size: 12px;">Erro ao carregar detalhes.</p>';
      return;
    }

    const sets = await res.json();
    detailsContainer.dataset.loaded = 'true';

    if (!sets || sets.length === 0) {
      detailsContainer.innerHTML = '<p style="color: #a1a1aa; font-size: 12px;">Nenhuma série registrada.</p>';
      return;
    }

    // Agrupa as séries por exercício
    const grouped = {};
    sets.forEach(set => {
      const exName = set.exercise_name || 'Exercício';
      if (!grouped[exName]) grouped[exName] = [];
      grouped[exName].push(set);
    });

    // Renderiza o detalhamento com as tags de PR
    detailsContainer.innerHTML = Object.entries(grouped).map(([exName, exerciseSets]) => `
      <div style="margin-bottom: 10px;">
        <strong style="color: #38bdf8; font-size: 13px; display: block; margin-bottom: 4px;">${exName}</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${exerciseSets.map(set => {
            const isPR = set.is_pr_weight || set.is_pr_volume;
            const bg = isPR ? 'rgba(234, 179, 8, 0.15)' : '#09090b';
            const border = isPR ? '#eab308' : '#3f3f46';
            const prTag = set.is_pr_weight ? ' 🏆 PR' : (set.is_pr_volume ? ' ⚡ PR Vol' : '');

            return `
              <span style="background: ${bg}; border: 1px solid${border}; color: #fff; font-size: 12px; padding: 4px 8px; border-radius: 4px;">
                Série ${set.set_number}: <strong>${set.weight}kg</strong> x ${set.reps}${prTag}
              </span>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Erro ao buscar detalhes da sessão:', err);
    detailsContainer.innerHTML = '<p style="color: #ef4444; font-size: 12px;">Erro de conexão com o servidor.</p>';
  }
}

// Inicializa no carregamento do DOM
document.addEventListener('DOMContentLoaded', init);