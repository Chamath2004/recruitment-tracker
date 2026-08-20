lucide.createIcons();

function goToStep(step) {
  const s1 = document.getElementById('stepper-1');
  const s2 = document.getElementById('stepper-2');
  const div1 = document.getElementById('divider-1');
  const icon1 = document.getElementById('step-icon-1');

  if (step === 2) {
    document.getElementById('step-1-content').style.display = 'none';
    document.getElementById('step-2-content').style.display = 'block';
    
    s1.className = 'step completed';
    icon1.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i>';
    
    s2.className = 'step active';
    div1.style.background = '#0f9d58';
  } else if (step === 1) {
    document.getElementById('step-1-content').style.display = 'block';
    document.getElementById('step-2-content').style.display = 'none';
    
    s1.className = 'step active';
    icon1.innerHTML = '1';
    
    s2.className = 'step';
    div1.style.background = '#e5e7eb';
  }
  lucide.createIcons();
}

function submitRegistration() {
  const data = {
    first_name: document.getElementById('reg-fname').value,
    last_name: document.getElementById('reg-lname').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
    phone: document.getElementById('reg-phone').value,
    location: document.getElementById('reg-location').value,
    linkedin: document.getElementById('reg-linkedin').value,
    headline: document.getElementById('reg-headline').value
  };

  fetch('../api/register_candidate.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      window.location.href = 'Candidate.html';
    } else {
      alert(result.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('An error occurred while creating the account.');
  });
}