const http = require('http');

const PORT = process.env.PORT || 18789;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', version: 'mock-1.0' }));
  }
  
  if (req.method === 'GET' && req.url === '/config') {
    res.writeHead(200);
    return res.end(JSON.stringify({ mock_config: true }));
  }
  
  if (req.method === 'PUT' && req.url === '/config') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, message: 'Config updated' }));
  }
  
  if (req.method === 'POST' && req.url === '/runs') {
    res.writeHead(201);
    return res.end(JSON.stringify({ id: 'run_gw_mock_123', status: 'queued' }));
  }
  
  if (req.method === 'GET' && req.url.startsWith('/runs/')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'succeeded', result: 'Mock gateway execution completed' }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock OpenClaw Gateway running on http://127.0.0.1:${PORT}`);
});
