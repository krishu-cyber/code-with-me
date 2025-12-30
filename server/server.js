require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_USERNAME = process.env.OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'change-me-strong-password';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-secret';

// Ensure uploads dir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
// Serve the static site (public pages)
app.use(express.static(path.join(__dirname, '..')));

// simple ping
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username !== OWNER_USERNAME || password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ role: 'owner', username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// upload project ZIP
app.post('/api/upload-project', authMiddleware, upload.single('zip'), (req, res) => {
  const { title, desc } = req.body || {};
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'ZIP file required' });

  const downloadUrl = `/uploads/${path.basename(file.path)}`;
  // In a real app we'd persist metadata to DB. Here we just return the created object.
  res.json({ title: title || file.originalname, desc: desc || '', downloadUrl });
});

// add video metadata
const videosFile = path.join(__dirname, '..', 'data_videos.json');
let videos = [];
try { videos = JSON.parse(fs.readFileSync(videosFile, 'utf8') || '[]'); } catch(e) { videos = []; }

app.post('/api/add-video', authMiddleware, (req, res) => {
  const { title, url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Video URL required' });
  const item = { id: Date.now(), title: title || 'Video', url, createdAt: new Date().toISOString() };
  videos.unshift(item);
  try { fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2)); } catch (e) {}
  res.json(item);
});

// list videos
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// list projects (uploads list)
app.get('/api/projects', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir).map(f => ({ name: f, url: `/uploads/${f}` }));
    res.json(files);
  } catch (e) { res.json([]); }
});

// delete a project (uploaded file)
app.post('/api/delete-project', authMiddleware, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing file name' });
  const target = path.join(uploadsDir, path.basename(name));
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Unable to delete' });
  }
});

// delete a video metadata entry
app.post('/api/delete-video', authMiddleware, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const nid = Number(id);
  const idx = videos.findIndex(v => v.id === nid);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  videos.splice(idx, 1);
  try { fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2)); } catch (e) {}
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log('Set OWNER_PASSWORD and JWT_SECRET in .env for security');
});
