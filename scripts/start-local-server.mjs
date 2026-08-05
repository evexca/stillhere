import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';

const dev = true;
const hostname = '127.0.0.1';
const port = 3000;

console.log('🚀 Starting Stillhere server on http://127.0.0.1:3000...');
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, hostname, () => {
    console.log(`✅ Stillhere server active on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});
