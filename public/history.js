var API_URL = 'http://localhost:3000'
  || 'https://proportion-defendant-coalition-innovative.trycloudflare.com';

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

    // Formata datas para o gráfico
    const labels = data.map(d => {
      const rawDate = d.date || d.started_at || d.start_time;
      if (!rawDate) return '';
      const dateObj = new Date(rawDate);
      return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

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

/* LISTAGEM DO HISTÓRICO DE SESSÕES */
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
      // Pega o ID de qualquer uma das chaves enviadas pela API
      const sessionId = s.session_id || s.id || s.workout_log_id;
      const clickAttribute = (sessionId && sessionId !== 'undefined') ? `onclick="openSessionModal('${sessionId}')"` : '';

      // Mapeia data de início
      const rawDate = s.start_time || s.started_at;
      const dateFormatted = rawDate
        ? new Date(rawDate).toLocaleDateString('pt-BR')
        : 'Data Indefinida';

      // Mapeia total de séries (aceita total_sets ou total_completed_sets)
      const totalSets = s.total_sets || s.total_completed_sets || 0;
      const prCount = Number(s.pr_count) || 0;

      return `
        <div class="history-card" ${clickAttribute}>
          <div>
            <div class="history-title">${s.workout_name || 'Treino Concluído'}</div>
            <div class="history-meta">${dateFormatted} • ${totalSets} séries concluídas</div>
          </div>
          ${prCount > 0 ? `<div class="pr-count">★ ${prCount} PR(s)</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  }
}

/* MODAL DE DETALHES DA SESSÃO */
async function openSessionModal(sessionId) {
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

    const data = await res.json();
    const sessionData = data.session || data || {};
    const setsData = data.sets || data.logs || [];

    // Preenche cabeçalho do modal
    const workoutTitle = sessionData.workout_name || sessionData.name || 'Treino Concluído';
    const startDate = sessionData.start_time || sessionData.started_at;
    const endDate = sessionData.end_time || sessionData.ended_at;

    document.getElementById('modal-workout-title').innerText = workoutTitle;
    document.getElementById('modal-workout-date').innerText = startDate
      ? new Date(startDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    // Preenche estatísticas do modal
    const duration = sessionData.duration_minutes ? `${sessionData.duration_minutes} min` : '--';
    const startTime = startDate ? new Date(startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const endTime = endDate ? new Date(endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const totalVolume = Number(sessionData.total_volume) || 0;
    const prCount = Number(sessionData.pr_count) || 0;

    document.getElementById('modal-stat-duration').innerText = duration;
    document.getElementById('modal-stat-time').innerText = `${startTime} - ${endTime}`;
    document.getElementById('modal-stat-volume').innerText = `${totalVolume.toLocaleString('pt-BR')} kg`;
    document.getElementById('modal-stat-prs').innerText = `${prCount} PR(s)`;

    // Agrupa séries por exercício
    const grouped = {};
    (setsData || []).forEach(set => {
      const exName = set.exercise_name || set.name || 'Exercício';
      if (!grouped[exName]) grouped[exName] = [];
      grouped[exName].push(set);
    });

    if (Object.keys(grouped).length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhuma série registrada nesta sessão.</p>';
      return;
    }

    // Renderiza blocos de exercício com badges de PR
    container.innerHTML = Object.entries(grouped).map(([exName, exerciseSets]) => `
  <div class="exercise-block">
    <div class="exercise-block-title">${exName}</div>
    <div class="sets-grid">
      ${exerciseSets.map(set => {
      const isPR = Boolean(set.is_pr_weight || set.is_pr_volume);

      let prBadges = '';
      if (set.is_pr_weight) {
        prBadges += '<span class="pr-tag" style="background: rgba(234, 179, 8, 0.2); color: #eab308; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; white-space: nowrap;">🏆 Carga PR</span>';
      }
      if (set.is_pr_volume) {
        prBadges += '<span class="pr-tag" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; white-space: nowrap;">⚡ Vol PR</span>';
      }

      return `
          <div class="set-chip ${isPR ? 'pr-badge' : ''}" style="display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 8px; background: #18181b;">
            <div class="set-chip-title" style="font-size: 0.75rem; color: #a1a1aa; text-align: center;">Série ${set.set_number}</div>
            
            <div class="set-chip-detail" style="font-size: 0.95rem; font-weight: bold; text-align: center;">
              ${set.weight || 0}kg <span style="color: #71717a; font-size: 0.75rem;">x${set.reps || 0}</span>
            </div>

            ${prBadges ? `<div class="set-pr-container" style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 2px;">${prBadges}</div>` : ''}
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