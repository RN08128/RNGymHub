var API_URL = 'https://rngymhub.onrender.com';

let workoutData = null;
let startTime = new Date().toISOString();

// Captura o token de autenticação salvo
function getAuthToken() {
  return localStorage.getItem('@RNGymHub:token') || localStorage.getItem('token') || '';
}

// Captura o ID da URL se existir
const urlParams = new URLSearchParams(window.location.search);
const workoutId = urlParams.get('id');

// 1. Carregar Treino Ativo com Token Autenticado
async function loadWorkout(id) {
  if (!id) {
    alert('Nenhum treino selecionado! Redirecionando...');
    window.location.href = 'workouts.html';
    return;
  }

  try {
    const token = getAuthToken();

    const response = await fetch(`${API_URL}/workouts/${id}/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Erro na resposta da API');
    }

    const rawData = await response.json();

    // Normalização das chaves e estado interno do treino
    workoutData = {
      workout_id: rawData.workout_id || rawData.id,
      name: rawData.workout_name || rawData.name || 'Treino Ativo',
      description: rawData.description || '',
      exercises: normalizeExercisesData(rawData.exercises || [])
    };
    
    // Atualiza o título na tela
    const titleEl = document.getElementById('workout-title');
    if (titleEl) {
      titleEl.innerText = workoutData.name;
    }

    renderExercises();
  } catch (err) {
    console.error('Erro ao carregar treino:', err);
    alert(`Erro ao carregar treino: ${err.message}`);
  }
}

// Auxiliar: Normaliza o array de exercícios e transforma o contador de séries em um array mutável de séries
function normalizeExercisesData(exercises) {
  return exercises.map((ex) => {
    const exerciseId = ex.exercise_id || ex.id;
    const totalSets = typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets, 10) || 3;
    const defaultReps = typeof ex.reps === 'number' ? ex.reps : parseInt(ex.reps, 10) || 10;
    const defaultWeight = typeof ex.weight === 'number' ? ex.weight : parseFloat(ex.weight) || 0;

    // Se já vier um array de séries do backend, reutiliza. Senão, gera com base no número total de séries.
    let setsArray = Array.isArray(ex.sets) ? ex.sets : [];

    if (setsArray.length === 0) {
      for (let i = 1; i <= totalSets; i++) {
        setsArray.push({
          set_number: i,
          target_reps: defaultReps,
          weight: defaultWeight,
          reps: defaultReps,
          completed: false,
          is_pr_weight: false,
          is_pr_volume: false
        });
      }
    }

    return {
      exercise_id: exerciseId,
      name: ex.name || 'Exercício',
      target_muscle: ex.target_muscle || '',
      description: ex.description || '',
      personal_record: ex.personal_record || { max_weight: 0, max_volume_set: 0 },
      sets: setsArray
    };
  });
}

// 2. Renderizar os cards dos exercícios e suas séries em grid
function renderExercises() {
  const container = document.getElementById('exercises-container');
  if (!container) return;
  container.innerHTML = '';

  if (!workoutData || !workoutData.exercises || workoutData.exercises.length === 0) {
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
          <div class="set-row ${set.completed ? 'completed' : ''}" id="row-${ex.exercise_id}-${i}">
            <span class="set-num">${set.set_number}</span>
            <input type="number" placeholder="kg" id="weight-${ex.exercise_id}-${i}" value="${set.weight || ''}" step="0.5" class="input-weight">
            <input type="number" placeholder="${set.target_reps || 'reps'}" id="reps-${ex.exercise_id}-${i}" value="${set.reps || ''}" class="input-reps">
            <button type="button" class="btn-check ${set.completed ? (set.is_pr_weight || set.is_pr_volume ? 'pr-active' : 'active') : ''}" id="btn-${ex.exercise_id}-${i}" onclick="toggleCheck('${ex.exercise_id}',${i})">
              ${set.completed ? (set.is_pr_weight || set.is_pr_volume ? '★' : '✓') : '✓'}
            </button>
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

  if (!weightInput || !repsInput) return;

  const weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value, 10);

  if (isNaN(weight) || isNaN(reps) || weight < 0 || reps <= 0) {
    alert('Preencha peso e repetições válidos!');
    return;
  }

  const exercise = workoutData.exercises.find(e => e.exercise_id === exerciseId);
  if (!exercise || !exercise.sets[setIndex]) return;

  const set = exercise.sets[setIndex];
  const isCurrentlyCompleted = set.completed;

  // Permite desmarcar a série se clicar novamente
  if (isCurrentlyCompleted) {
    set.completed = false;
    set.is_pr_weight = false;
    set.is_pr_volume = false;

    row.className = 'set-row';
    btn.className = 'btn-check';
    btn.innerHTML = '✓';
    return;
  }

  const pr = exercise.personal_record || { max_weight: 0, max_volume_set: 0 };
  const setVolume = weight * reps;

  // Regra de Negócio de PRs
  const isPrWeight = pr.max_weight > 0 ? weight > pr.max_weight : false;
  const isPrVolume = pr.max_volume_set > 0 ? setVolume > pr.max_volume_set : false;
  const isPr = isPrWeight || isPrVolume;

  // Atualiza estado local da série
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

// 4. Finalizar e Salvar Treino na API
async function finishWorkout() {
  const logs = [];
  let totalVolume = 0;
  let totalPRs = 0;

  if (!workoutData || !workoutData.exercises) return;

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
    alert('Complete ao menos uma série antes de finalizar o treino.');
    return;
  }

  const payload = {
    workout_id: workoutData.workout_id,
    start_time: startTime,
    end_time: new Date().toISOString(),
    logs: logs
  };

  try {
    const token = getAuthToken();

    const res = await fetch(`${API_URL}/workouts/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

      const container = document.getElementById('exercises-container');
      if (container) container.style.display = 'none';

      const finishBtn = document.querySelector('.btn-finish');
      if (finishBtn) {
        finishBtn.innerText = 'Ver Histórico e Evolução';
        finishBtn.style.background = '#22c55e';
        finishBtn.onclick = () => window.location.href = 'history.html';
      }

    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Erro ao salvar treino: ${errData.message || 'Erro interno do servidor'}`);
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