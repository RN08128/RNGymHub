window.API_URL = window.API_URL || 'http://localhost:3333';
var API_URL = window.API_URL;
let availableExercises = [];
let selectedExercises = [];

// 1. Carregar lista de exercícios
async function fetchExercises() {
  try {
    const res = await fetch(`${API_URL}/exercises`);
    availableExercises = await res.json();

    const select = document.getElementById('select-exercise');

    if (availableExercises.length === 0) {
      select.innerHTML = '<option value="">Nenhum exercício cadastrado</option>';
      return;
    }

    select.innerHTML = availableExercises.map(ex =>
      `<option value="${ex.id}">${ex.name} (${ex.target_muscle})</option>`
    ).join('');
  } catch (err) {
    console.error('Erro ao buscar exercícios:', err);
  }
}

// 2. Deletar exercício do banco
async function deleteSelectedExercise() {
  const select = document.getElementById('select-exercise');
  const exerciseId = select.value;

  if (!exerciseId) {
    alert('Nenhum exercício selecionado para deletar.');
    return;
  }

  const exerciseObj = availableExercises.find(e => e.id === exerciseId);
  const confirmDelete = confirm(`Tem certeza que deseja deletar o exercício "${exerciseObj.name}"?`);

  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_URL}/exercises/${exerciseId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      alert('Exercício deletado com sucesso!');
      selectedExercises = selectedExercises.filter(e => e.exercise_id !== exerciseId);
      renderSelected();
      await fetchExercises();
    } else {
      const err = await res.json();
      alert(err.message || 'Erro ao deletar exercício.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão com o servidor ao deletar.');
  }
}

// 3. Adicionar exercício à lista da ficha
function addExerciseToState() {
  const select = document.getElementById('select-exercise');
  if (!select.value) return alert('Cadastre ou selecione um exercício primeiro!');

  const exerciseId = select.value;
  const exerciseObj = availableExercises.find(e => e.id === exerciseId);
  const sets = parseInt(document.getElementById('target-sets').value, 10);
  const reps = parseInt(document.getElementById('target-reps').value, 10);

  if (isNaN(sets) || sets <= 0 || isNaN(reps) || reps <= 0) {
    alert('Preencha valores válidos para séries e repetições.');
    return;
  }

  selectedExercises.push({
    exercise_id: exerciseId,
    name: exerciseObj.name,
    target_sets: sets,
    target_reps: reps
  });

  renderSelected();
}

// 4. Renderizar exercícios adicionados
function renderSelected() {
  const list = document.getElementById('added-list');
  if (selectedExercises.length === 0) {
    list.innerHTML = '<p class="empty-msg">Nenhum exercício adicionado ainda.</p>';
    return;
  }

  list.innerHTML = selectedExercises.map((item, index) => `
    <div class="added-exercise">
      <span class="added-exercise-info">
        <strong>${item.name}</strong> 
        <small>${item.target_sets} séries × ${item.target_reps} reps</small>
      </span>
      <button type="button" class="btn-remove-item" onclick="removeExercise(${index})" title="Remover">✕</button>
    </div>
  `).join('');
}

function removeExercise(index) {
  selectedExercises.splice(index, 1);
  renderSelected();
}

// 5. Cadastrar Novo Exercício via Modal
async function createNewExercise() {
  const name = document.getElementById('new-ex-name').value;
  const target_muscle = document.getElementById('new-ex-muscle').value;

  if (!name || !target_muscle) return alert('Preencha o nome e o grupo muscular.');

  try {
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, target_muscle })
    });

    if (res.ok) {
      alert('Exercício cadastrado com sucesso!');
      document.getElementById('new-ex-name').value = '';
      document.getElementById('new-ex-muscle').value = '';
      toggleModal(false);
      await fetchExercises();
    } else {
      alert('Erro ao cadastrar exercício.');
    }
  } catch (err) {
    console.error('Erro:', err);
    alert('Erro de conexão ao cadastrar exercício.');
  }
}

// 6. Salvar Ficha (com suporte para "Apenas Salvar" ou "Salvar e Iniciar")
async function saveWorkout(startImmediately = false) {
  const name = document.getElementById('workout-name').value.trim();
  const description = document.getElementById('workout-desc').value.trim();

  if (!name || selectedExercises.length === 0) {
    alert('Preencha o nome do treino e adicione pelo menos um exercício.');
    return;
  }

  const payload = {
    user_id: "00000000-0000-0000-0000-000000000000",
    name,
    description,
    exercises: selectedExercises.map(item => ({
      exercise_id: item.exercise_id,
      target_sets: item.target_sets,
      target_reps: item.target_reps
    }))
  };

  try {
    const res = await fetch(`${API_URL}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      if (startImmediately) {
        window.location.href = `active-workout.html?id=${data.workout_id}`;
      } else {
        alert('🎉 Ficha criada com sucesso!');
        window.location.href = 'workouts.html';
      }
    } else {
      alert(data.message || 'Erro ao salvar treino.');
    }
  } catch (err) {
    console.error('Erro na requisição:', err);
    alert('Erro ao conectar com o servidor para salvar a ficha.');
  }
}

function toggleModal(show) {
  document.getElementById('ex-modal').style.display = show ? 'flex' : 'none';
}

// Inicializa a busca de exercícios
fetchExercises();