lucide.createIcons();

function getInitials(name) {
  return (name || "")
    .split(" ")
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ================= SESSION / PROFILE =================

let currentHrAdmin = null;

function loadHrProfile() {
  fetch('../api/get_hr_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'HR_login.html';
        return;
      }
      const a = result.data;
      currentHrAdmin = a;
      const fullName = `${a.first_name} ${a.last_name}`.trim();
      document.getElementById('sidebar-avatar').textContent = getInitials(fullName) || "?";
      document.getElementById('sidebar-name').textContent = fullName;
      document.getElementById('sidebar-email').textContent = a.email;

      const accessNav = document.getElementById('nav-access');
      if (a.role === 'admin') {
        accessNav.style.display = '';
      }
    })
    .catch(error => console.error('Error loading HR profile:', error));
}

loadHrProfile();

// ================= VIEW SWITCHING =================

function switchHrView(navEl, view, label) {
  document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));
  navEl.classList.add('active');

  document.getElementById('overview-view').style.display = view === 'overview' ? 'block' : 'none';
  document.getElementById('vacancies-view').style.display = view === 'vacancies' ? 'block' : 'none';
  document.getElementById('manage-candidates-view').style.display = view === 'manage-candidates' ? 'block' : 'none';
  document.getElementById('workflows-view').style.display = view === 'workflows' ? 'block' : 'none';
  document.getElementById('interviews-view').style.display = view === 'interviews' ? 'block' : 'none';
  document.getElementById('access-view').style.display = view === 'access' ? 'block' : 'none';
  document.getElementById('feedback-view').style.display = view === 'feedback' ? 'block' : 'none';
  document.getElementById('settings-view').style.display = view === 'settings' ? 'block' : 'none';
  document.getElementById('placeholder-view').style.display = view === 'placeholder' ? 'block' : 'none';

  if (view === 'placeholder') {
    document.getElementById('placeholder-title').textContent = label;
  } else if (view === 'vacancies') {
    loadVacancies();
  } else if (view === 'manage-candidates') {
    loadManageCandidates();
  } else if (view === 'workflows') {
    loadHiringWorkflows();
  } else if (view === 'interviews') {
    loadInterviews();
  } else if (view === 'access') {
    loadHrAdmins();
  } else if (view === 'feedback') {
    loadFeedback();
  } else if (view === 'settings') {
    loadSettingsView();
  }
}

// ================= DASHBOARD DATA =================

function renderMetrics(totalApplications, activeVacancyCount, scheduledInterviewCount) {
  const metrics = [
    { icon: 'briefcase', color: 'blue', value: activeVacancyCount, label: 'Active Vacancies', change: `${activeVacancyCount} open role${activeVacancyCount === 1 ? '' : 's'}`, neutral: true },
    { icon: 'users', color: 'green', value: totalApplications, label: 'Total Applications', change: totalApplications > 0 ? `${totalApplications} received` : 'No applications yet', neutral: totalApplications === 0 },
    { icon: 'calendar', color: 'purple', value: scheduledInterviewCount, label: 'Interviews Scheduled', change: scheduledInterviewCount > 0 ? `${scheduledInterviewCount} upcoming` : 'None scheduled', neutral: scheduledInterviewCount === 0 },
    { icon: 'clock', color: 'amber', value: '—', label: 'Avg. Time to Hire', change: 'Coming soon', neutral: true }
  ];

  document.getElementById('metric-grid').innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-top">
        <div class="metric-icon ${m.color}">
          <i data-lucide="${m.icon}"></i>
        </div>
        ${!m.neutral ? '<i data-lucide="trending-up" class="metric-trend"></i>' : ''}
      </div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-label">${m.label}</div>
      <div class="metric-change ${m.neutral ? 'neutral' : ''}">${m.change}</div>
    </div>
  `).join('');
}

function stagePillClass(status) {
  const map = {
    submitted: 'submitted',
    'in-review': 'in-review',
    interview: 'interview',
    offer: 'offer',
    hired: 'hired',
    rejected: 'rejected'
  };
  return map[status] || 'submitted';
}

function stageLabel(status) {
  const map = {
    submitted: 'Submitted',
    'in-review': 'In Review',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected'
  };
  return map[status] || status;
}

function renderRecentApplicants(applicants) {
  const container = document.getElementById('recent-applicants-list');

  if (applicants.length === 0) {
    container.innerHTML = `<div class="panel-empty">No applications yet.</div>`;
    return;
  }

  container.innerHTML = applicants.map(app => {
    const name = app.full_name && app.full_name.trim() ? app.full_name : (app.email || 'Unknown applicant');
    return `
      <div class="panel-row">
        <div class="panel-row-avatar">${getInitials(name) || "?"}</div>
        <div class="panel-row-body">
          <div class="panel-row-title">${name}</div>
          <div class="panel-row-subtitle">${app.job_title}</div>
        </div>
        <span class="stage-pill ${stagePillClass(app.status)}">${stageLabel(app.status)}</span>
      </div>
    `;
  }).join('');
}

function renderVacanciesTable(activeVacancies) {
  const tbody = document.getElementById('vacancies-table-body');

  if (activeVacancies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="panel-empty">No active vacancies.</td></tr>`;
    return;
  }

  tbody.innerHTML = activeVacancies.map(v => `
    <tr>
      <td>
        ${v.title}
        <div class="cell-sub">${v.salary || ''}</div>
      </td>
      <td>${v.department}</td>
      <td>${v.applicants}</td>
      <td><span class="active-pill">Active</span></td>
    </tr>
  `).join('');
}

function formatInterviewDateTime(date, time) {
  const d = new Date(`${date}T${time}`);
  if (isNaN(d.getTime())) return `${date} ${time}`;
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

function renderUpcomingInterviews(interviews) {
  const container = document.getElementById('upcoming-interviews-list');

  if (!interviews || interviews.length === 0) {
    container.innerHTML = `<div class="panel-empty">No interviews scheduled yet.</div>`;
    return;
  }

  container.innerHTML = interviews.map(iv => `
    <div class="panel-row">
      <div class="panel-row-avatar">${getInitials(iv.candidate_name) || "?"}</div>
      <div class="panel-row-body">
        <div class="panel-row-title">${iv.candidate_name}</div>
        <div class="panel-row-subtitle">${iv.job_title} · ${iv.interview_type}</div>
      </div>
      <span class="stage-pill interview">${formatInterviewDateTime(iv.interview_date, iv.interview_time)}</span>
    </div>
  `).join('');
}

function loadHrDashboardStats() {
  fetch('../api/get_hr_dashboard_stats.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;

      renderMetrics(result.total_applications, result.active_vacancies.length, result.scheduled_interview_count);
      renderRecentApplicants(result.recent_applicants);
      renderVacanciesTable(result.active_vacancies);
      renderUpcomingInterviews(result.upcoming_interviews);
      lucide.createIcons();
    })
    .catch(error => console.error('Error loading dashboard stats:', error));
}

loadHrDashboardStats();

// ================= VACANCY MANAGEMENT =================

let vacancyList = [];
let vacancyFilter = 'all';

function loadVacancies() {
  fetch('../api/get_vacancies.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      vacancyList = result.data;
      renderVacancyGrid();
      renderVacancyWorkflowsList();
    })
    .catch(error => console.error('Error loading vacancies:', error));
}

function setVacancyFilter(status) {
  vacancyFilter = status;
  document.querySelectorAll('#vacancy-filter-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderVacancyGrid();
}

function renderVacancyGrid() {
  const searchTerm = document.getElementById('vacancy-search-input').value.toLowerCase();

  const filtered = vacancyList.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchTerm) || v.department.toLowerCase().includes(searchTerm);
    const matchesFilter = vacancyFilter === 'all' || v.status === vacancyFilter;
    return matchesSearch && matchesFilter;
  });

  const grid = document.getElementById('vacancy-grid');

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="vacancy-empty">No vacancies match your search.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(v => `
    <div class="vacancy-card">
      <div class="vacancy-card-top">
        <span class="vacancy-status-pill ${v.status}">${v.status}</span>
        <div class="vacancy-card-actions">
          <button title="Edit" onclick="openVacancyModal(${v.id})"><i data-lucide="edit-3"></i></button>
          <button title="${v.status === 'active' ? 'Close' : 'Reopen'}" onclick="confirmToggleVacancyStatus(${v.id})"><i data-lucide="archive"></i></button>
        </div>
      </div>
      <h3>${v.title}</h3>
      <p class="dept">${v.department}</p>
      <div class="vacancy-meta-row">
        <span><i data-lucide="dollar-sign"></i>${v.salary || '—'}</span>
        <span><i data-lucide="clock"></i>${v.type}</span>
      </div>
      <div class="vacancy-card-footer">
        <span>${v.applicants} applicant${v.applicants === 1 ? '' : 's'}</span>
        <span>Posted ${v.created_at.split(' ')[0]}</span>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

function confirmToggleVacancyStatus(id) {
  const vacancy = vacancyList.find(v => v.id === id);
  if (!vacancy) return;

  const actionLabel = vacancy.status === 'active' ? 'Close' : 'Reopen';

  const modalHtml = `
    <div class="modal-overlay" id="confirm-modal-overlay" onclick="if(event.target===this) closeConfirmModal()">
      <div class="modal-dialog confirm-modal-dialog">
        <div class="modal-header">
          <h2>${actionLabel} Vacancy</h2>
          <button class="modal-close-btn" onclick="closeConfirmModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">Are you sure you want to ${actionLabel.toLowerCase()} <strong>${vacancy.title}</strong>?</p>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeConfirmModal()">Cancel</button>
          <button class="modal-save-btn" onclick="runToggleVacancyStatus(${id})">${actionLabel}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function closeConfirmModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function runToggleVacancyStatus(id) {
  fetch('../api/toggle_vacancy_status.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(() => {
      closeConfirmModal();
      loadVacancies();
    })
    .catch(error => console.error('Error toggling vacancy status:', error));
}

function openVacancyModal(id) {
  const vacancy = id ? vacancyList.find(v => v.id === id) : null;

  const modalHtml = `
    <div class="modal-overlay" id="vacancy-modal-overlay" onclick="if(event.target===this) closeVacancyModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${vacancy ? 'Edit Vacancy' : 'Create New Vacancy'}</h2>
          <button class="modal-close-btn" onclick="closeVacancyModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Job Title *</label>
            <input type="text" id="vf-title" value="${vacancy ? vacancy.title : ''}" placeholder="e.g., Senior Frontend Engineer">
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Department</label>
              <input type="text" id="vf-department" value="${vacancy ? vacancy.department : ''}" placeholder="Engineering">
            </div>
            <div class="form-group">
              <label>Type</label>
              <select id="vf-type">
                ${["Full-time", "Part-time", "Contract", "Internship"].map(t =>
                  `<option ${vacancy && vacancy.type === t ? 'selected' : ''}>${t}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Salary Range</label>
            <input type="text" id="vf-salary" value="${vacancy ? vacancy.salary : ''}" placeholder="$100k - $150k">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="vf-description" rows="3" placeholder="Job description...">${vacancy ? vacancy.description : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Requirements (comma-separated)</label>
            <textarea id="vf-requirements" rows="2" placeholder="React, TypeScript, 3+ years experience">${vacancy ? vacancy.requirements : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Pipeline Stages (comma-separated)</label>
            <input type="text" id="vf-stages" value="${vacancy ? vacancy.pipeline_stages : getDefaultStages().join(', ')}">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="vf-status">
              <option value="active" ${!vacancy || vacancy.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="draft" ${vacancy && vacancy.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="closed" ${vacancy && vacancy.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeVacancyModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveVacancy(${vacancy ? vacancy.id : 'null'})">${vacancy ? 'Update Vacancy' : 'Create Vacancy'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function closeVacancyModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveVacancy(id) {
  const payload = {
    id: id || 0,
    title: document.getElementById('vf-title').value.trim(),
    department: document.getElementById('vf-department').value.trim(),
    type: document.getElementById('vf-type').value,
    salary: document.getElementById('vf-salary').value.trim(),
    description: document.getElementById('vf-description').value.trim(),
    requirements: document.getElementById('vf-requirements').value.trim(),
    pipeline_stages: document.getElementById('vf-stages').value.trim(),
    status: document.getElementById('vf-status').value
  };

  if (!payload.title) {
    alert('Job title is required.');
    return;
  }

  fetch('../api/save_vacancy.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save vacancy.');
        return;
      }
      closeVacancyModal();
      loadVacancies();
    })
    .catch(error => console.error('Error saving vacancy:', error));
}

// ================= MANAGE CANDIDATES =================

let manageCandidatesList = [];
let candidateFilter = 'all';

function loadManageCandidates() {
  fetch('../api/get_manage_candidates.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      manageCandidatesList = result.data;
      renderManageCandidatesTable();
    })
    .catch(error => console.error('Error loading candidates:', error));
}

function setCandidateFilter(filter) {
  candidateFilter = filter;
  document.querySelectorAll('#candidate-filter-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderManageCandidatesTable();
}

function renderManageCandidatesTable() {
  const tbody = document.getElementById('manage-candidates-table-body');
  const searchTerm = document.getElementById('candidate-search-input').value.toLowerCase();

  const filtered = manageCandidatesList.filter(c => {
    const matchesSearch = !searchTerm ||
      (c.full_name || '').toLowerCase().includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm) ||
      (c.job_title || '').toLowerCase().includes(searchTerm);

    const matchesFilter =
      candidateFilter === 'all' ? true :
      candidateFilter === 'shortlisted' ? c.shortlisted :
      candidateFilter === 'rejected' ? c.status === 'rejected' :
      candidateFilter === 'pending' ? (!c.shortlisted && c.status !== 'rejected') :
      true;

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="panel-empty">No candidates match this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const name = c.full_name && c.full_name.trim() ? c.full_name : c.email;
    const isRejected = c.status === 'rejected';

    return `
      <tr>
        <td>
          ${name}
          <div class="cell-sub">${c.email}</div>
        </td>
        <td>${c.job_title}</td>
        <td>${(c.created_at || '').split(' ')[0]}</td>
        <td><span class="stage-pill ${stagePillClass(c.status)}">${stageLabel(c.status)}</span></td>
        <td><span class="stage-pill ${c.shortlisted ? 'hired' : 'submitted'}">${c.shortlisted ? 'Shortlisted' : 'Not shortlisted'}</span></td>
        <td>
          <div class="candidate-actions">
            ${c.resume_name ? `<a class="candidate-action-btn" href="../api/download_resume.php?application_id=${c.id}&mode=view" target="_blank" rel="noopener noreferrer">Resume</a>` : ''}
            ${c.shortlisted
              ? `<button class="candidate-action-btn" onclick="reviewCandidate(${c.id}, 'unshortlist')">Un-shortlist</button>`
              : `<button class="candidate-action-btn shortlist" onclick="reviewCandidate(${c.id}, 'shortlist')" ${isRejected ? 'disabled' : ''}>Shortlist</button>`}
            ${!isRejected ? `<button class="candidate-action-btn reject" onclick="reviewCandidate(${c.id}, 'reject')">Reject</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function reviewCandidate(applicationId, action) {
  fetch('../api/update_candidate_review.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: applicationId, action: action })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to update candidate.');
        return;
      }
      loadManageCandidates();
    })
    .catch(error => console.error('Error updating candidate:', error));
}

// ================= HIRING WORKFLOWS =================

const DEFAULT_STAGES_KEY = 'hr_default_pipeline_stages';
const AUTOMATION_SETTINGS_KEY = 'hr_automation_settings';

const fallbackDefaultStages = ['Applied', 'Screening', 'Technical Interview', 'Culture Fit', 'Final Offer'];

const automationSettingsConfig = [
  { key: 'autoEmail', title: 'Auto-send stage transition emails', desc: 'Notify candidates when they move to a new stage' },
  { key: 'meetLinks', title: 'Generate interview meeting links', desc: 'Auto-create Google Meet links when scheduling interviews' },
  { key: 'reminders', title: 'Send interview reminders', desc: 'Remind candidates and interviewers 24h and 1h before' }
];

function getDefaultStages() {
  try {
    const stored = JSON.parse(localStorage.getItem(DEFAULT_STAGES_KEY));
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch (e) { /* fall through to default */ }
  return [...fallbackDefaultStages];
}

function saveDefaultStages(stages) {
  localStorage.setItem(DEFAULT_STAGES_KEY, JSON.stringify(stages));
}

function getAutomationSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTOMATION_SETTINGS_KEY));
    if (stored && typeof stored === 'object') return stored;
  } catch (e) { /* fall through to default */ }
  return { autoEmail: true, meetLinks: true, reminders: true };
}

function saveAutomationSettings(settings) {
  localStorage.setItem(AUTOMATION_SETTINGS_KEY, JSON.stringify(settings));
}

function inferStageType(name) {
  const n = name.toLowerCase();
  if (n.includes('applied')) return 'application';
  if (n.includes('screen')) return 'screening';
  if (n.includes('interview') || n.includes('culture')) return 'interview';
  if (n.includes('assess') || n.includes('test') || n.includes('task')) return 'assessment';
  if (n.includes('offer')) return 'offer';
  return 'custom';
}

function loadHiringWorkflows() {
  renderStageList();
  renderAutomationList();
  loadVacancies();
}

let editingStageIndex = null;

function renderStageList() {
  const stages = getDefaultStages();
  const container = document.getElementById('stage-list');

  container.innerHTML = stages.map((name, index) => {
    const isEditing = editingStageIndex === index;
    return `
      <div class="stage-row">
        <span class="stage-index">${index + 1}</span>
        ${isEditing ? `
          <input type="text" class="stage-edit-input" id="stage-edit-input" value="${name}"
            onkeydown="if(event.key==='Enter') saveStageRename(${index}); if(event.key==='Escape') cancelStageRename();">
        ` : `
          <span class="stage-name">${name}</span>
          <span class="stage-type-badge ${inferStageType(name)}">${inferStageType(name)}</span>
        `}
        <div class="stage-row-actions">
          ${isEditing ? `
            <button title="Save" onclick="saveStageRename(${index})"><i data-lucide="check"></i></button>
            <button title="Cancel" onclick="cancelStageRename()"><i data-lucide="x"></i></button>
          ` : `
            <button title="Move up" ${index === 0 ? 'disabled' : ''} onclick="moveStage(${index}, -1)"><i data-lucide="chevron-up"></i></button>
            <button title="Move down" ${index === stages.length - 1 ? 'disabled' : ''} onclick="moveStage(${index}, 1)"><i data-lucide="chevron-down"></i></button>
            <button title="Rename" onclick="startRenameStage(${index})"><i data-lucide="edit-3"></i></button>
            ${stages.length > 2 ? `<button title="Remove" onclick="removeStage(${index})"><i data-lucide="trash-2"></i></button>` : ''}
          `}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();

  if (editingStageIndex !== null) {
    const input = document.getElementById('stage-edit-input');
    if (input) { input.focus(); input.select(); }
  }
}

function startRenameStage(index) {
  editingStageIndex = index;
  renderStageList();
}

function cancelStageRename() {
  editingStageIndex = null;
  renderStageList();
}

function saveStageRename(index) {
  const input = document.getElementById('stage-edit-input');
  const value = input.value.trim();
  if (!value) return;
  const stages = getDefaultStages();
  stages[index] = value;
  saveDefaultStages(stages);
  editingStageIndex = null;
  renderStageList();
}

function addStage() {
  const input = document.getElementById('new-stage-input');
  const name = input.value.trim();
  if (!name) return;

  const stages = getDefaultStages();
  stages.push(name);
  saveDefaultStages(stages);
  input.value = '';
  renderStageList();
}

function removeStage(index) {
  const stages = getDefaultStages();
  if (stages.length <= 2) return;
  stages.splice(index, 1);
  saveDefaultStages(stages);
  renderStageList();
}

function moveStage(index, direction) {
  const stages = getDefaultStages();
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= stages.length) return;
  [stages[index], stages[newIndex]] = [stages[newIndex], stages[index]];
  saveDefaultStages(stages);
  renderStageList();
}

function renderAutomationList() {
  const settings = getAutomationSettings();
  const container = document.getElementById('automation-list');

  container.innerHTML = automationSettingsConfig.map(item => `
    <div class="automation-row">
      <div>
        <p class="automation-title">${item.title}</p>
        <p class="automation-desc">${item.desc}</p>
      </div>
      <button class="toggle-switch ${settings[item.key] ? 'on' : ''}" onclick="toggleAutomationSetting('${item.key}')">
        <span class="toggle-knob"></span>
      </button>
    </div>
  `).join('');
}

function toggleAutomationSetting(key) {
  const settings = getAutomationSettings();
  settings[key] = !settings[key];
  saveAutomationSettings(settings);
  renderAutomationList();
}

function renderVacancyWorkflowsList() {
  const container = document.getElementById('workflow-vacancy-list');
  if (!container) return;

  const active = vacancyList.filter(v => v.status === 'active');

  if (active.length === 0) {
    container.innerHTML = `<div class="panel-empty">No active vacancies yet.</div>`;
    return;
  }

  container.innerHTML = active.map(v => {
    const stages = (v.pipeline_stages || '').split(',').map(s => s.trim()).filter(Boolean);
    return `
      <div class="workflow-vacancy-card">
        <div class="workflow-vacancy-card-top">
          <div>
            <p class="workflow-vacancy-title">${v.title}</p>
            <p class="workflow-vacancy-dept">${v.department}</p>
          </div>
          <button class="customize-btn" onclick="openVacancyModal(${v.id})">Customize</button>
        </div>
        <div class="workflow-stage-pills">
          ${stages.map((s, i) => `
            <span class="workflow-stage-pill">${s}</span>
            ${i < stages.length - 1 ? '<i data-lucide="arrow-right"></i>' : ''}
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ================= INTERVIEW SETUP =================

let interviewList = [];
let applicationPickerList = [];
let interviewerOptionsList = [];
let interviewFilter = 'all';

const interviewTypeSuggestions = ['Phone Screen', 'Technical Interview', 'Panel Interview', 'Culture Fit', 'Final Interview'];

function loadInterviews() {
  Promise.all([
    fetch('../api/get_interviews.php').then(r => r.json()),
    fetch('../api/get_applications_hr.php').then(r => r.json()),
    fetch('../api/get_interviewer_options.php').then(r => r.json())
  ]).then(([interviewsResult, applicationsResult, optionsResult]) => {
    if (interviewsResult.success) interviewList = interviewsResult.data;
    if (applicationsResult.success) applicationPickerList = applicationsResult.data;
    if (optionsResult.success) interviewerOptionsList = optionsResult.data;
    renderInterviewList();
  }).catch(error => console.error('Error loading interviews:', error));

  loadGoogleStatus();
}

// ================= GOOGLE CALENDAR CONNECTION =================

function loadGoogleStatus() {
  fetch('../api/get_google_status.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      renderGoogleStatusBar(result.connected, result.email);
    })
    .catch(error => console.error('Error loading Google status:', error));
}

function renderGoogleStatusBar(connected, email) {
  const bar = document.getElementById('google-status-bar');
  if (!bar) return;

  bar.className = `google-status-bar ${connected ? 'connected' : 'disconnected'}`;

  if (connected) {
    bar.innerHTML = `
      <div class="google-status-bar-info"><i data-lucide="check-circle"></i> Google Calendar connected — ${email}</div>
      <button class="google-disconnect-btn" onclick="disconnectGoogleCalendar()">Disconnect</button>
    `;
  } else {
    bar.innerHTML = `
      <div class="google-status-bar-info"><i data-lucide="alert-circle"></i> Connect Google Calendar to auto-generate Meet links</div>
      <button class="google-connect-btn" onclick="window.location.href='../api/google_oauth_start.php'">Connect Google Calendar</button>
    `;
  }

  lucide.createIcons();
}

function disconnectGoogleCalendar() {
  fetch('../api/google_disconnect.php', { method: 'POST' })
    .then(response => response.json())
    .then(() => loadGoogleStatus())
    .catch(error => console.error('Error disconnecting Google Calendar:', error));
}

(function handleGoogleOauthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('google');
  if (!status) return;

  if (status === 'connected') {
    switchHrView(document.getElementById('nav-interviews'), 'interviews', 'Interview Setup');
  } else if (status === 'error') {
    alert('Could not connect Google Calendar. Please try again.');
  }

  params.delete('google');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
  window.history.replaceState({}, '', newUrl);
})();

function setInterviewFilter(status) {
  interviewFilter = status;
  document.querySelectorAll('#interview-filter-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderInterviewList();
}

function interviewModeLabel(mode) {
  const map = { video: 'Video Call', phone: 'Phone', onsite: 'Onsite' };
  return map[mode] || mode;
}

function interviewStatusPillClass(status) {
  const map = { scheduled: 'interview', completed: 'offer', cancelled: 'rejected' };
  return map[status] || 'submitted';
}

function renderInterviewList() {
  const searchTerm = (document.getElementById('interview-search-input')?.value || '').toLowerCase();
  const tbody = document.getElementById('interviews-table-body');
  if (!tbody) return;

  const filtered = interviewList.filter(iv => {
    const matchesSearch = iv.candidate_name.toLowerCase().includes(searchTerm) || iv.job_title.toLowerCase().includes(searchTerm);
    const matchesFilter = interviewFilter === 'all' || iv.status === interviewFilter;
    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="panel-empty">No interviews match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(iv => `
    <tr>
      <td>${iv.candidate_name}</td>
      <td>${iv.job_title}</td>
      <td>${iv.interview_type}</td>
      <td>${formatInterviewDateTime(iv.interview_date, iv.interview_time)}<div class="cell-sub">${iv.duration_minutes} min</div></td>
      <td>${iv.interviewer || '—'}</td>
      <td>
        ${interviewModeLabel(iv.mode)}
        ${iv.mode === 'video' && /^https?:\/\//i.test(iv.meeting_link || '') ? `
          <div>
            <a class="meet-link-btn" href="${iv.meeting_link}" target="_blank" rel="noopener noreferrer">
              <i data-lucide="video"></i> Meet
            </a>
          </div>
        ` : ''}
      </td>
      <td><span class="stage-pill ${interviewStatusPillClass(iv.status)}">${iv.status.charAt(0).toUpperCase() + iv.status.slice(1)}</span></td>
      <td>
        <div class="vacancy-card-actions">
          ${iv.status === 'scheduled' ? `
            <button title="Edit" onclick="openInterviewModal(${iv.id})"><i data-lucide="edit-3"></i></button>
            <button title="Mark completed" onclick="markInterviewCompleted(${iv.id})"><i data-lucide="check"></i></button>
            <button title="Cancel" onclick="confirmCancelInterview(${iv.id})"><i data-lucide="x"></i></button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function openInterviewModal(id) {
  const interview = id ? interviewList.find(iv => iv.id === id) : null;

  const candidateFieldHtml = interview ? `
    <div class="form-group">
      <label>Candidate</label>
      <input type="text" value="${interview.candidate_name} — ${interview.job_title}" disabled>
    </div>
  ` : `
    <div class="form-group">
      <label>Candidate *</label>
      <select id="if-application" onchange="autoFillMeetingLink()">
        <option value="">Select an application...</option>
        ${applicationPickerList.map(app => `
          <option value="${app.id}">${app.full_name || app.email} — ${app.job_title}</option>
        `).join('')}
      </select>
    </div>
  `;

  const modalHtml = `
    <div class="modal-overlay" id="interview-modal-overlay" onclick="if(event.target===this) closeInterviewModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${interview ? 'Edit Interview' : 'Schedule Interview'}</h2>
          <button class="modal-close-btn" onclick="closeInterviewModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          ${candidateFieldHtml}
          <div class="form-group">
            <label>Interview Type *</label>
            <input type="text" id="if-type" list="interview-type-list" value="${interview ? interview.interview_type : ''}" placeholder="e.g., Technical Interview">
            <datalist id="interview-type-list">
              ${interviewTypeSuggestions.map(t => `<option value="${t}">`).join('')}
            </datalist>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="if-date" value="${interview ? interview.interview_date : ''}" onchange="autoFillMeetingLink()">
            </div>
            <div class="form-group">
              <label>Time *</label>
              <div class="time-input-row">
                <input type="time" id="if-time" value="${interview ? interview.interview_time.slice(0, 5) : ''}" onchange="autoFillMeetingLink()">
                <button type="button" class="time-ok-btn" title="Confirm time" onclick="document.getElementById('if-time').blur(); autoFillMeetingLink();">
                  <i data-lucide="check"></i> OK
                </button>
              </div>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Duration</label>
              <select id="if-duration">
                ${[15, 30, 45, 60, 90].map(d => `<option value="${d}" ${interview && interview.duration_minutes === d ? 'selected' : ''}>${d} minutes</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Mode</label>
              <select id="if-mode" onchange="autoFillMeetingLink()">
                <option value="video" ${!interview || interview.mode === 'video' ? 'selected' : ''}>Video Call</option>
                <option value="phone" ${interview && interview.mode === 'phone' ? 'selected' : ''}>Phone</option>
                <option value="onsite" ${interview && interview.mode === 'onsite' ? 'selected' : ''}>Onsite</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Interviewer</label>
            <select id="if-interviewer">
              <option value="">Unassigned</option>
              ${interviewerOptionsList.map(iv => `
                <option value="${iv.id}" ${interview && interview.interviewer_id === iv.id ? 'selected' : ''}>${iv.name}</option>
              `).join('')}
            </select>
            <p class="workflow-card-hint" style="margin-top: 6px;">The assigned interviewer submits feedback from their own portal.</p>
          </div>
          <div class="form-group">
            <label>Meeting Link / Location</label>
            <input type="text" id="if-link" data-auto="${interview && interview.meeting_link ? 'false' : 'true'}" oninput="this.dataset.auto='false'" value="${interview ? interview.meeting_link || '' : ''}" placeholder="Enter an office address, or generate a Google Meet link">
            <button type="button" class="link-generate-btn" onclick="autoFillMeetingLink(true)">
              <i data-lucide="video"></i> Generate Meet Link
            </button>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="if-notes" rows="2" placeholder="Optional notes for the interviewer...">${interview ? interview.notes || '' : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeInterviewModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveInterview(${interview ? interview.id : 'null'})">${interview ? 'Update Interview' : 'Schedule Interview'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
  autoFillMeetingLink();
}

function autoFillMeetingLink(force) {
  const modeEl = document.getElementById('if-mode');
  const linkEl = document.getElementById('if-link');
  if (!modeEl || !linkEl) return;

  if (!force && (modeEl.value !== 'video' || linkEl.dataset.auto === 'false')) return;

  const dateEl = document.getElementById('if-date');
  const timeEl = document.getElementById('if-time');
  if (!dateEl.value || !timeEl.value) {
    if (force) alert('Please select a date and time first.');
    return;
  }

  let candidateName = '';
  const appSelect = document.getElementById('if-application');
  if (appSelect) {
    const opt = appSelect.options[appSelect.selectedIndex];
    candidateName = opt && appSelect.value ? opt.textContent.split('—')[0].trim() : '';
  } else {
    const candidateInput = document.querySelector('#interview-modal-overlay .form-group input[disabled]');
    candidateName = candidateInput ? candidateInput.value.split('—')[0].trim() : '';
  }

  const typeEl = document.getElementById('if-type');
  const durationEl = document.getElementById('if-duration');
  const generateBtn = document.querySelector('#interview-modal-overlay .link-generate-btn');

  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating…';
  }

  fetch('../api/generate_meet_link.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interview_date: dateEl.value,
      interview_time: timeEl.value,
      duration_minutes: parseInt(durationEl.value, 10) || 30,
      interview_type: (typeEl.value || '').trim() || 'Interview',
      candidate_name: candidateName
    })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        if (result.not_connected) {
          if (force && confirm('Connect your Google Calendar to generate Meet links. Connect now?')) {
            window.location.href = '../api/google_oauth_start.php';
          }
        } else if (force) {
          alert(result.message || 'Failed to generate the Meet link.');
        }
        return;
      }
      linkEl.value = result.meet_link;
      linkEl.dataset.auto = 'true';
    })
    .catch(error => console.error('Error generating meet link:', error))
    .finally(() => {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="video"></i> Generate Meet Link';
        lucide.createIcons();
      }
    });
}

function closeInterviewModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveInterview(id) {
  const applicationId = id ? interviewList.find(iv => iv.id === id).application_id : parseInt(document.getElementById('if-application').value, 10);

  const payload = {
    id: id || 0,
    application_id: applicationId || 0,
    interview_type: document.getElementById('if-type').value.trim(),
    interview_date: document.getElementById('if-date').value,
    interview_time: document.getElementById('if-time').value,
    duration_minutes: parseInt(document.getElementById('if-duration').value, 10),
    mode: document.getElementById('if-mode').value,
    interviewer_id: parseInt(document.getElementById('if-interviewer').value, 10) || null,
    meeting_link: document.getElementById('if-link').value.trim(),
    notes: document.getElementById('if-notes').value.trim()
  };

  if (!payload.application_id || !payload.interview_type || !payload.interview_date || !payload.interview_time) {
    alert('Please select a candidate and fill in the interview type, date, and time.');
    return;
  }

  fetch('../api/save_interview.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save interview.');
        return;
      }
      closeInterviewModal();
      loadInterviews();
      loadHrDashboardStats();
    })
    .catch(error => console.error('Error saving interview:', error));
}

function confirmCancelInterview(id) {
  const interview = interviewList.find(iv => iv.id === id);
  if (!interview) return;

  const modalHtml = `
    <div class="modal-overlay" id="confirm-modal-overlay" onclick="if(event.target===this) closeConfirmModal()">
      <div class="modal-dialog confirm-modal-dialog">
        <div class="modal-header">
          <h2>Cancel Interview</h2>
          <button class="modal-close-btn" onclick="closeConfirmModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">Are you sure you want to cancel the ${interview.interview_type} interview with <strong>${interview.candidate_name}</strong>?</p>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeConfirmModal()">Keep it</button>
          <button class="modal-save-btn" onclick="runInterviewStatusChange(${id}, 'cancelled')">Cancel Interview</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function markInterviewCompleted(id) {
  runInterviewStatusChange(id, 'completed');
}

function runInterviewStatusChange(id, status) {
  fetch('../api/update_interview_status.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status })
  })
    .then(response => response.json())
    .then(() => {
      closeConfirmModal();
      loadInterviews();
      loadHrDashboardStats();
    })
    .catch(error => console.error('Error updating interview status:', error));
}

// ================= PENDING FEEDBACK =================

let feedbackList = [];
let feedbackFilter = 'pending';
let feedbackRatingValue = 0;
let feedbackRecommendationValue = '';

function loadFeedback() {
  fetch('../api/get_interview_feedback.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      feedbackList = result.data;
      renderFeedbackSummary();
      renderFeedbackList();
    })
    .catch(error => console.error('Error loading feedback:', error));
}

function daysOverdue(dateStr) {
  const interviewDate = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - interviewDate) / (1000 * 60 * 60 * 24));
}

function overdueLabel(days) {
  if (days <= 0) return 'Due today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function renderFeedbackSummary() {
  const pending = feedbackList.filter(iv => !iv.feedback_id);
  const overdue = pending.filter(iv => daysOverdue(iv.interview_date) > 2);
  const interviewersToFollowUp = new Set(pending.filter(iv => iv.interviewer_id).map(iv => iv.interviewer_id));

  const banner = document.getElementById('feedback-alert-banner');
  if (pending.length > 0) {
    banner.style.display = '';
    banner.innerHTML = `
      <i data-lucide="alert-circle"></i>
      <div>
        <div class="feedback-alert-title">Action Required</div>
        <div class="feedback-alert-desc">${pending.length} interview${pending.length === 1 ? '' : 's'} ${pending.length === 1 ? 'is' : 'are'} awaiting feedback. Follow up with interviewers to avoid delays in the recruitment process.</div>
      </div>
    `;
  } else {
    banner.style.display = 'none';
  }

  const stats = [
    { icon: 'clock', color: 'amber', value: pending.length, label: 'Pending Feedback' },
    { icon: 'alert-circle', color: 'red', value: overdue.length, label: 'Overdue (2+ days)' },
    { icon: 'user', color: 'purple', value: interviewersToFollowUp.size, label: 'Interviewers to Follow Up' }
  ];

  document.getElementById('feedback-stat-grid').innerHTML = stats.map(s => `
    <div class="metric-card">
      <div class="metric-top">
        <div class="metric-icon ${s.color}"><i data-lucide="${s.icon}"></i></div>
      </div>
      <div class="metric-value">${s.value}</div>
      <div class="metric-label">${s.label}</div>
    </div>
  `).join('');

  lucide.createIcons();
}

function setFeedbackFilter(status) {
  feedbackFilter = status;
  document.querySelectorAll('#feedback-filter-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderFeedbackList();
}

function recommendationLabel(rec) {
  const map = { strong_yes: 'Strong Yes', yes: 'Yes', no: 'No', strong_no: 'Strong No' };
  return map[rec] || rec;
}

function recommendationPillClass(rec) {
  const map = { strong_yes: 'offer', yes: 'in-review', no: 'rejected', strong_no: 'rejected' };
  return map[rec] || 'submitted';
}

function starDisplay(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function renderFeedbackList() {
  const container = document.getElementById('feedback-list-body');
  if (!container) return;

  const filtered = feedbackList.filter(iv => {
    if (feedbackFilter === 'pending') return !iv.feedback_id;
    if (feedbackFilter === 'submitted') return !!iv.feedback_id;
    return true;
  });

  const titleEl = document.getElementById('feedback-list-title');
  if (titleEl) {
    titleEl.textContent = feedbackFilter === 'pending' ? 'Interviews Awaiting Feedback'
      : feedbackFilter === 'submitted' ? 'Submitted Feedback'
      : 'All Completed Interviews';
  }

  if (filtered.length === 0) {
    const emptyMessage = feedbackFilter === 'pending'
      ? "All feedback has been submitted! 🎉"
      : feedbackFilter === 'submitted'
        ? "No feedback has been submitted yet."
        : "No completed interviews yet.";
    container.innerHTML = `<div class="panel-empty" style="padding: 40px 20px;">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = filtered.map(iv => {
    const canSubmit = !iv.interviewer_id;
    const overdueDays = daysOverdue(iv.interview_date);
    const isOverdue = !iv.feedback_id && overdueDays > 2;

    let metaHtml;
    if (iv.feedback_id) {
      metaHtml = `
        <div class="feedback-row-feedback">
          <span class="feedback-stars">${starDisplay(iv.rating)}</span>
          <span class="stage-pill ${recommendationPillClass(iv.recommendation)}">${recommendationLabel(iv.recommendation)}</span>
        </div>
        ${canSubmit ? `
          <div class="vacancy-card-actions">
            <button title="Edit feedback" onclick="openFeedbackModal(${iv.id})"><i data-lucide="edit-3"></i></button>
          </div>
        ` : `<span class="panel-empty" style="padding: 0; font-size: 12px;">View only</span>`}
      `;
    } else {
      metaHtml = `
        <div class="feedback-interviewer-chip">
          <div class="feedback-interviewer-avatar">${getInitials(iv.interviewer) || '?'}</div>
          <div>
            <div class="feedback-interviewer-name">${iv.interviewer || 'Unassigned'}</div>
            <div class="feedback-interviewer-label">Interviewer</div>
          </div>
        </div>
        <span class="stage-pill ${isOverdue ? 'rejected' : 'pending'}">${overdueLabel(overdueDays)}</span>
        ${canSubmit ? `
          <button class="feedback-add-btn" onclick="openFeedbackModal(${iv.id})">
            <i data-lucide="message-square-plus"></i> Add Feedback
          </button>
        ` : ''}
      `;
    }

    return `
      <div class="panel-row feedback-row">
        <div class="panel-row-avatar ${!iv.feedback_id ? (isOverdue ? 'danger' : 'warning') : ''}">${getInitials(iv.candidate_name) || '?'}</div>
        <div class="panel-row-body">
          <div class="panel-row-title">${iv.candidate_name}</div>
          <div class="panel-row-subtitle">${iv.job_title} · ${iv.interview_type}</div>
          <div class="panel-row-subtitle">Completed ${formatInterviewDateTime(iv.interview_date, iv.interview_time)}</div>
        </div>
        <div class="feedback-row-meta">${metaHtml}</div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function openFeedbackModal(interviewId) {
  const iv = feedbackList.find(item => Number(item.id) === Number(interviewId));
  if (!iv) return;

  const canSubmit = !iv.interviewer_id;
  if (!canSubmit) {
    alert('This interview has an assigned interviewer — feedback must be submitted from the Interviewer Portal.');
    return;
  }

  feedbackRatingValue = iv.rating || 0;
  feedbackRecommendationValue = iv.recommendation || '';

  const recommendationOptions = [
    { value: 'strong_yes', label: 'Strong Yes' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'strong_no', label: 'Strong No' }
  ];

  const modalHtml = `
    <div class="modal-overlay" id="feedback-modal-overlay" onclick="if(event.target===this) closeFeedbackModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${iv.feedback_id ? 'Edit Feedback' : 'Add Feedback'}</h2>
          <button class="modal-close-btn" onclick="closeFeedbackModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${iv.candidate_name} — ${iv.job_title}</label>
            <p class="workflow-card-hint">${iv.interview_type} · ${formatInterviewDateTime(iv.interview_date, iv.interview_time)}</p>
          </div>
          <div class="form-group">
            <label>Rating *</label>
            <div class="star-rating-picker" id="fb-rating-picker">
              ${[1, 2, 3, 4, 5].map(n => `
                <button type="button" class="${n <= feedbackRatingValue ? 'filled' : ''}" data-star="${n}" onclick="setFeedbackRating(${n})">
                  <i data-lucide="star"></i>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Recommendation *</label>
            <div class="filter-pills" id="fb-recommendation-pills">
              ${recommendationOptions.map(opt => `
                <button type="button" class="filter-pill ${feedbackRecommendationValue === opt.value ? 'active' : ''}" data-value="${opt.value}" onclick="setFeedbackRecommendation('${opt.value}')">${opt.label}</button>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Comments</label>
            <textarea id="fb-comments" rows="4" placeholder="Strengths, concerns, notes for the hiring decision...">${iv.comments || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeFeedbackModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveFeedback(${interviewId})">Save Feedback</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function setFeedbackRating(value) {
  feedbackRatingValue = value;
  document.querySelectorAll('#fb-rating-picker button').forEach(btn => {
    btn.classList.toggle('filled', parseInt(btn.dataset.star, 10) <= value);
  });
}

function setFeedbackRecommendation(value) {
  feedbackRecommendationValue = value;
  document.querySelectorAll('#fb-recommendation-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

function closeFeedbackModal() {
  document.getElementById('modal-root').innerHTML = '';
  feedbackRatingValue = 0;
  feedbackRecommendationValue = '';
}

function saveFeedback(interviewId) {
  if (feedbackRatingValue < 1 || !feedbackRecommendationValue) {
    alert('Please select a rating and a recommendation.');
    return;
  }

  fetch('../api/save_interview_feedback.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interview_id: interviewId,
      rating: feedbackRatingValue,
      recommendation: feedbackRecommendationValue,
      comments: document.getElementById('fb-comments').value.trim()
    })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save feedback.');
        return;
      }
      closeFeedbackModal();
      loadFeedback();
    })
    .catch(error => console.error('Error saving feedback:', error));
}

// ================= ACCESS CONTROL =================

let hrAdminList = [];

function loadHrAdmins() {
  fetch('../api/get_hr_admins.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        document.getElementById('hr-admins-table-body').innerHTML =
          `<tr><td colspan="5" class="panel-empty">${result.message || 'Unable to load HR users.'}</td></tr>`;
        return;
      }
      hrAdminList = result.data;
      renderHrAdminsTable();
    })
    .catch(error => console.error('Error loading HR admins:', error));
}

function renderHrAdminsTable() {
  const tbody = document.getElementById('hr-admins-table-body');

  if (hrAdminList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="panel-empty">No HR users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = hrAdminList.map(a => {
    const fullName = `${a.first_name} ${a.last_name}`.trim();
    const isSelf = currentHrAdmin && Number(a.id) === Number(currentHrAdmin.id);
    return `
      <tr>
        <td>${fullName}${isSelf ? ' <span class="cell-sub" style="display:inline;">(you)</span>' : ''}</td>
        <td>${a.email}</td>
        <td>${a.department || '—'}</td>
        <td><span class="role-badge ${a.role}">${a.role === 'admin' ? 'Admin' : 'Recruiter'}</span></td>
        <td>
          <div class="vacancy-card-actions">
            <button title="Edit" onclick="openHrAdminModal(${a.id})"><i data-lucide="edit-3"></i></button>
            ${isSelf ? '' : `<button title="Remove access" onclick="confirmDeleteHrAdmin(${a.id})"><i data-lucide="trash-2"></i></button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function openHrAdminModal(id) {
  const admin = id ? hrAdminList.find(a => a.id === id) : null;

  const modalHtml = `
    <div class="modal-overlay" id="hr-admin-modal-overlay" onclick="if(event.target===this) closeHrAdminModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${admin ? 'Edit HR User' : 'Add HR User'}</h2>
          <button class="modal-close-btn" onclick="closeHrAdminModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" id="ha-first-name" value="${admin ? admin.first_name : ''}" placeholder="e.g., Alice">
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" id="ha-last-name" value="${admin ? admin.last_name : ''}" placeholder="Morgan">
            </div>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="ha-email" value="${admin ? admin.email : ''}" placeholder="alice@company.com">
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" id="ha-department" value="${admin ? admin.department || '' : 'Human Resources'}" placeholder="Human Resources">
          </div>
          <div class="form-group">
            <label>Role</label>
            <select id="ha-role">
              <option value="recruiter" ${!admin || admin.role === 'recruiter' ? 'selected' : ''}>Recruiter</option>
              <option value="admin" ${admin && admin.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label>${admin ? 'New Password' : 'Password *'}</label>
            <input type="password" id="ha-password" placeholder="${admin ? 'Leave blank to keep current password' : 'At least 8 characters'}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeHrAdminModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveHrAdmin(${admin ? admin.id : 'null'})">${admin ? 'Save Changes' : 'Add HR User'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function closeHrAdminModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveHrAdmin(id) {
  const payload = {
    id: id || 0,
    first_name: document.getElementById('ha-first-name').value.trim(),
    last_name: document.getElementById('ha-last-name').value.trim(),
    email: document.getElementById('ha-email').value.trim(),
    department: document.getElementById('ha-department').value.trim(),
    role: document.getElementById('ha-role').value,
    password: document.getElementById('ha-password').value
  };

  if (!payload.first_name || !payload.last_name || !payload.email) {
    alert('First name, last name, and email are required.');
    return;
  }

  fetch('../api/save_hr_admin.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save HR user.');
        return;
      }
      closeHrAdminModal();
      loadHrAdmins();
    })
    .catch(error => console.error('Error saving HR admin:', error));
}

function confirmDeleteHrAdmin(id) {
  const admin = hrAdminList.find(a => a.id === id);
  if (!admin) return;

  const fullName = `${admin.first_name} ${admin.last_name}`.trim();

  const modalHtml = `
    <div class="modal-overlay" id="confirm-modal-overlay" onclick="if(event.target===this) closeConfirmModal()">
      <div class="modal-dialog confirm-modal-dialog">
        <div class="modal-header">
          <h2>Remove Access</h2>
          <button class="modal-close-btn" onclick="closeConfirmModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">Are you sure you want to remove <strong>${fullName}</strong>'s access to the HR dashboard? They won't be able to sign in anymore.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeConfirmModal()">Cancel</button>
          <button class="modal-save-btn" onclick="runDeleteHrAdmin(${id})">Remove Access</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function runDeleteHrAdmin(id) {
  fetch('../api/delete_hr_admin.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(result => {
      closeConfirmModal();
      if (!result.success) {
        alert(result.message || 'Failed to remove access.');
        return;
      }
      loadHrAdmins();
    })
    .catch(error => console.error('Error deleting HR admin:', error));
}

function setAccessTab(tab) {
  document.querySelectorAll('#access-tab-pills .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('access-hr-users-section').style.display = tab === 'hr' ? 'block' : 'none';
  document.getElementById('access-interviewers-section').style.display = tab === 'interviewers' ? 'block' : 'none';
  document.getElementById('access-hiring-managers-section').style.display = tab === 'hiring-managers' ? 'block' : 'none';

  if (tab === 'interviewers') {
    loadInterviewersList();
  } else if (tab === 'hiring-managers') {
    loadHiringManagersList();
  }
}

let interviewerList = [];

function loadInterviewersList() {
  fetch('../api/get_interviewers.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        document.getElementById('interviewers-table-body').innerHTML =
          `<tr><td colspan="4" class="panel-empty">${result.message || 'Unable to load interviewers.'}</td></tr>`;
        return;
      }
      interviewerList = result.data;
      renderInterviewersTable();
    })
    .catch(error => console.error('Error loading interviewers:', error));
}

function renderInterviewersTable() {
  const tbody = document.getElementById('interviewers-table-body');

  if (interviewerList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="panel-empty">No interviewers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = interviewerList.map(iv => {
    const fullName = `${iv.first_name} ${iv.last_name}`.trim();
    return `
      <tr>
        <td>${fullName}</td>
        <td>${iv.email}</td>
        <td>${iv.department || '—'}</td>
        <td>
          <div class="vacancy-card-actions">
            <button title="Edit" onclick="openInterviewerModal(${iv.id})"><i data-lucide="edit-3"></i></button>
            <button title="Remove access" onclick="confirmDeleteInterviewer(${iv.id})"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function openInterviewerModal(id) {
  const interviewer = id ? interviewerList.find(iv => iv.id === id) : null;

  const modalHtml = `
    <div class="modal-overlay" id="interviewer-modal-overlay" onclick="if(event.target===this) closeInterviewerModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${interviewer ? 'Edit Interviewer' : 'Add Interviewer'}</h2>
          <button class="modal-close-btn" onclick="closeInterviewerModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" id="iv-first-name" value="${interviewer ? interviewer.first_name : ''}" placeholder="e.g., Alice">
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" id="iv-last-name" value="${interviewer ? interviewer.last_name : ''}" placeholder="Morgan">
            </div>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="iv-email" value="${interviewer ? interviewer.email : ''}" placeholder="alice@company.com">
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" id="iv-department" value="${interviewer ? interviewer.department || '' : ''}" placeholder="Engineering">
          </div>
          <div class="form-group">
            <label>${interviewer ? 'New Password' : 'Password *'}</label>
            <input type="password" id="iv-password" placeholder="${interviewer ? 'Leave blank to keep current password' : 'At least 8 characters'}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeInterviewerModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveInterviewer(${interviewer ? interviewer.id : 'null'})">${interviewer ? 'Save Changes' : 'Add Interviewer'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function closeInterviewerModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveInterviewer(id) {
  const payload = {
    id: id || 0,
    first_name: document.getElementById('iv-first-name').value.trim(),
    last_name: document.getElementById('iv-last-name').value.trim(),
    email: document.getElementById('iv-email').value.trim(),
    department: document.getElementById('iv-department').value.trim(),
    password: document.getElementById('iv-password').value
  };

  if (!payload.first_name || !payload.last_name || !payload.email) {
    alert('First name, last name, and email are required.');
    return;
  }

  fetch('../api/save_interviewer.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save interviewer.');
        return;
      }
      closeInterviewerModal();
      loadInterviewersList();
    })
    .catch(error => console.error('Error saving interviewer:', error));
}

function confirmDeleteInterviewer(id) {
  const interviewer = interviewerList.find(iv => iv.id === id);
  if (!interviewer) return;

  const fullName = `${interviewer.first_name} ${interviewer.last_name}`.trim();

  const modalHtml = `
    <div class="modal-overlay" id="confirm-modal-overlay" onclick="if(event.target===this) closeConfirmModal()">
      <div class="modal-dialog confirm-modal-dialog">
        <div class="modal-header">
          <h2>Remove Access</h2>
          <button class="modal-close-btn" onclick="closeConfirmModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">Are you sure you want to remove <strong>${fullName}</strong>'s interviewer access? They won't be able to sign in anymore.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeConfirmModal()">Cancel</button>
          <button class="modal-save-btn" onclick="runDeleteInterviewer(${id})">Remove Access</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function runDeleteInterviewer(id) {
  fetch('../api/delete_interviewer.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(result => {
      closeConfirmModal();
      if (!result.success) {
        alert(result.message || 'Failed to remove access.');
        return;
      }
      loadInterviewersList();
    })
    .catch(error => console.error('Error deleting interviewer:', error));
}

let hiringManagerList = [];

function loadHiringManagersList() {
  fetch('../api/get_hiring_managers.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        document.getElementById('hiring-managers-table-body').innerHTML =
          `<tr><td colspan="4" class="panel-empty">${result.message || 'Unable to load hiring managers.'}</td></tr>`;
        return;
      }
      hiringManagerList = result.data;
      renderHiringManagersTable();
    })
    .catch(error => console.error('Error loading hiring managers:', error));
}

function renderHiringManagersTable() {
  const tbody = document.getElementById('hiring-managers-table-body');

  if (hiringManagerList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="panel-empty">No hiring managers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = hiringManagerList.map(hm => {
    const fullName = `${hm.first_name} ${hm.last_name}`.trim();
    return `
      <tr>
        <td>${fullName}</td>
        <td>${hm.email}</td>
        <td>${hm.department || '—'}</td>
        <td>
          <div class="vacancy-card-actions">
            <button title="Edit" onclick="openHiringManagerModal(${hm.id})"><i data-lucide="edit-3"></i></button>
            <button title="Remove access" onclick="confirmDeleteHiringManager(${hm.id})"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function openHiringManagerModal(id) {
  const hiringManager = id ? hiringManagerList.find(hm => hm.id === id) : null;

  const modalHtml = `
    <div class="modal-overlay" id="hiring-manager-modal-overlay" onclick="if(event.target===this) closeHiringManagerModal()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${hiringManager ? 'Edit Hiring Manager' : 'Add Hiring Manager'}</h2>
          <button class="modal-close-btn" onclick="closeHiringManagerModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" id="hm-first-name" value="${hiringManager ? hiringManager.first_name : ''}" placeholder="e.g., Nadia">
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" id="hm-last-name" value="${hiringManager ? hiringManager.last_name : ''}" placeholder="Fernando">
            </div>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="hm-email" value="${hiringManager ? hiringManager.email : ''}" placeholder="nadia@company.com">
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" id="hm-department" value="${hiringManager ? hiringManager.department || '' : ''}" placeholder="Engineering">
          </div>
          <div class="form-group">
            <label>${hiringManager ? 'New Password' : 'Password *'}</label>
            <input type="password" id="hm-password" placeholder="${hiringManager ? 'Leave blank to keep current password' : 'At least 8 characters'}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeHiringManagerModal()">Cancel</button>
          <button class="modal-save-btn" onclick="saveHiringManager(${hiringManager ? hiringManager.id : 'null'})">${hiringManager ? 'Save Changes' : 'Add Hiring Manager'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function closeHiringManagerModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveHiringManager(id) {
  const payload = {
    id: id || 0,
    first_name: document.getElementById('hm-first-name').value.trim(),
    last_name: document.getElementById('hm-last-name').value.trim(),
    email: document.getElementById('hm-email').value.trim(),
    department: document.getElementById('hm-department').value.trim(),
    password: document.getElementById('hm-password').value
  };

  if (!payload.first_name || !payload.last_name || !payload.email) {
    alert('First name, last name, and email are required.');
    return;
  }

  fetch('../api/save_hiring_manager.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to save hiring manager.');
        return;
      }
      closeHiringManagerModal();
      loadHiringManagersList();
    })
    .catch(error => console.error('Error saving hiring manager:', error));
}

function confirmDeleteHiringManager(id) {
  const hiringManager = hiringManagerList.find(hm => hm.id === id);
  if (!hiringManager) return;

  const fullName = `${hiringManager.first_name} ${hiringManager.last_name}`.trim();

  const modalHtml = `
    <div class="modal-overlay" id="confirm-modal-overlay" onclick="if(event.target===this) closeConfirmModal()">
      <div class="modal-dialog confirm-modal-dialog">
        <div class="modal-header">
          <h2>Remove Access</h2>
          <button class="modal-close-btn" onclick="closeConfirmModal()"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">Are you sure you want to remove <strong>${fullName}</strong>'s hiring manager access? They won't be able to sign in anymore.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" onclick="closeConfirmModal()">Cancel</button>
          <button class="modal-save-btn" onclick="runDeleteHiringManager(${id})">Remove Access</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-root').innerHTML = modalHtml;
  lucide.createIcons();
}

function runDeleteHiringManager(id) {
  fetch('../api/delete_hiring_manager.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(response => response.json())
    .then(result => {
      closeConfirmModal();
      if (!result.success) {
        alert(result.message || 'Failed to remove access.');
        return;
      }
      loadHiringManagersList();
    })
    .catch(error => console.error('Error deleting hiring manager:', error));
}

// ================= SETTINGS =================

function loadSettingsView() {
  document.getElementById('settings-current-password').value = '';
  document.getElementById('settings-new-password').value = '';
  document.getElementById('settings-confirm-password').value = '';

  const manageLink = document.getElementById('settings-manage-team-link');
  if (manageLink) {
    manageLink.style.display = currentHrAdmin && currentHrAdmin.role === 'admin' ? '' : 'none';
  }

  fetch('../api/get_team_members.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      renderTeamMembersList(result.data);
    })
    .catch(error => console.error('Error loading team members:', error));
}

function renderTeamMembersList(members) {
  const container = document.getElementById('settings-team-list');
  if (!container) return;

  if (members.length === 0) {
    container.innerHTML = `<div class="panel-empty">No team members yet.</div>`;
    return;
  }

  container.innerHTML = members.map(m => {
    const fullName = `${m.first_name} ${m.last_name}`.trim();
    return `
      <div class="panel-row">
        <div class="panel-row-avatar">${getInitials(fullName) || '?'}</div>
        <div class="panel-row-body">
          <div class="panel-row-title">${fullName}</div>
          <div class="panel-row-subtitle">${m.email}</div>
        </div>
        <span class="role-badge ${m.role}">${m.role === 'admin' ? 'Admin' : 'Recruiter'}</span>
      </div>
    `;
  }).join('');
}

function changeHrPassword() {
  const currentPassword = document.getElementById('settings-current-password').value;
  const newPassword = document.getElementById('settings-new-password').value;
  const confirmPassword = document.getElementById('settings-confirm-password').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Please fill in all password fields.');
    return;
  }

  if (newPassword.length < 8) {
    alert('New password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('New password and confirmation do not match.');
    return;
  }

  fetch('../api/change_hr_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        alert(result.message || 'Failed to change password.');
        return;
      }
      document.getElementById('settings-current-password').value = '';
      document.getElementById('settings-new-password').value = '';
      document.getElementById('settings-confirm-password').value = '';
      alert('Password updated successfully.');
    })
    .catch(error => console.error('Error changing password:', error));
}

// ================= SIDEBAR COLLAPSE =================

const sidebar = document.querySelector('.sidebar');
const collapseBtn = document.querySelector('.collapse-btn');

collapseBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');

  const isCollapsed = sidebar.classList.contains('collapsed');
  collapseBtn.querySelector('i').setAttribute(
    'data-lucide',
    isCollapsed ? 'chevron-right' : 'chevron-left'
  );

  lucide.createIcons();
});
