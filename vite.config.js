import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually for local development
if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  const envConfig = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  envConfig.replace(/\r/g, '').split('\n').forEach(line => {
    const match = line.trim().match(/^([^#=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      process.env[key] = value;
    }
  });
}

// A simple Vite plugin to execute Vercel Serverless Functions locally
const localApiProxy = () => ({
  name: 'local-api-proxy',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            req.body = JSON.parse(body);
            // Mock Vercel res methods
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
            
            // Execute the serverless function
            const handlerPath = path.resolve(process.cwd(), 'api', 'analyze.js');
            const handlerUrl = pathToFileURL(handlerPath).href + '?t=' + Date.now();
            const handlerModule = await import(handlerUrl);
            await handlerModule.default(req, res);
          } catch (err) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiProxy()],
  server: {
    port: 3000,
  }
})
