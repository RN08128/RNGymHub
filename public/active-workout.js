window.API_URL = window.API_URL || 'http://localhost:3333';
var API_URL = window.API_URL;

let workoutData = null;
let startTime = new Date().toISOString();

// ID Padrão para fallback caso não seja passado via URL
const DEFAULT_WORKOUT_ID = 'e3752a34-92ba-4888-a02b-fc56cb94e2d8';

// Captura o ID da URL se existir, senão usa o padrão
const urlParams = new URLSearchParams(window.location.search);
const workoutId = urlParams.get('id') || DEFAULT_WORKOUT_ID;

// 1. Carregar Treino Ativo e Histórico de PRs
async function loadWorkout(id) {
  try {
    const response = await fetch(`${API_URL}/workouts/${id}/active`);
    if (!response.ok) throw new Error('Erro na resposta da API');

    workoutData = await response.json();

    // Tratamento com fallback seguro para o título do treino
    const titleEl = document.getElementById('workout-title');
    if (titleEl) {
      titleEl.innerText = workoutData.workout_name || workoutData.name || 'Treino Ativo';
    }

    renderExercises();
  } catch (err) {
    console.error('Erro ao carregar treino:', err);
    alert('Erro ao carregar treino. Verifique o servidor backend.');
  }
}

// 2. Renderizar os cards dos exercícios e suas séries em grid
function renderExercises() {
  const container = document.getElementById('exercises-container');
  if (!container) return;
  container.innerHTML = '';

  if (!workoutData.exercises || workoutData.exercises.length === 0) {
    container.innerHTML = '<p style="color: #aaa; text-align: center;">Nenhum exercício cadastrado nesta ficha.</p>';
    return;
  }

  workoutData.exercises.forEach((ex) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    const maxW = ex.personal_record?.max_weight || 0;
    const maxV = ex.personal_record?.max_volume_set || 0;

    card.innerHTML = `
      <div class="exercise-header">
        <span class="exercise-title">${ex.name}</span>
        <span class="pr-badge-info">
          PR: ${maxW}kg | Vol: ${maxV}kg
        </span>
      </div>

      <!-- Cabeçalho das Colunas de Série -->
      <div class="set-header-row">
        <span>Série</span>
        <span>Carga (kg)</span>
        <span>Reps</span>
        <span>Status</span>
      </div>

      <div class="sets-list" id="sets-${ex.exercise_id}">
        ${ex.sets.map((set, i) => `
          <div class="set-row" id="row-${ex.exercise_id}-${i}">
            <span class="set-num">${set.set_number}</span>
            <input type="number" placeholder="kg" id="weight-${ex.exercise_id}-${i}" step="0.5" class="input-weight">
            <input type="number" placeholder="${set.target_reps || 'reps'}" id="reps-${ex.exercise_id}-${i}" class="input-reps">
            <button type="button" class="btn-check" id="btn-${ex.exercise_id}-${i}" onclick="toggleCheck('${ex.exercise_id}', ${i})">✓</button>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

// 3. Validação Instantânea de PR ao Marcar a Série
function toggleCheck(exerciseId, setIndex) {
  const weightInput = document.getElementById(`weight-${exerciseId}-${setIndex}`);
  const repsInput = document.getElementById(`reps-${exerciseId}-${setIndex}`);
  const row = document.getElementById(`row-${exerciseId}-${setIndex}`);
  const btn = document.getElementById(`btn-${exerciseId}-${setIndex}`);

  const weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value, 10);

  if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
    alert('Preencha peso e repetições válidos!');
    return;
  }

  const exercise = workoutData.exercises.find(e => e.exercise_id === exerciseId);
  const pr = exercise.personal_record || { max_weight: 0, max_volume_set: 0 };
  const setVolume = weight * reps;

  // Regra de Negócio de PRs
  const isPrWeight = pr.max_weight > 0 ? weight > pr.max_weight : true;
  const isPrVolume = pr.max_volume_set > 0 ? setVolume > pr.max_volume_set : true;
  const isPr = isPrWeight || isPrVolume;

  // Atualiza estado local da série
  const set = exercise.sets[setIndex];
  set.weight = weight;
  set.reps = reps;
  set.completed = true;
  set.is_pr_weight = isPrWeight;
  set.is_pr_volume = isPrVolume;

  // Atualiza a interface
  row.className = `set-row completed ${isPr ? 'is-pr' : ''}`;
  btn.className = `btn-check ${isPr ? 'pr-active' : 'active'}`;
  btn.innerHTML = isPr ? '★' : '✓';
}

// 4. Finalizar e Salvar Treino
async function finishWorkout() {
  const logs = [];
  let totalVolume = 0;
  let totalPRs = 0;

  workoutData.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (set.completed) {
        logs.push({
          exercise_id: ex.exercise_id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          is_pr_weight: set.is_pr_weight,
          is_pr_volume: set.is_pr_volume
        });

        totalVolume += (set.weight * set.reps);
        if (set.is_pr_weight || set.is_pr_volume) totalPRs++;
      }
    });
  });

  if (logs.length === 0) {
    alert('Complete ao menos uma série antes de finalizar.');
    return;
  }

  const payload = {
    workout_id: workoutData.workout_id,
    start_time: startTime,
    end_time: new Date().toISOString(),
    started_at: startTime,
    ended_at: new Date().toISOString(),
    logs: logs
  };

  try {
    const res = await fetch(`${API_URL}/workouts/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      document.getElementById('workout-title').innerText = '🏆 Treino Concluído!';
      
      const subtitleEl = document.getElementById('workout-subtitle');
      if (subtitleEl) {
        subtitleEl.innerHTML = `
          <div class="summary-box">
            <span style="color: #eab308; font-weight: bold;">★ ${totalPRs} Recorde(s) (PRs)</span> | 
            <span style="color: #22c55e; font-weight: bold;">📦 ${totalVolume}kg Volume Total</span>
          </div>
        `;
      }

      document.getElementById('exercises-container').style.display = 'none';

      const finishBtn = document.querySelector('.btn-finish');
      if (finishBtn) {
        finishBtn.innerText = 'Ver Histórico e Evolução';
        finishBtn.style.background = '#22c55e';
        finishBtn.onclick = () => window.location.href = 'history.html';
      }

    } else {
      alert('Erro ao salvar treino no banco.');
    }
  } catch (err) {
    console.error('Erro ao conectar com a API:', err);
    alert('Erro de conexão ao salvar treino.');
  }
}

// Inicializa a busca do treino ativo ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  loadWorkout(workoutId);
});