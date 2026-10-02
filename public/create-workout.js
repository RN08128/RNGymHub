var API_URL = 'http://localhost:3000' || 'https://proportion-defendant-coalition-innovative.trycloudflare.com';
let availableExercises = [];
let selectedExercises = [];

// Captura o ID do treino se estiver no modo de edição
const urlParams = new URLSearchParams(window.location.search);
const editingWorkoutId = urlParams.get('id');

// Helper para obter os headers padrões com autenticação JWT
function getAuthHeaders() {
  let token = localStorage.getItem('@RNGymHub:token');

  if (token) {
    try {
      const parsed = JSON.parse(token);
      token = Array.isArray(parsed) ? parsed.join('.') : parsed;
    } catch (e) {
      // Se já for string pura, segue normal
    }
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token.replace(/"/g, '')}` : ''
  };
}

// 1. Carregar lista de exercícios disponíveis
async function fetchExercises() {
  try {
    const res = await fetch(`${API_URL}/exercises`, {
      headers: getAuthHeaders()
    });
    availableExercises = await res.json();

    const select = document.getElementById('select-exercise');

    if (!availableExercises || availableExercises.length === 0) {
      select.innerHTML = '<option value="">Nenhum exercício cadastrado</option>';
      return;
    }

    select.innerHTML = availableExercises.map(ex =>
      `<option value="${ex.id}">${ex.name} (${ex.target_muscle || 'Geral'})</option>`
    ).join('');
  } catch (err) {
    console.error('Erro ao buscar exercícios:', err);
  }
}

// 2. Se for EDIÇÃO, busca os dados da ficha no backend e preenche os campos
async function loadWorkoutForEdit() {
  if (!editingWorkoutId) return;

  const pageTitle = document.querySelector('h1, .page-title');
  if (pageTitle) pageTitle.textContent = 'Editar Ficha de Treino';

  try {
    const res = await fetch(`${API_URL}/workouts/${editingWorkoutId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Resposta de erro do servidor:', res.status, errorData);
      throw new Error(errorData.message || `Erro HTTP ${res.status}`);
    }

    const workout = await res.json();

    document.getElementById('workout-name').value = workout.name || '';
    document.getElementById('workout-desc').value = workout.description || '';

    if (workout.exercises && Array.isArray(workout.exercises)) {
      selectedExercises = workout.exercises.map(ex => ({
        exercise_id: ex.exercise_id || ex.id,
        name: ex.name,
        target_sets: Number(ex.target_sets || ex.sets) || 3,
        target_reps: Number(ex.target_reps || ex.reps) || 10
      }));
      renderSelected();
    }
  } catch (err) {
    console.error('Erro ao carregar treino para edição:', err);
    alert(`Erro ao carregar os dados da ficha: ${err.message}`);
  }
}

// 3. Deletar exercício do banco
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
      headers: getAuthHeaders()
    });

    if (res.ok) {
      alert('Exercício deletado com sucesso!');
      selectedExercises = selectedExercises.filter(e => e.exercise_id !== exerciseId);
      renderSelected();
      await fetchExercises();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Erro ao deletar exercício.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão com o servidor ao deletar.');
  }
}

// 4. Adicionar exercício à lista da ficha
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

// 5. Renderizar exercícios adicionados com edição inline e suporte a Drag & Drop (☰) 
function renderSelected() {
  const list = document.getElementById('added-list');
  if (!list) return;

  if (selectedExercises.length === 0) {
    list.innerHTML = '<p class="empty-msg">Nenhum exercício adicionado ainda.</p>';
    return;
  }

  list.innerHTML = selectedExercises.map((item, index) => {
    const sets = item.target_sets || item.sets || 3;
    const reps = item.target_reps || item.reps || 10;

    return `
      <div class="added-exercise" 
        draggable="true" 
        ondragstart="handleDragStart(event, ${index})" 
        ondragover="handleDragOver(event, ${index})" 
        ondragend="handleDragEnd(event)"
        style="display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: grab;">
        
        <!-- Ícone das 3 barrinhas na lateral esquerda/direita -->
        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
          <span title="Clique e arraste para reordenar" style="color: #71717a; font-size: 18px; user-select: none;">☰</span>
          <strong style="color: #fff; font-size: 15px;">${item.name}</strong>
        </div>

        <!-- Inputs Inline para Séries e Reps -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="color: #a1a1aa; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            Séries
            <input type="number" min="1" value="${sets}" 
              onchange="updateExerciseInline(${index}, 'target_sets', this.value)"
              style="width: 50px; background: #09090b; border: 1px solid #3f3f46; color: #38bdf8; border-radius: 4px; padding: 3px 5px; text-align: center; font-weight: bold;"
            />
          </label>

          <span style="color: #71717a;">×</span>

          <label style="color: #a1a1aa; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            Reps
            <input type="number" min="1" value="${reps}" 
              onchange="updateExerciseInline(${index}, 'target_reps', this.value)"
              style="width: 50px; background: #09090b; border: 1px solid #3f3f46; color: #38bdf8; border-radius: 4px; padding: 3px 5px; text-align: center; font-weight: bold;"
            />
          </label>
        </div>

        <!-- Botão de Remover (Mantido do original) -->
        <button type="button" class="btn-remove-item" onclick="removeExercise(${index})" title="Remover">✕</button>
      </div>
    `;
  }).join('');
}

function removeExercise(index) {
  selectedExercises.splice(index, 1);
  renderSelected();
}

// Atualiza o valor de Séries ou Reps diretamente do input no card
function updateExerciseInline(index, field, value) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue) || parsedValue <= 0) return;

  if (field === 'sets') {
    selectedExercises[index].target_sets = parsedValue;
    selectedExercises[index].sets = parsedValue;
  } else if (field === 'reps') {
    selectedExercises[index].target_reps = parsedValue;
    selectedExercises[index].reps = parsedValue;
  }
}

// Altera a ordem do exercício na lista (direção: -1 para cima, 1 para baixo)
function moveExercise(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= selectedExercises.length) return;

  // Troca a posição dos dois elementos no array
  const temp = selectedExercises[index];
  selectedExercises[index] = selectedExercises[newIndex];
  selectedExercises[newIndex] = temp;

  renderSelected();
}

// 6. Cadastrar Novo Exercício via Modal
async function createNewExercise() {
  const name = document.getElementById('new-ex-name').value;
  const target_muscle = document.getElementById('new-ex-muscle').value;

  if (!name || !target_muscle) return alert('Preencha o nome e o grupo muscular.');

  try {
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'POST',
      headers: getAuthHeaders(),
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

// 7. Salvar Ficha (Criação com POST ou Atualização com PUT)
async function saveWorkout(startImmediately = false) {
  const token = localStorage.getItem('@RNGymHub:token');

  if (!token) {
    alert('Sessão expirada. Por favor, faça login novamente.');
    window.location.href = 'auth.html';
    return;
  }

  const name = document.getElementById('workout-name').value.trim();
  const description = document.getElementById('workout-desc').value.trim();

  if (!name || selectedExercises.length === 0) {
    alert('Preencha o nome do treino e adicione pelo menos um exercício.');
    return;
  }

  // ✅ CORRIGIDO: Agora envia "sets" e "reps" com conversão para número!
  const payload = {
    name,
    description,
    exercises: selectedExercises.map(item => ({
      exercise_id: item.exercise_id,
      sets: Number(item.target_sets || item.sets) || 1,
      reps: Number(item.target_reps || item.reps) || 10
    }))
  };

  // Se tiver ID na URL faz PUT (editar), caso contrário faz POST (criar)
  const isEditing = Boolean(editingWorkoutId);
  const endpoint = isEditing ? `${API_URL}/workouts/${editingWorkoutId}` : `${API_URL}/workouts`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      if (startImmediately) {
        // Captura a ID tanto para criação quanto para edição
        const targetId = isEditing ? editingWorkoutId : data.workout_id;

        if (!targetId) {
          alert('Não foi possível obter a ID do treino para iniciar.');
          window.location.href = 'workouts.html';
          return;
        }

        window.location.href = `active-workout.html?id=${targetId}`;
      } else {
        alert(isEditing ? '🎉 Ficha atualizada com sucesso!' : '🎉 Ficha criada com sucesso!');
        window.location.href = 'workouts.html';
      }
    } else {
      if (res.status === 401) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = 'auth.html';
        return;
      }
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

// Inicialização: carrega exercícios e, se houver ID, carrega os dados da ficha
document.addEventListener('DOMContentLoaded', async () => {
  await fetchExercises();
  if (editingWorkoutId) {
    await loadWorkoutForEdit();
  }
});

// Armazena o índice do item sendo arrastado
let draggedIndex = null;

function handleDragStart(event, index) {
  draggedIndex = index;
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.style.opacity = '0.4';
}

function handleDragOver(event, targetIndex) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  if (draggedIndex === null || draggedIndex === targetIndex) return;

  // Reordena o array trocando as posições em tempo real
  const itemToMove = selectedExercises.splice(draggedIndex, 1)[0];
  selectedExercises.splice(targetIndex, 0, itemToMove);

  draggedIndex = targetIndex;
  renderSelected();
}

function handleDragEnd(event) {
  draggedIndex = null;
  event.currentTarget.style.opacity = '1';
}

// Atualiza Séries ou Reps diretamente no array selectedExercises sem apagar o item
function updateExerciseInline(index, field, value) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue) || parsedValue <= 0) return;

  selectedExercises[index][field] = parsedValue;
  if (field === 'target_sets') selectedExercises[index].sets = parsedValue;
  if (field === 'target_reps') selectedExercises[index].reps = parsedValue;
}