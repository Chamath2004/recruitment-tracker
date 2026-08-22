lucide.createIcons();

function submitHiringManagerLogin() {
  const data = {
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  };

  fetch('../api/login_hiring_manager.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      window.location.href = 'HiringManager.html';
    } else {
      alert(result.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('An error occurred while signing in.');
  });
}
