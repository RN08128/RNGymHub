window.API_URL = window.API_URL || 'http://localhost:3333';
var API_URL = window.API_URL;

let currentTab = 'custom'; // 'custom' ou 'templates'

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

async function loadWorkouts() {
  const listContainer = document.getElementById('workout-list');
  if (!listContainer) return;

  listContainer.innerHTML = '<p style="color: #aaa;">Carregando fichas...</p>';

  try {
    const response = await fetch(`${API_URL}/workouts`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      window.location.href = 'index.html';
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const workouts = await response.json();

    // Filtra as fichas de acordo com a aba selecionada
    const filteredWorkouts = workouts.filter(w => {
      if (currentTab === 'templates') {
        return w.is_template === true;
      }
      return !w.is_template; // Fichas do usuário
    });

    if (filteredWorkouts.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #1e1e1e; border-radius: 8px;">
          <p style="color: #888; margin-bottom: 12px;">Nenhuma ficha encontrada nesta categoria.</p>
          ${currentTab === 'custom' ? '<a href="create-workout.html" style="color: #007bff; text-decoration: none; font-weight: bold;">+ Criar sua primeira ficha</a>' : ''}
        </div>
      `;
      return;
    }

    // Renderiza os cards das fichas
    listContainer.innerHTML = filteredWorkouts.map(w => `
      <div class="workout-card">
        <div class="workout-card-header">
          <div>
            <h3>${w.name}</h3>
            <p class="workout-desc">
              ${w.description ? w.description : '<em>Sem descrição</em>'}
            </p>
          </div>
          ${!w.is_template ? `
            <button type="button" class="btn-delete-workout" onclick="deleteWorkout('${w.id}', '${w.name.replace(/'/g, "\\'")}')" title="Deletar ficha">
              🗑️
            </button>
          ` : ''}
        </div>
        <button class="btn-start" onclick="startWorkout('${w.id}')">Iniciar Treino</button>
      </div>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar fichas:', err);
    listContainer.innerHTML = '<p style="color: #ff4d4d;">Erro ao carregar fichas. Verifique se o servidor backend está rodando.</p>';
  }
}

// Função para deletar a ficha no backend
async function deleteWorkout(workoutId, workoutName) {
  const confirmDelete = confirm(`Tem certeza que deseja deletar a ficha "${workoutName}"?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_URL}/workouts/${workoutId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ workoutId }) // Envia o ID da ficha no corpo da requisição
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

function switchTab(tab, event) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = event ? event.target : window.event?.target;
  if (activeBtn) activeBtn.classList.add('active');

  loadWorkouts();
}

function startWorkout(workoutId) {
  window.location.href = `active-workout.html?id=${workoutId}`;
}

// Executa ao carregar a página
document.addEventListener('DOMContentLoaded', loadWorkouts);