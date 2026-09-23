var API_URL = 'https://rngymhub.onrender.com';
let registeredEmailPending = localStorage.getItem('@RNGymHub:pendingEmail') || '';

function switchAuthTab(tab) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formVerify = document.getElementById('form-verify');
  const tabsContainer = document.getElementById('auth-tabs');
  const feedback = document.getElementById('auth-feedback');

  if (feedback) feedback.innerText = '';
  if (tabsContainer) tabsContainer.classList.remove('hidden');

  document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));

  if (tab === 'login') {
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
    if (formVerify) formVerify.classList.add('hidden');
    if (document.querySelectorAll('.auth-tab-btn')[0]) {
      document.querySelectorAll('.auth-tab-btn')[0].classList.add('active');
    }
  } else if (tab === 'register') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formRegister) formRegister.classList.remove('hidden');
    if (formVerify) formVerify.classList.add('hidden');
    if (document.querySelectorAll('.auth-tab-btn')[1]) {
      document.querySelectorAll('.auth-tab-btn')[1].classList.add('active');
    }
  } else if (tab === 'verify') {
    if (tabsContainer) tabsContainer.classList.add('hidden');
    if (formLogin) formLogin.classList.add('hidden');
    if (formRegister) formRegister.classList.add('hidden');
    if (formVerify) formVerify.classList.remove('hidden');
    
    // Atualiza a exibição do email
    const displayEmailEl = document.getElementById('display-email');
    if (displayEmailEl && registeredEmailPending) {
      displayEmailEl.innerText = registeredEmailPending;
    }
  }
}

function showFeedback(message, type = 'error') {
  const feedback = document.getElementById('auth-feedback');
  if (feedback) {
    feedback.innerText = message;
    feedback.className = `feedback-msg ${type}`;
  }
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
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Enviando...';
  }

  try {
    const res = await fetch(`${API_URL}/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      registeredEmailPending = email;
      localStorage.setItem('@RNGymHub:pendingEmail', email);
      switchAuthTab('verify');
      showFeedback('Código gerado! (Verifique o seu email)', 'success');
    } else {
      showFeedback(data.message || 'Erro ao solicitar cadastro.');
    }
  } catch (err) {
    showFeedback('Erro de conexão com o servidor.');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Enviar Código de Confirmação';
    }
  }
}

// 3. CONFIRMAR CÓDIGO
async function handleVerifyCode(e) {
  e.preventDefault();
  const code = document.getElementById('verify-code').value.trim();
  const emailToSend = registeredEmailPending || localStorage.getItem('@RNGymHub:pendingEmail');

  if (!emailToSend) {
    showFeedback('E-mail não identificado. Solicite o cadastro novamente.');
    switchAuthTab('register');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailToSend, code })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.removeItem('@RNGymHub:pendingEmail');
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