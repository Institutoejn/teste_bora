import app from '../server';

export default function handler(req: any, res: any) {
  // Normaliza o caminho caso o Vercel tenha reescrito /api/(.*) -> /api
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && typeof matchedPath === 'string') {
    req.url = matchedPath;
  } else if ((req.url === '/api' || req.url === '/api/') && req.query?.__path) {
    req.url = `/api/${req.query.__path}`;
  }
  return app(req, res);
}

export { app };

