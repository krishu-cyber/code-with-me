document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://code-with-me-4cxn.onrender.com';
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';
  const adminSection = document.getElementById('owner-admin');

  if (!adminSection) return;
  if (isAdmin) adminSection.style.display = 'block';

  const adminStatus = document.getElementById('adminStatus');
  const loginBtn = document.getElementById('adminLoginBtn');
  const passwordInput = document.getElementById('adminPassword');

  const uploadBtn = document.getElementById('simulateUploadBtn');
  const adminZipInput = document.getElementById('adminZip');
  const adminTitle = document.getElementById('adminTitle');
  const adminDesc = document.getElementById('adminDesc');
  const projectGrid = document.querySelector('.project-grid');

  const simulateVideoBtn = document.getElementById('simulateVideoBtn');
  const adminVideoUrl = document.getElementById('adminVideoUrl');
  const adminVideoTitle = document.getElementById('adminVideoTitle');
  const videoGrid = document.querySelector('.video-grid');

  let token = null;
  // restore token from localStorage if present
  try {
    const stored = localStorage.getItem('ownerToken');
    if (stored) { token = stored; setStatus('Logged in (cached)', true); }
  } catch (e) {}
  // expose token globally for dashboard helpers
  window.ownerToken = token;

  function setStatus(text, ok) {
    if (adminStatus) {
      adminStatus.textContent = text;
      adminStatus.style.color = ok ? 'green' : '#666';
    }
  }

  async function apiLogin(username, password) {
    try {
      const res = await fetch(API_BASE + '/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Login failed');
      }
      const j = await res.json(); setToken(j.token); setStatus('Logged in (backend)', true); return true;
    } catch (e) {
      setStatus('Backend login failed — using client simulation', false);
      return false;
    }
  }

  // persist token when logged in
  const originalApiLogin = apiLogin;
  apiLogin = async function(username, password) {
    const ok = await originalApiLogin(username, password);
    if (ok && token) {
      try { localStorage.setItem('ownerToken', token); } catch (e) {}
    }
    return ok;
  };

  // keep global token in sync
  function setToken(t) {
    token = t; window.ownerToken = t;
  }

  function createProjectCard(title, desc, downloadUrl) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `\n      <h3>${escapeHtml(title)}</h3>\n      <a class="btn btn-primary" href="#" onclick="return false;">\n        <i class="fas fa-eye"></i> Live Demo</a>\n      <a class="btn" ${downloadUrl ? `download href="${downloadUrl}"` : 'href="#"'}>\n        <i class="fas fa-file-archive"></i> Download ZIP</a>\n      <p class="project-description">${escapeHtml(desc)}</p>\n    `;
    if (projectGrid) projectGrid.prepend(card);
  }

  function createVideoCard(title, url) {
    const card = document.createElement('div');
    card.className = 'video-card';
    const thumb = 'images/capture.png';
    card.innerHTML = `\n      <div class="video-thumbnail">\n        <img alt="${escapeHtml(title)}" src="${thumb}" />\n        <div class="play-icon"><i class="fas fa-play"></i></div>\n      </div>\n      <div class="video-info">\n        <h3>${escapeHtml(title)}</h3>\n        <div class="video-meta"><span><i class="far fa-calendar-alt"></i> just now</span></div>\n        <p>${escapeHtml(title)}</p>\n        <div class="tags"><span class="tag">HTML</span><span class="tag">CSS</span></div>\n        <a class="watch-btn" href="${url}" target="_blank"><i class="fas fa-play"></i> Watch Video</a>\n      </div>\n    `;
    if (videoGrid) videoGrid.prepend(card);
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const unInput = document.getElementById('adminUsername');
      const username = unInput ? unInput.value.trim() : 'owner';
      const pw = passwordInput.value.trim();
      if (!username || !pw) { alert('Enter owner username and password'); return; }
      const ok = await apiLogin(username, pw);
      if (ok) { passwordInput.value = ''; setStatus('Logged in', true); }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const file = adminZipInput.files && adminZipInput.files[0];
      const title = adminTitle.value.trim() || 'New Project';
      const desc = adminDesc.value.trim() || 'Uploaded by owner.';

      // If we have token, try backend upload
      if (token) {
        const form = new FormData();
        form.append('zip', file);
        form.append('title', title);
        form.append('desc', desc);
        try {
          const res = await fetch(API_BASE + '/api/upload-project', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form });
          if (!res.ok) throw new Error('Upload failed');
          const j = await res.json();
          createProjectCard(j.title, j.desc, j.downloadUrl);
          alert('Upload successful');
          adminZipInput.value = '';
          adminTitle.value = '';
          adminDesc.value = '';
          return;
        } catch (e) {
          console.error(e);
          alert('Backend upload failed, falling back to client-side simulation');
        }
      }

      // fallback: client-side blob
      if (!file) { createProjectCard(title, desc, ''); alert('Added project (no ZIP)'); return; }
      const blobUrl = URL.createObjectURL(file);
      createProjectCard(title, desc, blobUrl);
      alert('Simulated upload: project added and available for local download.');
      adminZipInput.value = '';
      adminTitle.value = '';
      adminDesc.value = '';
    });
  }

  if (simulateVideoBtn) {
    simulateVideoBtn.addEventListener('click', async () => {
      const url = adminVideoUrl.value.trim();
      const title = adminVideoTitle.value.trim() || 'New Video';
      if (!url) { alert('Please enter a video URL'); return; }

      if (token) {
        try {
          const res = await fetch(API_BASE + '/api/add-video', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ title, url }) });
          if (!res.ok) throw new Error('Add video failed');
          const j = await res.json(); createVideoCard(j.title, j.url); adminVideoUrl.value = ''; adminVideoTitle.value = ''; alert('Video added'); return;
        } catch (e) { console.error(e); alert('Backend failed, using client simulation'); }
      }

      createVideoCard(title, url);
      adminVideoUrl.value = '';
      adminVideoTitle.value = '';
      alert('Simulated video added to Videos section.');
    });
  }

  async function tryBackendPing() {
    try {
      const r = await fetch(API_BASE + '/api/ping');
      if (r.ok) { setStatus('Backend available (not logged in)', false); return true; }
    } catch (e) {}
    setStatus('No backend detected — client-only mode', false);
    return false;
  }

  // initial
  tryBackendPing();

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Admin dashboard helpers
  async function listProjects() {
    try {
      const res = await fetch(API_BASE + '/api/projects');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  }

  async function listVideos() {
    try {
      const res = await fetch(API_BASE + '/api/videos');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  }

  async function deleteProject(name) {
    try {
      const tok = token || localStorage.getItem('ownerToken');
      const res = await fetch(API_BASE + '/api/delete-project', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ name }) });
      return res.ok;
    } catch (e) { return false; }
  }

  async function deleteVideo(id) {
    try {
      const tok = token || localStorage.getItem('ownerToken');
      const res = await fetch(API_BASE + '/api/delete-video', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ id }) });
      return res.ok;
    } catch (e) { return false; }
  }

  // load admin dashboard area (if present)
  async function loadAdminDashboard() {
    const projContainer = document.getElementById('adminProjectsList');
    const vidContainer = document.getElementById('adminVideosList');
    if (!projContainer && !vidContainer) return;
    // projects
    const projects = await listProjects();
    const loggedIn = !!(token || localStorage.getItem('ownerToken'));
    if (projContainer) {
      projContainer.innerHTML = '';
      projects.forEach(p => {
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML = `<span class="admin-file">${escapeHtml(p.name)}</span> <a class="btn" href="${p.url}" target="_blank">Download</a>`;
        if (loggedIn) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger';
          delBtn.textContent = 'Delete';
          delBtn.dataset.name = p.name;
          delBtn.addEventListener('click', async () => {
            if (!confirm('Delete file?')) return;
            const ok = await deleteProject(p.name);
            if (ok) { row.remove(); alert('Deleted'); } else alert('Delete failed');
          });
          row.appendChild(delBtn);
        }
        projContainer.appendChild(row);
      });
    }
    // videos
    const videos = await listVideos();
    if (vidContainer) {
      vidContainer.innerHTML = '';
      videos.forEach(v => {
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML = `<span class="admin-file">${escapeHtml(v.title)}</span> <a class="btn" href="${v.url}" target="_blank">Open</a>`;
        if (loggedIn) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger';
          delBtn.textContent = 'Delete';
          delBtn.dataset.id = v.id;
          delBtn.addEventListener('click', async () => {
            if (!confirm('Delete video?')) return;
            const ok = await deleteVideo(v.id);
            if (ok) { row.remove(); alert('Deleted'); } else alert('Delete failed');
          });
          row.appendChild(delBtn);
        }
        vidContainer.appendChild(row);
      });
    }
  }

  // expose admin helpers
  window.adminAPI = { listProjects, listVideos, deleteProject, deleteVideo, loadAdminDashboard, setToken, apiLogin };
});
