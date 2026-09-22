function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderJobsList(jobs) {
  const listEl = document.getElementById('jobs-list');

  if (!jobs.length) {
    listEl.innerHTML = `<div class="jobs-empty">No open positions right now — check back soon.</div>`;
    return;
  }

  listEl.innerHTML = jobs.map(job => `
    <div class="job-card">
      <div class="job-main">
        <h3>${escapeHtml(job.title)}</h3>
        <div class="job-tags">
          <span class="job-tag">${escapeHtml(job.category)}</span>
          <span class="job-tag muted">${escapeHtml(job.type)}</span>
        </div>
      </div>
      <a class="btn btn-primary" href="Login.html">Apply Now</a>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function loadPublicJobs() {
  fetch('../api/get_jobs.php')
    .then(response => response.json())
    .then(result => {
      const jobs = result.success ? result.data : [];
      renderJobsList(jobs);

      document.getElementById('stat-open-roles').textContent = jobs.length;
      const departments = new Set(jobs.map(j => j.category).filter(Boolean));
      document.getElementById('stat-departments').textContent = departments.size;
    })
    .catch(error => {
      console.error('Error loading open positions:', error);
      document.getElementById('jobs-list').innerHTML = `<div class="jobs-empty">Couldn't load open positions right now. Please try again shortly.</div>`;
    });
}

document.addEventListener('DOMContentLoaded', loadPublicJobs);
