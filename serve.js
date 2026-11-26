// 게임을 내 컴퓨터에서 띄워 주는 작은 서버예요.
// 실행: node serve.js  →  http://localhost:5201
// (index.html 을 그냥 더블클릭하면 브라우저가 코드를 막아서 화면이 안 나와요!)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8'
};

// _headers 파일(인터넷에 올릴 때 쓰는 보안 헤더)을 읽어서 여기서도 똑같이 붙여요
function loadHeaders() {
  const out = {};
  try {
    const text = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch (_) {}
  return out;
}

const server = http.createServer((req, res) => {
  // 파일을 보여 주기만 하니까 GET/HEAD 말고는 받지 않아요
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }

  // 주소에 이상한 % 글자가 있으면 서버가 꺼지지 않게 "잘못된 요청"으로 돌려보내요
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (_) { res.writeHead(400).end(); return; }
  if (p.includes('\0')) { res.writeHead(400).end(); return; }
  if (p === '/') p = '/index.html';

  // 게임 폴더 밖의 파일은 절대 못 보게 막아요 (../ 로 빠져나가기 방지)
  // startsWith 로 검사하면 "lake-fishing2" 같은 옆 폴더를 못 막아서, 상대 경로로 확인해요
  const file = path.resolve(ROOT, '.' + p);
  const rel = path.relative(ROOT, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) { res.writeHead(403).end(); return; }

  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, {
      ...loadHeaders(),
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      // 고친 내용이 바로 보이도록 옛날 파일을 기억하지 않게 해요
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
});

// 세이브가 주소(포트)에 묶여 있어서 포트는 항상 5201 로 고정해요
const PORT = Number(process.env.PORT) || 5201;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('\n  이미 게임 서버가 켜져 있어요. 브라우저에서 http://localhost:' + PORT + ' 로 들어가세요.\n');
  } else {
    console.log('서버 오류:', err.message);
  }
});
// 127.0.0.1 = 내 컴퓨터에서만 들어올 수 있어요 (같은 와이파이의 다른 기기는 못 들어와요)
server.listen(PORT, '127.0.0.1', () => {
  console.log('\n  준비됐어요!  ->  http://localhost:' + PORT + '\n');
});
