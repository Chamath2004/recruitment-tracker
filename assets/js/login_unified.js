lucide.createIcons();

// ================= VIEW SWITCHING =================

function showLoginView() {
  document.getElementById('login-form-view').style.display = 'block';
  document.getElementById('forgot-password-view').style.display = 'none';
  document.getElementById('reset-password-view').style.display = 'none';
}

function showForgotPasswordView() {
  document.getElementById('login-form-view').style.display = 'none';
  document.getElementById('forgot-password-view').style.display = 'block';
  document.getElementById('reset-password-view').style.display = 'none';
  document.getElementById('forgot-message').innerHTML = '';
}

function showFormMessage(elementId, text, type) {
  document.getElementById(elementId).innerHTML = `<div class="form-message ${type}">${text}</div>`;
}

// ================= LOGIN =================

function submitUnifiedLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  fetch('../api/login_unified.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        window.location.href = result.redirect;
      } else {
        alert(result.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    });
}

// ================= FORGOT PASSWORD =================

function submitForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) {
    showFormMessage('forgot-message', 'Please enter your email address.', 'error');
    return;
  }

  const btn = document.getElementById('forgot-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  fetch('../api/request_password_reset.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
    .then(response => response.json())
    .then(result => {
      showFormMessage('forgot-message', result.message, result.success ? 'success' : 'error');
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    })
    .catch(error => {
      console.error('Error:', error);
      showFormMessage('forgot-message', 'An error occurred. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    });
}

// ================= RESET PASSWORD (via emailed link) =================

let resetToken = null;

function checkForResetToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('reset_token');
  if (!token) return;

  resetToken = token;
  document.getElementById('login-form-view').style.display = 'none';
  document.getElementById('forgot-password-view').style.display = 'none';
  document.getElementById('reset-password-view').style.display = 'block';
}

function submitNewPassword() {
  const password = document.getElementById('reset-password').value;
  const confirm = document.getElementById('reset-password-confirm').value;

  if (password.length < 6) {
    showFormMessage('reset-message', 'Password must be at least 6 characters.', 'error');
    return;
  }
  if (password !== confirm) {
    showFormMessage('reset-message', 'Passwords do not match.', 'error');
    return;
  }

  const btn = document.getElementById('reset-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  fetch('../api/reset_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, password })
  })
    .then(response => response.json())
    .then(result => {
      showFormMessage('reset-message', result.message, result.success ? 'success' : 'error');
      if (result.success) {
        document.getElementById('reset-form-fields').style.display = 'none';
        history.replaceState(null, '', 'Login.html');
      } else {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showFormMessage('reset-message', 'An error occurred. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Update Password';
    });
}

checkForResetToken();
