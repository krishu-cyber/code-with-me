# Backend for CodeWithMe (local)

This small Express backend provides owner-only endpoints to upload project ZIPs and add video metadata.

Quick start:

1. Copy `.env.example` to `.env` and set secure values:

```bash
cp server/.env.example server/.env
# edit server/.env and set OWNER_PASSWORD and JWT_SECRET
```

2. Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

3. The backend runs on `http://localhost:3000` by default. It exposes:
- `POST /api/login` { password }
- `POST /api/upload-project` (multipart form, fields: title, desc, file field name `zip`) Authorization: Bearer <token>
- `POST /api/add-video` { title, url } Authorization: Bearer <token>
- `GET /api/projects` list uploaded files
- `GET /api/videos` list added videos

Notes:
- This backend stores uploaded ZIPs in `/uploads` and video metadata in `data_videos.json` (no DB).
- For production use, add HTTPS, proper authentication, and persistent storage.

Admin / Owner workflow and environment variables
-----------------------------------------------

- The admin dashboard is available at `/admin-dashboard.html` (served by the same server). It allows the owner to view uploaded projects and videos, and — when authenticated — delete items.

- Authentication:
	- The backend expects an owner username and password via `POST /api/login` with JSON body `{ "username": "owner", "password": "..." }`.
	- On successful login the server returns a JWT which the frontend stores in `localStorage` as `ownerToken` and uses for protected requests.

- Environment variables:
	- `OWNER_USERNAME` — owner username (default: `owner`).
	- `OWNER_PASSWORD` — owner password (set a strong value before exposing the server).
	- `JWT_SECRET` — secret used to sign JWTs; set to a strong random value in production.

- Security notes:
	- Owner-only actions (upload/delete) are protected by the JWT and the server-side `authMiddleware`.
	- The frontend hides owner-only controls when no valid token is present, but the server enforces checks — do not rely on client-side hiding alone.
	- For production, run the server behind HTTPS and consider using a proper user store and rotation for secrets.
