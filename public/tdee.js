function calculateTDEE(event) {
  event.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const activity = parseFloat(document.getElementById('activity').value);

  if (!age || !weight || !height) return;

  // 1. Cálculo da Taxa Metabólica Basal (BMR) - Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Gasto Calórico Diário Total (TDEE) e Semanal
  const dailyTDEE = bmr * activity;
  const weeklyTDEE = dailyTDEE * 7;

  // 3. Objetivos
  const cutting = dailyTDEE - 500;
  const maintenance = dailyTDEE;
  const bulking = dailyTDEE + 300;

  // 4. Salvar histórico no localStorage para conveniência do usuário
  localStorage.setItem('user_tdee_data', JSON.stringify({
    gender, age, weight, height, activity
  }));

  // 5. Exibir Resultados Formatados
  document.getElementById('res-bmr').textContent = `${Math.round(bmr).toLocaleString('pt-BR')} kcal/dia`;
  document.getElementById('res-daily-tdee').textContent = `${Math.round(dailyTDEE).toLocaleString('pt-BR')} kcal/dia`;
  document.getElementById('res-weekly-tdee').textContent = `${Math.round(weeklyTDEE).toLocaleString('pt-BR')} kcal/semana`;

  document.getElementById('goal-cutting').textContent = `${Math.round(cutting).toLocaleString('pt-BR')} kcal`;
  document.getElementById('goal-maintenance').textContent = `${Math.round(maintenance).toLocaleString('pt-BR')} kcal`;
  document.getElementById('goal-bulking').textContent = `${Math.round(bulking).toLocaleString('pt-BR')} kcal`;

  document.getElementById('results-placeholder').classList.add('hidden');
  document.getElementById('results-content').classList.remove('hidden');
}

// Carregar dados salvos ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  const savedData = localStorage.getItem('user_tdee_data');
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      document.querySelector(`input[name="gender"][value="${data.gender}"]`).checked = true;
      document.getElementById('age').value = data.age;
      document.getElementById('weight').value = data.weight;
      document.getElementById('height').value = data.height;
      document.getElementById('activity').value = data.activity;
    } catch (e) {
      console.error('Erro ao carregar dados salvos do TDEE:', e);
    }
  }
});