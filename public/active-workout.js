var API_URL = 'https://kenneth-exhaust-configure-transformation.trycloudflare.com';

const urlParams = new URLSearchParams(window.location.search);
const workoutId = urlParams.get('id');

const STORAGE_KEY = `active_workout_state_${workoutId}`;

let workoutData = null;
let startTimeISO = null;
let totalWorkoutSeconds = 0;
let totalTimerInterval = null;
let restTimerInterval = null;

let exercisePRs = {};

function normalizeExerciseName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function getExercisePR(exercise) {
  const byId = exercisePRs[exercise.exercise_id];
  const byName = exercisePRs[normalizeExerciseName(exercise.name)];

  if (!byId) return byName;
  if (!byName) return byId;

  return {
    maxWeight: Math.max(byId.maxWeight, byName.maxWeight),
    maxVolume: Math.max(byId.maxVolume, byName.maxVolume)
  };
}

function getAuthHeaders() {
  let token = localStorage.getItem('@RNGymHub:token');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      token = Array.isArray(parsed) ? parsed.join('.') : parsed;
    } catch (e) { }
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token.replace(/"/g, '')}` : ''
  };
}

// -------------------------------------------------------------
// 1. CARREGAMENTO E INICIALIZAÇÃO
// -------------------------------------------------------------
async function initActiveWorkout() {
  if (!workoutId) {
    alert('Nenhum treino selecionado.');
    window.location.href = 'workouts.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/workouts/${workoutId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Erro HTTP ${res.status}`);
    }

    const fetchedWorkout = await res.json();

    await fetchPRHistory();

    const savedState = localStorage.getItem(STORAGE_KEY);

    if (savedState) {
      const parsed = JSON.parse(savedState);
      workoutData = parsed.workoutData;
      startTimeISO = parsed.startTimeISO || new Date().toISOString();
      totalWorkoutSeconds = parsed.totalWorkoutSeconds || 0;
    } else {
      startTimeISO = new Date().toISOString();

      const exercisesList = fetchedWorkout.exercises || fetchedWorkout.workout_exercises || [];

      workoutData = {
        ...fetchedWorkout,
        exercises: exercisesList.map(ex => {
          const setsCount = Number(ex.target_sets || ex.sets) || 3;
          const repsCount = Number(ex.target_reps || ex.reps) || 10;
          const exerciseId = ex.exercise_id || ex.id;
          const exerciseName = ex.name || ex.exercise_name || 'Exercício';

          return {
            ...ex,
            exercise_id: exerciseId,
            name: exerciseName,
            sets_data: Array.from({ length: setsCount }, (_, i) => ({
              set_number: i + 1,
              weight: Number(ex.weight) || 0,
              reps: repsCount,
              completed: false,
              is_pr_weight: false,
              is_pr_volume: false
            }))
          };
        })
      };

      saveProgressToStorage();
    }

    checkAllPRs();
    renderWorkoutUI();
    startTotalWorkoutTimer();
  } catch (err) {
    console.error('Erro ao inicializar treino:', err);
    alert(`Erro ao carregar o treino ativo: ${err.message}`);
  }
}

async function fetchPRHistory() {
  try {
    const res = await fetch(`${API_URL}/workouts/history/prs`, {
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const prs = await res.json();
      prs.forEach(pr => {
        const record = {
          maxWeight: Number(pr.max_weight) || 0,
          maxVolume: Number(pr.max_volume) || 0
        };

        [pr.exercise_id, normalizeExerciseName(pr.exercise_name)].forEach(key => {
          if (!key) return;

          const existing = exercisePRs[key];
          exercisePRs[key] = {
            maxWeight: Math.max(existing?.maxWeight || 0, record.maxWeight),
            maxVolume: Math.max(existing?.maxVolume || 0, record.maxVolume)
          };
        });
      });
    }
  } catch (err) {
    console.warn('Não foi possível carregar o histórico de PRs:', err);
  }
}

function checkAllPRs() {
  if (!workoutData || !workoutData.exercises) return;

  workoutData.exercises.forEach(ex => {
    const exId = ex.exercise_id;
    const previousPR = getExercisePR(ex) || { maxWeight: 0, maxVolume: 0 };

    let currentHighestWeight = previousPR.maxWeight;
    let currentHighestVolume = previousPR.maxVolume;

    ex.sets_data.forEach(set => {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      const volume = weight * reps;

      if (weight > 0 && weight > currentHighestWeight) {
        set.is_pr_weight = true;
        currentHighestWeight = weight;
      } else {
        set.is_pr_weight = false;
      }

      if (volume > 0 && volume > currentHighestVolume) {
        set.is_pr_volume = true;
        currentHighestVolume = volume;
      } else {
        set.is_pr_volume = false;
      }
    });
  });
}

// -------------------------------------------------------------
// 2. RENDERIZAÇÃO DA INTERFACE DO TREINO
// -------------------------------------------------------------
function renderWorkoutUI() {
  const container = document.getElementById('exercises-container');
  const titleEl = document.getElementById('workout-title');

  if (titleEl && workoutData.name) {
    titleEl.textContent = workoutData.name;
  }

  if (!container) return;

  if (!workoutData.exercises || workoutData.exercises.length === 0) {
    container.innerHTML = '<p style="color: #a1a1aa; text-align: center; margin: 40px 0;">Nenhum exercício encontrado nesta ficha.</p>';
    return;
  }

  container.innerHTML = workoutData.exercises.map((ex, exIdx) => {
    const previousPR = getExercisePR(ex);
    const prText = previousPR && previousPR.maxWeight > 0
      ? `<span class="pr-badge-header">👑 Recorde: ${previousPR.maxWeight}kg</span>`
      : '';

    return `
      <div class="exercise-card">
        <div class="exercise-header">
          <span class="exercise-title">${ex.name}</span>
          ${prText}
        </div>

        <div class="set-header-row">
          <span>SÉRIE</span>
          <span>CARGA (KG)</span>
          <span>REPS</span>
          <span>FEITO</span>
        </div>

        <div class="sets-list">
          ${ex.sets_data.map((set, setIdx) => {
      const isPR = set.is_pr_weight || set.is_pr_volume;

      return `
              <div class="set-row ${set.completed ? 'completed' : ''} ${isPR ? 'is-pr' : ''}">
                <div class="set-num-container">
                  <span class="set-num">#${set.set_number}</span>${isPR ? '<span class="pr-tag-mini">👑 PR</span>' : ''}
                </div>
                
                <input type="number" step="0.5" min="0" value="${set.weight}" 
                  onchange="updateSetInput(${exIdx},${setIdx}, 'weight', this.value)" />

                <input type="number" min="1" value="${set.reps}" 
                  onchange="updateSetInput(${exIdx},${setIdx}, 'reps', this.value)" />

                <button type="button" class="btn-check ${set.completed ? 'active' : ''}" 
                  onclick="toggleSetCompleted(${exIdx},${setIdx})">
                  ✓
                </button>
              </div>
            `;
    }).join('')}
        </div>

        <button type="button" class="btn-add-set" onclick="addSetToExercise(${exIdx})">
          + Adicionar Série
        </button>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 3. CRONÔMETRO E STORAGE
// -------------------------------------------------------------
function startTotalWorkoutTimer() {
  const timerDisplay = document.getElementById('total-workout-timer');

  totalTimerInterval = setInterval(() => {
    totalWorkoutSeconds++;
    saveProgressToStorage();

    if (timerDisplay) {
      const hrs = String(Math.floor(totalWorkoutSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalWorkoutSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(totalWorkoutSeconds % 60).padStart(2, '0');
      timerDisplay.textContent = hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
    }
  }, 1000);
}

function saveProgressToStorage() {
  if (!workoutData) return;

  const stateToSave = {
    workoutId,
    startTimeISO,
    totalWorkoutSeconds,
    workoutData
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

// -------------------------------------------------------------
// 4. AÇÕES DO USUÁRIO
// -------------------------------------------------------------
function toggleSetCompleted(exerciseIndex, setIndex) {
  const currentStatus = workoutData.exercises[exerciseIndex].sets_data[setIndex].completed;
  const newStatus = !currentStatus;

  workoutData.exercises[exerciseIndex].sets_data[setIndex].completed = newStatus;

  checkAllPRs();
  saveProgressToStorage();
  renderWorkoutUI();

  if (newStatus) {
    const set = workoutData.exercises[exerciseIndex].sets_data[setIndex];
    if (set.is_pr_weight) {
      alert(`🎉 NOVO RECORDE PESSOAL! Carga de ${set.weight}kg superou o recorde anterior!`);
    }
    startRestTimer();
  }
}

function updateSetInput(exerciseIndex, setIndex, field, value) {
  const val = parseFloat(value) || 0;
  workoutData.exercises[exerciseIndex].sets_data[setIndex][field] = val;
  checkAllPRs();
  saveProgressToStorage();
  renderWorkoutUI();
}

function addSetToExercise(exerciseIndex) {
  const currentSets = workoutData.exercises[exerciseIndex].sets_data;
  const lastSet = currentSets[currentSets.length - 1] || { weight: 0, reps: 10 };

  currentSets.push({
    set_number: currentSets.length + 1,
    weight: lastSet.weight,
    reps: lastSet.reps,
    completed: false,
    is_pr_weight: false,
    is_pr_volume: false
  });

  checkAllPRs();
  saveProgressToStorage();
  renderWorkoutUI();
}

// -------------------------------------------------------------
// 5. TIMER DE DESCANSO
// -------------------------------------------------------------
function startRestTimer() {
  clearInterval(restTimerInterval);

  const restInput = document.getElementById('rest-duration-input');
  const configuredTime = restInput ? parseInt(restInput.value, 10) : 120;
  let restTimeRemaining = isNaN(configuredTime) ? 120 : configuredTime;

  const restDisplay = document.getElementById('rest-timer-display');
  const restModal = document.getElementById('rest-timer-container');
  if (restModal) restModal.style.display = 'block';

  restTimerInterval = setInterval(() => {
    restTimeRemaining--;

    if (restDisplay) {
      const mins = String(Math.floor(restTimeRemaining / 60)).padStart(2, '0');
      const secs = String(restTimeRemaining % 60).padStart(2, '0');
      restDisplay.textContent = `${mins}:${secs}`;
    }

    if (restTimeRemaining <= 0) {
      clearInterval(restTimerInterval);
      if (restModal) restModal.style.display = 'none';
      alert('🔔 Tempo de descanso finalizado! Próxima série.');
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  const restModal = document.getElementById('rest-timer-container');
  if (restModal) restModal.style.display = 'none';
}

// -------------------------------------------------------------
// 6. FINALIZAR TREINO
// -------------------------------------------------------------
async function finishWorkout() {
  const confirmFinish = confirm('Deseja realmente finalizar o treino?');
  if (!confirmFinish) return;

  const logsPayload = [];

  workoutData.exercises.forEach(ex => {
    ex.sets_data.forEach(set => {
      if (set.completed || set.reps > 0) {
        logsPayload.push({
          exercise_id: ex.exercise_id || ex.id,
          set_number: set.set_number,
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          is_pr_weight: Boolean(set.is_pr_weight),
          is_pr_volume: Boolean(set.is_pr_volume)
        });
      }
    });
  });

  if (logsPayload.length === 0) {
    alert('Conclua pelo menos uma série para salvar o treino.');
    return;
  }

  const payload = {
    workout_id: workoutId,
    started_at: startTimeISO,
    ended_at: new Date().toISOString(),
    logs: logsPayload
  };

  try {
    const res = await fetch(`${API_URL}/workouts/log`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      alert('🎉 Treino finalizado e salvo com sucesso!');
      clearInterval(totalTimerInterval);
      clearInterval(restTimerInterval);
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = 'workouts.html';
    } else {
      alert(data.message || 'Erro ao salvar o log do treino.');
    }
  } catch (err) {
    console.error('Erro de requisição:', err);
    alert('Erro de conexão com o servidor ao salvar o log.');
  }
}

document.addEventListener('DOMContentLoaded', initActiveWorkout);