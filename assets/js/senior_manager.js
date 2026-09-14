lucide.createIcons();

// Give every chart's legend/axis text some breathing room from the
// canvas edges instead of sitting flush against the container.
if (typeof Chart !== 'undefined') {
  Chart.defaults.layout.padding = { top: 12, right: 12, bottom: 4, left: 4 };
  Chart.defaults.plugins.legend.labels.padding = 16;
}

function getInitials(name) {
  return (name || "")
    .split(" ")
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ================= SESSION / PROFILE =================

function loadSeniorProfile() {
  fetch('../api/get_senior_manager_profile.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        window.location.href = 'Login.html';
        return;
      }
      const m = result.data;
      const fullName = `${m.first_name} ${m.last_name}`.trim();
      document.getElementById('sidebar-avatar').textContent = getInitials(fullName) || "?";
      document.getElementById('sidebar-name').textContent = fullName;
      document.getElementById('sidebar-email').textContent = m.email;
    })
    .catch(error => console.error('Error loading senior manager profile:', error));
}

loadSeniorProfile();

// ================= VIEW SWITCHING =================

function switchSeniorView(navEl, view) {
  document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));
  navEl.classList.add('active');

  document.getElementById('dashboard-view').style.display = view === 'dashboard' ? 'block' : 'none';
  document.getElementById('analytics-view').style.display = view === 'analytics' ? 'block' : 'none';
  document.getElementById('performance-view').style.display = view === 'performance' ? 'block' : 'none';

  if (view === 'dashboard') {
    loadDashboard();
  } else if (view === 'analytics') {
    loadAnalytics();
  } else if (view === 'performance') {
    loadPerformance();
  }
}

// ================= SHARED CHART HELPERS =================

let hiringTrendChart = null;
let timeToHireChart = null;
let funnelChart = null;
let departmentBarChart = null;
let departmentPieChart = null;

const DEPT_COLORS = ['#f0c419', '#38bdf8', '#4ade80', '#c084fc', '#f87171', '#fbbf24'];

function renderMetricCards(containerId, metrics) {
  document.getElementById(containerId).innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-top">
        <div class="metric-icon ${m.color}">
          <i data-lucide="${m.icon}"></i>
        </div>
      </div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-label">${m.label}</div>
      <div class="metric-change ${m.neutral ? 'neutral' : ''}">${m.change}</div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderPipelineGrid(containerId, pipelineData) {
  document.getElementById(containerId).innerHTML = pipelineData.map(stage => `
    <div class="sm-pipeline-cell">
      <div class="sm-pipeline-count">${stage.count}</div>
      <div class="sm-pipeline-stage">${stage.stage}</div>
      ${stage.dropOff > 0 ? `<div class="sm-pipeline-drop">-${stage.dropOff}%</div>` : ''}
    </div>
  `).join('');
}

// ================= DASHBOARD =================

function loadDashboard() {
  fetch('../api/get_senior_dashboard_stats.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;

      const hireRate = result.totalApplications > 0
        ? Math.round((result.totalHires / result.totalApplications) * 100)
        : 0;

      renderMetricCards('dashboard-metric-grid', [
        { label: 'Total Applications', value: result.totalApplications, change: 'All time', icon: 'users', color: 'blue', neutral: true },
        { label: 'Active Positions', value: result.activeVacancies, change: 'Currently open', icon: 'briefcase', color: 'purple', neutral: true },
        { label: 'Total Hires', value: result.totalHires, change: 'All time', icon: 'target', color: 'green', neutral: true },
        { label: 'Hire Rate', value: `${hireRate}%`, change: 'Hires ÷ applications', icon: 'trending-up', color: 'amber', neutral: true },
      ]);

      renderHiringTrendChart(result.monthlyApplications);
      renderTimeToHireChart(result.timeToHireData);
      renderPipelineGrid('dashboard-pipeline-grid', result.pipelineData);
    })
    .catch(error => console.error('Error loading dashboard stats:', error));
}

function renderTimeToHireChart(timeToHireData) {
  const ctx = document.getElementById('time-to-hire-chart');
  if (!ctx) return;

  if (timeToHireChart) timeToHireChart.destroy();

  const textMuted = cssVar('--text-muted');
  const gridColor = cssVar('--border-color');
  const accent = cssVar('--primary-green');

  timeToHireChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeToHireData.map(m => m.month),
      datasets: [{
        label: 'Avg. days to hire',
        data: timeToHireData.map(m => m.days),
        borderColor: accent,
        backgroundColor: hexToRgba(accent, 0.15),
        fill: true,
        tension: 0.35,
        pointBackgroundColor: accent,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textMuted, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: textMuted, font: { size: 11 } }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderHiringTrendChart(monthlyApplications) {
  const ctx = document.getElementById('hiring-trend-chart');
  if (!ctx) return;

  if (hiringTrendChart) hiringTrendChart.destroy();

  const textMuted = cssVar('--text-muted');
  const gridColor = cssVar('--border-color');

  hiringTrendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyApplications.map(m => m.month),
      datasets: [
        { label: 'Applications', data: monthlyApplications.map(m => m.applications), backgroundColor: cssVar('--primary-green'), borderRadius: 4 },
        { label: 'Hires', data: monthlyApplications.map(m => m.hires), backgroundColor: cssVar('--badge-green-text'), borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textMuted, font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: textMuted, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: textMuted, font: { size: 11 } }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

// ================= ANALYTICS & REPORTS =================

function loadAnalytics() {
  fetch('../api/get_senior_dashboard_stats.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;

      const hireRate = result.totalApplications > 0
        ? Math.round((result.totalHires / result.totalApplications) * 100)
        : 0;

      renderMetricCards('analytics-metric-grid', [
        { label: 'Total Applications', value: result.totalApplications, change: 'All time', icon: 'users', color: 'blue', neutral: true },
        { label: 'Active Vacancies', value: result.activeVacancies, change: 'Currently open', icon: 'briefcase', color: 'purple', neutral: true },
        { label: 'Hiring Efficiency', value: `${hireRate}%`, change: 'Hires ÷ applications', icon: 'target', color: 'green', neutral: true },
        { label: 'Rejected', value: result.rejectedCount, change: 'All time', icon: 'user-x', color: 'red', neutral: true },
      ]);

      renderFunnelChart(result.pipelineData);
      renderPipelineGrid('analytics-pipeline-grid', result.pipelineData);
    })
    .catch(error => console.error('Error loading analytics:', error));

  loadInterviewFeedbackAnalytics();
}

let recommendationChart = null;

function loadInterviewFeedbackAnalytics() {
  fetch('../api/get_interview_feedback_analytics.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;

      document.getElementById('feedback-kpi-row').innerHTML = `
        <div class="sm-feedback-kpi">
          <div class="sm-feedback-kpi-value">${result.totalFeedback > 0 ? result.avgRating.toFixed(1) : '—'}<span style="font-size:13px;color:var(--text-dim);"> / 5</span></div>
          <div class="sm-feedback-kpi-label">Average Interview Rating</div>
        </div>
        <div class="sm-feedback-kpi">
          <div class="sm-feedback-kpi-value">${result.positiveRate}%</div>
          <div class="sm-feedback-kpi-label">Positive Recommendation Rate</div>
        </div>
        <div class="sm-feedback-kpi">
          <div class="sm-feedback-kpi-value">${result.totalFeedback}</div>
          <div class="sm-feedback-kpi-label">Feedback Forms Submitted</div>
        </div>
      `;

      renderRecommendationChart(result.recommendationDistribution);

      const tbody = document.getElementById('feedback-by-vacancy-body');
      if (result.byVacancy.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="panel-empty">No interview feedback submitted yet.</td></tr>`;
      } else {
        tbody.innerHTML = result.byVacancy.map(v => `
          <tr>
            <td>${v.jobTitle}</td>
            <td>${v.avgRating.toFixed(1)} / 5</td>
            <td>${v.totalFeedback}</td>
            <td>${v.positiveRate}%</td>
          </tr>
        `).join('');
      }
    })
    .catch(error => console.error('Error loading interview feedback analytics:', error));
}

function renderRecommendationChart(recommendationDistribution) {
  const ctx = document.getElementById('recommendation-chart');
  if (!ctx) return;

  if (recommendationChart) recommendationChart.destroy();

  const textMuted = cssVar('--text-muted');
  const gridColor = cssVar('--border-color');
  const colors = [cssVar('--badge-green-text'), cssVar('--primary-green'), cssVar('--warning-text'), cssVar('--badge-red')];

  recommendationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: recommendationDistribution.map(r => r.recommendation),
      datasets: [{
        label: 'Feedback count',
        data: recommendationDistribution.map(r => r.count),
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textMuted, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: textMuted, font: { size: 11 }, precision: 0 }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

function renderFunnelChart(pipelineData) {
  const ctx = document.getElementById('funnel-chart');
  if (!ctx) return;

  if (funnelChart) funnelChart.destroy();

  const textMuted = cssVar('--text-muted');
  const gridColor = cssVar('--border-color');

  funnelChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: pipelineData.map(s => s.stage),
      datasets: [
        { label: 'Candidates', data: pipelineData.map(s => s.count), backgroundColor: cssVar('--primary-green'), borderRadius: 4 }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textMuted, font: { size: 11 } }, grid: { color: gridColor }, beginAtZero: true },
        y: { ticks: { color: textMuted, font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ================= RECRUITMENT PERFORMANCE (DEPARTMENTS) =================

function loadPerformance() {
  fetch('../api/get_department_breakdown.php')
    .then(response => response.json())
    .then(result => {
      if (!result.success) return;
      renderDepartmentPerformance(result.data);
    })
    .catch(error => console.error('Error loading department breakdown:', error));
}

function renderDepartmentPerformance(departments) {
  if (departments.length === 0) {
    document.getElementById('dept-summary-grid').innerHTML = `<div class="sm-empty">No vacancies with a department set yet.</div>`;
    document.getElementById('department-table-body').innerHTML = `<tr><td colspan="6" class="panel-empty">No data yet.</td></tr>`;
    return;
  }

  const totalActive = departments.reduce((sum, d) => sum + d.activeVacancies, 0);
  const totalApplicants = departments.reduce((sum, d) => sum + d.totalApplicants, 0);
  const totalHired = departments.reduce((sum, d) => sum + d.hired, 0);

  document.getElementById('dept-summary-grid').innerHTML = `
    <div class="sm-dept-summary-card">
      <div class="sm-dept-summary-label">Active Openings</div>
      <div class="sm-dept-summary-value">${totalActive}</div>
      <div class="sm-dept-summary-note">across all departments</div>
    </div>
    <div class="sm-dept-summary-card">
      <div class="sm-dept-summary-label">Total Applicants</div>
      <div class="sm-dept-summary-value">${totalApplicants}</div>
      <div class="sm-dept-summary-note">across all departments</div>
    </div>
    <div class="sm-dept-summary-card">
      <div class="sm-dept-summary-label">Total Hired</div>
      <div class="sm-dept-summary-value">${totalHired}</div>
      <div class="sm-dept-summary-note">${totalApplicants > 0 ? Math.round((totalHired / totalApplicants) * 100) : 0}% conversion</div>
    </div>
  `;

  renderDepartmentBarChart(departments);
  renderDepartmentPieChart(departments);

  document.getElementById('department-table-body').innerHTML = departments.map(d => {
    const conversion = d.totalApplicants > 0 ? Math.round((d.hired / d.totalApplicants) * 100) : 0;
    return `
      <tr>
        <td>${d.department}</td>
        <td>${d.activeVacancies}</td>
        <td>${d.totalApplicants}</td>
        <td>${d.shortlisted}</td>
        <td>${d.hired}</td>
        <td>
          <div class="sm-conversion-bar">
            <div class="sm-conversion-track"><div class="sm-conversion-fill" style="width:${conversion}%;"></div></div>
            <span class="sm-conversion-value">${conversion}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDepartmentBarChart(departments) {
  const ctx = document.getElementById('department-bar-chart');
  if (!ctx) return;

  if (departmentBarChart) departmentBarChart.destroy();

  const textMuted = cssVar('--text-muted');
  const gridColor = cssVar('--border-color');

  departmentBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: departments.map(d => d.department),
      datasets: [
        { label: 'Applicants', data: departments.map(d => d.totalApplicants), backgroundColor: cssVar('--primary-green'), borderRadius: 4 },
        { label: 'Shortlisted', data: departments.map(d => d.shortlisted), backgroundColor: cssVar('--badge-blue-text'), borderRadius: 4 },
        { label: 'Hired', data: departments.map(d => d.hired), backgroundColor: cssVar('--badge-green-text'), borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textMuted, font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: textMuted, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: textMuted, font: { size: 11 } }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

function renderDepartmentPieChart(departments) {
  const ctx = document.getElementById('department-pie-chart');
  if (!ctx) return;

  if (departmentPieChart) departmentPieChart.destroy();

  const textMuted = cssVar('--text-muted');
  const bgPage = cssVar('--bg-sidebar');

  departmentPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: departments.map(d => d.department),
      datasets: [{
        data: departments.map(d => d.totalApplicants),
        backgroundColor: departments.map((_, i) => DEPT_COLORS[i % DEPT_COLORS.length]),
        borderColor: bgPage,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textMuted, font: { size: 11 }, boxWidth: 10 } }
      }
    }
  });
}

// ================= INITIAL LOAD =================

loadDashboard();

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
