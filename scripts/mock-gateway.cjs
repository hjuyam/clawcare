const http = require('http');
const PORT = process.env.PORT || 18789;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    let payload = {};
    try { payload = body ? JSON.parse(body) : {}; } catch(e){}

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: 'ok', version: 'mock-1.0-m6' }));
    }
    
    if (req.method === 'GET' && req.url === '/config') {
      res.writeHead(200);
      return res.end(JSON.stringify({ mock_config: true }));
    }
    
    if (req.method === 'PUT' && req.url === '/config') {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, message: 'Config updated' }));
    }
    
    if (req.method === 'POST' && req.url === '/api/exec') {
      res.writeHead(201);
      return res.end(JSON.stringify({ sessionId: 'session_gw_mock_123', status: 'background' }));
    }
    
    if (req.method === 'POST' && req.url === '/api/process') {
      res.writeHead(200);
      return res.end(JSON.stringify({ 
        sessionId: payload.sessionId || 'unknown', 
        status: 'finished', 
        exitCode: 0,
        output: 'Mock gateway execution completed from /api/process' 
      }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found: ' + req.url }));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock OpenClaw Gateway M6 running on http://127.0.0.1:${PORT}`);
});
