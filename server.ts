import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'M.GAMMON Smart Attendance and HR System',
    version: '2.5.0',
    timestamp: new Date().toISOString()
  });
});

// Serve static assets from dist in production
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// Fallback to index.html for client-side routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
