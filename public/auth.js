
var API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rngymhub.onrender.com';
let registeredEmailPending = '';

function switchAuthTab(tab) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formVerify = document.getElementById('form-verify');
  const tabsContainer = document.getElementById('auth-tabs');
  const feedback = document.getElementById('auth-feedback');

  feedback.innerText = '';
  tabsContainer.classList.remove('hidden');

  document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));

  if (tab === 'login') {
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    formVerify.classList.add('hidden');
    document.querySelectorAll('.auth-tab-btn')[0].classList.add('active');
  } else if (tab === 'register') {
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
    formVerify.classList.add('hidden');
    document.querySelectorAll('.auth-tab-btn')[1].classList.add('active');
  } else if (tab === 'verify') {
    tabsContainer.classList.add('hidden');
    formLogin.classList.add('hidden');
    formRegister.classList.add('hidden');
    formVerify.classList.remove('hidden');
  }
}

function showFeedback(message, type = 'error') {
  const feedback = document.getElementById('auth-feedback');
  feedback.innerText = message;
  feedback.className = `feedback-msg ${type}`;
}

// 1. LOGIN
async function handleLogin(e) {
  e.preventDefault();
  const login = document.getElementById('login-input').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('@RNGymHub:token', data.token);
      localStorage.setItem('@RNGymHub:user', JSON.stringify(data.user));
      showFeedback('Login bem-sucedido! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = 'workouts.html';
      }, 1000);
    } else {
      showFeedback(data.message || 'Erro ao realizar login.');
    }
  } catch (err) {
    showFeedback('Erro de conexão com o servidor.');
  }
}

// 2. SOLICITAR REGISTRO (GERA CÓDIGO)
async function handleRegisterRequest(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  const btnSubmit = document.getElementById('btn-reg-submit');
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Enviando...';

  try {
    const res = await fetch(`${API_URL}/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      registeredEmailPending = email;
      document.getElementById('display-email').innerText = email;
      switchAuthTab('verify');
      showFeedback('Código gerado! (Verifique o seu email)', 'success');
    } else {
      showFeedback(data.message || 'Erro ao solicitar cadastro.');
    }
  } catch (err) {
    showFeedback('Erro de conexão com o servidor.');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Enviar Código de Confirmação';
  }
}

// 3. CONFIRMAR CÓDIGO
async function handleVerifyCode(e) {
  e.preventDefault();
  const code = document.getElementById('verify-code').value.trim();

  try {
    const res = await fetch(`${API_URL}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registeredEmailPending, code })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('@RNGymHub:token', data.token);
      localStorage.setItem('@RNGymHub:user', JSON.stringify(data.user));
      showFeedback('Conta ativada com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = 'workouts.html';
      }, 1200);
    } else {
      showFeedback(data.message || 'Código inválido ou expirado.');
    }
  } catch (err) {
    showFeedback('Erro de conexão com o servidor.');
  }
}