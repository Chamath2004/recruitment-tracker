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

function loadHrProfile() {
  fetch('get_hr_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'HR_login.html';
        return;
      }
      const a = result.data;
      const fullName = `${a.first_name} ${a.last_name}`.trim();
      document.getElementById('sidebar-avatar').textContent = getInitials(fullName) || "?";
      document.getElementById('sidebar-name').textContent = fullName;
      document.getElementById('sidebar-email').textContent = a.email;
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
  document.getElementById('workflows-view').style.display = view === 'workflows' ? 'block' : 'none';
  document.getElementById('interviews-view').style.display = view === 'interviews' ? 'block' : 'none';
  document.getElementById('placeholder-view').style.display = view === 'placeholder' ? 'block' : 'none';

  if (view === 'placeholder') {
    document.getElementById('placeholder-title').textContent = label;
  } else if (view === 'vacancies') {
    loadVacancies();
  } else if (view === 'workflows') {
    loadHiringWorkflows();
  } else if (view === 'interviews') {
    loadInterviews();
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
  fetch('get_hr_dashboard_stats.php')
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
  fetch('get_vacancies.php')
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
  fetch('toggle_vacancy_status.php', {
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

  fetch('save_vacancy.php', {
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
let interviewFilter = 'all';

const interviewTypeSuggestions = ['Phone Screen', 'Technical Interview', 'Panel Interview', 'Culture Fit', 'Final Interview'];

function loadInterviews() {
  Promise.all([
    fetch('get_interviews.php').then(r => r.json()),
    fetch('get_applications_hr.php').then(r => r.json())
  ]).then(([interviewsResult, applicationsResult]) => {
    if (interviewsResult.success) interviewList = interviewsResult.data;
    if (applicationsResult.success) applicationPickerList = applicationsResult.data;
    renderInterviewList();
  }).catch(error => console.error('Error loading interviews:', error));
}

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
      <td>${interviewModeLabel(iv.mode)}</td>
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
              <input type="time" id="if-time" value="${interview ? interview.interview_time.slice(0, 5) : ''}" onchange="autoFillMeetingLink()">
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
            <input type="text" id="if-interviewer" value="${interview ? interview.interviewer || '' : ''}" placeholder="e.g., Alice Morgan">
          </div>
          <div class="form-group">
            <label>Meeting Link / Location</label>
            <input type="text" id="if-link" data-auto="${interview && interview.meeting_link ? 'false' : 'true'}" oninput="this.dataset.auto='false'" value="${interview ? interview.meeting_link || '' : ''}" placeholder="Enter an office address, or generate a video call link">
            <button type="button" class="link-generate-btn" onclick="autoFillMeetingLink(true)">
              <i data-lucide="link"></i> Generate Link
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

  const slug = [candidateName, dateEl.value, timeEl.value.replace(':', '')]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9-]+/g, '');

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  linkEl.value = `https://meet.jit.si/${slug ? slug + '-' : ''}${randomSuffix}`;
  linkEl.dataset.auto = 'true';
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
    interviewer: document.getElementById('if-interviewer').value.trim(),
    meeting_link: document.getElementById('if-link').value.trim(),
    notes: document.getElementById('if-notes').value.trim()
  };

  if (!payload.application_id || !payload.interview_type || !payload.interview_date || !payload.interview_time) {
    alert('Please select a candidate and fill in the interview type, date, and time.');
    return;
  }

  fetch('save_interview.php', {
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
  fetch('update_interview_status.php', {
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
