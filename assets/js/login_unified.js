lucide.createIcons();

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
