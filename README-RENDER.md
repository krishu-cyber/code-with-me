Render deployment notes

1. How to deploy
   - Sign in to Render (https://render.com) and create a new Web Service.
   - Connect your GitHub repo `krishu-cyber/code-with-me`.
   - Render will detect `render.yaml` at repo root and create a service named `code-with-me-server`.
   - Provide the environment variables in Render dashboard: `OWNER_PASSWORD`, `JWT_SECRET`.

2. Local start command used by Render
   - Build command: `cd server && npm install`
   - Start command: `cd server && npm start`

3. Notes
   - The service runs the Node backend located in the `server/` folder.
   - For testing from the GitHub Pages frontend, set the backend's public URL in your frontend config or update `assets/js` to use the deployed API URL.
