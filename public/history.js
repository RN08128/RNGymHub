var API_URL = 'http://localhost:3000' || 'https://proportion-defendant-coalition-innovative.trycloudflare.com';

let chartInstance = null;

function getAuthToken() {
  return localStorage.getItem('@RNGymHub:token') || localStorage.getItem('token') || '';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
}

async function init() {
  await fetchExercisesForSelect();
  await fetchHistoryLogs();
  
  const select = document.getElementById('select-exercise');
  if (select) {
    select.addEventListener('change', loadExerciseAnalytics);
  }
}

async function fetchExercisesForSelect() {
  try {
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!res.ok) return;

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

    loadExerciseAnalytics();
  } catch (err) {
    console.error('Erro ao buscar exercícios:', err);
  }
}

async function loadExerciseAnalytics() {
  const select = document.getElementById('select-exercise');
  if (!select) return;

  const exerciseId = select.value;
  if (!exerciseId) return;

  try {
    const res = await fetch(`${API_URL}/analytics/exercise/${exerciseId}`, {
      method: 'GET',
      headers: getAuthHeaders()
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
    const res = await fetch(`${API_URL}/history`, {
      method: 'GET',
      headers: getAuthHeaders()
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
  // Captura o ID correto independente do nome retornado pela rota /history
  const sessionId = s.id || s.session_id || s.workout_log_id;
  
  const dateFormatted = s.start_time || s.started_at
    ? new Date(s.start_time || s.started_at).toLocaleDateString('pt-BR') 
    : 'Data Indefinida';

  const prCount = parseInt(s.pr_count, 10) || 0;

  return `
    <div class="history-card" onclick="openSessionModal('${sessionId}')">
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

/* Modal e Carregamento de Detalhes da Sessão */
async function openSessionModal(sessionId) {
  // Previne chamadas caso o ID seja nulo ou string "undefined"
  if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
    console.error('ID da sessão inválido recebido:', sessionId);
    return;
  }

  const modal = document.getElementById('session-modal');
  const container = document.getElementById('modal-exercises-container');
  
  if (!modal || !container) return;

  modal.classList.add('active');
  container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">Carregando detalhes do treino...</p>';

  try {
    const res = await fetch(`${API_URL}/history/session/${sessionId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      container.innerHTML = '<p style="color: #ef4444; font-size: 0.85rem; text-align: center;">Erro ao carregar detalhes do treino.</p>';
      return;
    }

    const { session, sets } = await res.json();

    // Preenche cabeçalho
    document.getElementById('modal-workout-title').innerText = session.workout_name || 'Treino Concluído';
    document.getElementById('modal-workout-date').innerText = session.started_at 
      ? new Date(session.started_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    // Preenche estatísticas
    const duration = session.duration_minutes ? `${session.duration_minutes} min` : '--';
    const startTime = session.started_at ? new Date(session.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const endTime = session.ended_at ? new Date(session.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    document.getElementById('modal-stat-duration').innerText = duration;
    document.getElementById('modal-stat-time').innerText = `${startTime} - ${endTime}`;
    document.getElementById('modal-stat-volume').innerText = `${(session.total_volume || 0).toLocaleString('pt-BR')} kg`;
    document.getElementById('modal-stat-prs').innerText = `${session.pr_count || 0} PR(s)`;

    // Agrupa séries por exercício
    const grouped = {};
    (sets || []).forEach(set => {
      const exName = set.exercise_name || 'Exercício';
      if (!grouped[exName]) grouped[exName] = [];
      grouped[exName].push(set);
    });

    if (Object.keys(grouped).length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhuma série registrada nesta sessão.</p>';
      return;
    }

    // Renderiza blocos de exercício
    container.innerHTML = Object.entries(grouped).map(([exName, exerciseSets]) => `
      <div class="exercise-block">
        <div class="exercise-block-title">${exName}</div>
        <div class="sets-grid">
          ${exerciseSets.map(set => {
            const isPR = set.is_pr_weight || set.is_pr_volume;
            const prBadge = set.is_pr_weight ? ' 🏆 PR' : (set.is_pr_volume ? ' ⚡ Vol' : '');

            return `
              <div class="set-chip ${isPR ? 'pr-badge' : ''}">
                <div class="set-chip-title">Série ${set.set_number}</div>
                <div class="set-chip-detail">
                  ${set.weight}kg <span style="color: #71717a; font-size: 0.75rem;">x${set.reps}</span>${prBadge ? `<span class="pr-tag">${prBadge}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Erro ao buscar detalhes da sessão:', err);
    container.innerHTML = '<p style="color: #ef4444; font-size: 0.85rem; text-align: center;">Erro de conexão com o servidor.</p>';
  }
}

function closeSessionModal(event) {
  if (event.target.id === 'session-modal') {
    closeSessionModalForce();
  }
}

function closeSessionModalForce() {
  const modal = document.getElementById('session-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', init);