window.API_URL = window.API_URL || 'http://localhost:3333';
var API_URL = window.API_URL;

let currentTab = 'custom'; // 'custom', 'templates' ou 'routines'

// Função auxiliar para recuperar o token formatado corretamente
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

// Carrega os dados correspondentes à aba ativa
async function loadWorkouts() {
  const listContainer = document.getElementById('workout-list');
  if (!listContainer) return;

  listContainer.innerHTML = '<p style="color: #aaa;">Carregando dados...</p>';

  try {
    if (currentTab === 'routines') {
      await loadRoutines(listContainer);
    } else if (currentTab === 'templates') {
      await loadWorkoutTemplates(listContainer);
    } else {
      await loadUserWorkouts(listContainer);
    }
  } catch (err) {
    console.error('Erro ao carregar lista:', err);
    listContainer.innerHTML = '<p style="color: #ff4d4d;">Erro ao carregar os dados. Verifique se o servidor backend está rodando.</p>';
  }
}

// 1. Aba "Minhas Fichas"
async function loadUserWorkouts(container) {
  const response = await fetch(`${API_URL}/workouts`, {
    headers: getAuthHeaders()
  });

  if (response.status === 401) {
    alert('Sessão expirada. Por favor, faça login novamente.');
    window.location.href = 'index.html';
    return;
  }

  if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

  const workouts = await response.json();

  if (workouts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #1e1e1e; border-radius: 8px;">
        <p style="color: #888; margin-bottom: 12px;">Você ainda não possui fichas de treino.</p>
        <a href="create-workout.html" style="color: #007bff; text-decoration: none; font-weight: bold;">+ Criar sua primeira ficha</a>
      </div>
    `;
    return;
  }

  container.innerHTML = workouts.map(w => `
    <div class="workout-card">
      <div class="workout-card-header">
        <div>
          <h3>${w.name}</h3>
          <p class="workout-desc">
            ${w.description ? w.description : '<em>Sem descrição</em>'}
          </p>
        </div>
        <div class="workout-card-actions">
          <button type="button" class="btn-edit-workout" onclick="editWorkout('${w.id}')" title="Editar ficha">
            ✏️
          </button>
          <button type="button" class="btn-delete-workout" onclick="deleteWorkout('${w.id}', '${w.name.replace(/'/g, "\\'")}')" title="Deletar ficha">
            🗑️
          </button>
        </div>
      </div>
      <button class="btn-start" onclick="startWorkout('${w.id}')">Iniciar Treino</button>
    </div>
  `).join('');
}

// 2. Aba "Treinos Prontos"
async function loadWorkoutTemplates(container) {
  const response = await fetch(`${API_URL}/workouts/templates`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

  const templates = await response.json();

  if (templates.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #1e1e1e; border-radius: 8px;">
        <p style="color: #888;">Nenhum treino pronto disponível no momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = templates.map(t => `
    <div class="workout-card">
      <div class="workout-card-header">
        <div>
          <h3>${t.name}</h3>
          <p class="workout-desc">
            ${t.description ? t.description : '<em>Sem descrição</em>'}
          </p>
        </div>
      </div>
      <button class="btn-copy" onclick="copyWorkoutTemplate('${t.id}', '${t.name.replace(/'/g, "\\'")}')">
        📋 Copiar para Minhas Fichas
      </button>
    </div>
  `).join('');
}

// 3. Aba "Divisões Prontas"
async function loadRoutines(container) {
  const response = await fetch(`${API_URL}/routines/templates`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

  const routines = await response.json();

  if (routines.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #1e1e1e; border-radius: 8px;">
        <p style="color: #888;">Nenhuma divisão pronta encontrada.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = routines.map(r => `
    <div class="workout-card">
      <div class="workout-card-header">
        <div>
          <h3>${r.name}</h3>
          <span class="badge-category">${r.category}</span>
          <p class="workout-desc" style="margin-top: 8px;">
            ${r.description}
          </p>
        </div>
      </div>
      <button class="btn-copy" onclick="copyRoutineTemplate('${r.id}', '${r.name.replace(/'/g, "\\'")}')">
        ➕ Adicionar Divisão Completa
      </button>
    </div>
  `).join('');
}

// Copiar treino individual
async function copyWorkoutTemplate(templateId, templateName) {
  try {
    const res = await fetch(`${API_URL}/workouts/templates/${templateId}/copy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });

    const data = await res.json();

    if (res.ok) {
      alert(`Treino "${templateName}" adicionado às suas fichas com sucesso!`);
      // Alterna explicitamente para 'custom' e força o recarregamento
      switchTab('custom');
    } else {
      alert(data.message || 'Erro ao copiar treino.');
    }
  } catch (err) {
    console.error('Erro ao copiar treino:', err);
    alert('Erro de conexão ao tentar copiar o treino.');
  }
}

// Copiar divisão completa
async function copyRoutineTemplate(routineId, routineName) {
  try {
    const res = await fetch(`${API_URL}/routines/templates/${routineId}/copy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });

    const data = await res.json();

    if (res.ok) {
      alert(`Divisão "${routineName}" adicionada à sua conta! As fichas estão em "Minhas Fichas".`);
      // Alterna explicitamente para 'custom' e força o recarregamento
      switchTab('custom');
    } else {
      alert(data.message || 'Erro ao adicionar divisão.');
    }
  } catch (err) {
    console.error('Erro ao copiar divisão:', err);
    alert('Erro de conexão ao tentar adicionar a divisão.');
  }
}

  // Identifica o botão correto pelo onclick ou pela ordem das abas
  if (currentTab === 'custom') {
    buttons[0]?.classList.add('active');
  } else if (currentTab === 'templates') {
    buttons[1]?.classList.add('active');
  } else if (currentTab === 'routines') {
    buttons[2]?.classList.add('active');
  }
}

// Redireciona para edição
function editWorkout(workoutId) {
  window.location.href = `create-workout.html?id=${workoutId}`;
}

// Deleta ficha do usuário
async function deleteWorkout(workoutId, workoutName) {
  const confirmDelete = confirm(`Tem certeza que deseja deletar a ficha "${workoutName}"?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_URL}/workouts/${workoutId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });

    if (res.ok) {
      alert('Ficha deletada com sucesso!');
      await loadWorkouts();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Erro ao deletar ficha.');
    }
  } catch (error) {
    console.error('Erro ao deletar ficha:', error);
    alert('Erro de conexão ao tentar deletar a ficha.');
  }
}

// Troca de abas
function switchTab(tab, event) {
  currentTab = tab;
  updateTabButtonsUI();
  loadWorkouts();
}

// Atualiza o visual dos botões de aba
function updateTabButtonsUI() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (
      (currentTab === 'custom' && btn.innerText.includes('Minhas Fichas')) ||
      (currentTab === 'templates' && btn.innerText.includes('Treinos Prontos')) ||
      (currentTab === 'routines' && btn.innerText.includes('Divisões Prontas'))
    ) {
      btn.classList.add('active');
    }
  });
}

function startWorkout(workoutId) {
  window.location.href = `active-workout.html?id=${workoutId}`;
}

// Executa ao carregar a página
document.addEventListener('DOMContentLoaded', loadWorkouts);