// =====================================================
//  노을 호수 낚시 — 멀티플레이 서버
//  1) 게임 파일(html, js, css...)을 보여 줘요
//  2) /ws 로 접속한 사람들을 "방"으로 묶어서 서로의 모습을 전해 줘요 (방 하나에 최대 5명)
//  외부 패키지 없이 Node 기본 기능만 써요. → npm install 이 필요 없어요.
//
//  실행: node server.js   →   http://localhost:5201
//  인터넷(Render 등)에 올리면 HOST=0.0.0.0 으로 열려요. (PORT 는 호스팅이 정해 줘요)
// =====================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT) || 5201;
// 내 컴퓨터에서는 나만 들어오게(127.0.0.1), 호스팅에서는 누구나(0.0.0.0)
const HOST = process.env.HOST || (process.env.RENDER || process.env.PORT ? '0.0.0.0' : '127.0.0.1');

const MAX_PER_ROOM = 5;        // 방 하나에 최대 5명
const MAX_ROOMS = 200;
const MAX_PER_IP = 6;          // 한 집(같은 와이파이 = 같은 IP)에서 동시에 접속할 수 있는 수
const MAX_MSG_BYTES = 2048;    // 메시지 하나 최대 크기
const MAX_MSG_PER_SEC = 40;    // 1초에 보낼 수 있는 메시지 수 (넘으면 버려요)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8'
};

// ---------- 보안 헤더 (_headers 파일 내용을 그대로 써요) ----------
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
// 이 서버에서는 같은 주소의 웹소켓(ws/wss)에 연결해도 되게 CSP 에 더해 줘요
const SAFE_HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;
function headersFor(req) {
  const h = loadHeaders();
  const host = String(req.headers.host || '');
  if (h['Content-Security-Policy'] && SAFE_HOST.test(host)) {
    h['Content-Security-Policy'] = h['Content-Security-Policy'].replace('connect-src ', `connect-src ws://${host} wss://${host} `);
  }
  return h;
}

// ---------- 게임 파일 보여 주기 ----------
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (_) { res.writeHead(400).end(); return; }
  if (p.includes('\0')) { res.writeHead(400).end(); return; }
  if (p === '/') p = '/index.html';
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return; }
  const file = path.resolve(ROOT, '.' + p);
  const rel = path.relative(ROOT, file);
  // 게임 폴더 밖, 숨김 파일(.git 등), 서버 코드는 안 보여 줘요
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((s) => s.startsWith('.')) || rel === 'server.js') {
    res.writeHead(403).end(); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, {
      ...headersFor(req),
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
});

// =====================================================
//  웹소켓 (직접 만든 작은 버전)
//  브라우저 ↔ 서버가 계속 연결된 채로 짧은 메시지를 주고받는 통로예요
// =====================================================
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ipCount = new Map();

function wsSend(sock, text) {
  if (sock.destroyed) return;
  const data = Buffer.from(text);
  let head;
  if (data.length < 126) head = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else return; // 너무 큰 메시지는 안 보내요
  sock.write(Buffer.concat([head, data]));
}
function wsClose(sock, code = 1000) {
  if (sock.destroyed) return;
  const b = Buffer.alloc(4); b[0] = 0x88; b[1] = 2; b.writeUInt16BE(code, 2);
  try { sock.end(b); } catch (_) {}
}

server.on('upgrade', (req, sock) => {
  if ((req.url || '').split('?')[0] !== '/ws' || String(req.headers.upgrade).toLowerCase() !== 'websocket') { sock.destroy(); return; }
  // 다른 사이트에서 몰래 접속하는 걸 막아요 (Origin 이 이 서버 주소와 같아야 해요)
  const origin = String(req.headers.origin || '');
  const host = String(req.headers.host || '');
  if (!origin || !SAFE_HOST.test(host) || (origin !== `http://${host}` && origin !== `https://${host}`)) { sock.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string' || key.length > 40) { sock.destroy(); return; }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if ((ipCount.get(ip) || 0) >= MAX_PER_IP) { sock.destroy(); return; }
  ipCount.set(ip, (ipCount.get(ip) || 0) + 1);

  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);

  const client = { sock, ip, id: crypto.randomBytes(4).toString('hex'), room: null, name: '', look: 0, state: null, msgs: 0, msgWindow: Date.now(), alive: true };
  let buf = Buffer.alloc(0);

  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > MAX_MSG_BYTES * 4) { wsClose(sock, 1009); return; }
    // 프레임 하나씩 꺼내 읽어요
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { wsClose(sock, 1009); return; }
      if (!masked) { wsClose(sock, 1002); return; } // 브라우저는 꼭 가려서(mask) 보내요
      if (len > MAX_MSG_BYTES) { wsClose(sock, 1009); return; }
      if (buf.length < off + 4 + len) return;
      const mask = buf.slice(off, off + 4);
      const data = Buffer.alloc(len);
      for (let i = 0; i < len; i++) data[i] = buf[off + 4 + i] ^ mask[i % 4];
      buf = buf.slice(off + 4 + len);
      if (op === 0x8) { wsClose(sock); return; }
      if (op === 0x9) { const pong = Buffer.concat([Buffer.from([0x8a, data.length]), data]); sock.write(pong); continue; }
      if (op === 0xa) { client.alive = true; continue; }
      if (op !== 0x1) continue; // 글자 메시지만 받아요
      // 1초에 너무 많이 보내면 버려요
      const now = Date.now();
      if (now - client.msgWindow > 1000) { client.msgWindow = now; client.msgs = 0; }
      if (++client.msgs > MAX_MSG_PER_SEC) continue;
      let msg;
      try { msg = JSON.parse(data.toString('utf8')); } catch (_) { continue; }
      if (msg && typeof msg === 'object') handle(client, msg);
    }
  });
  const bye = () => {
    if (client.gone) return;
    client.gone = true;
    ipCount.set(ip, Math.max(0, (ipCount.get(ip) || 1) - 1));
    leave(client);
  };
  sock.on('close', bye);
  sock.on('error', bye);
  sock.setTimeout(60000, () => wsClose(sock, 1001)); // 1분 동안 아무 말 없으면 끊어요
});

// =====================================================
//  방 관리
// =====================================================
const rooms = new Map(); // 방 코드 → Set(client)
const clean = (s, max) => String(s ?? '').replace(/[<>&"'`\\\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : 0);
const ROOM_RE = /^[A-Z0-9]{3,8}$/;

function broadcast(room, obj, except) {
  const set = rooms.get(room);
  if (!set) return;
  const text = JSON.stringify(obj);
  for (const c of set) if (c !== except) wsSend(c.sock, text);
}
function leave(c) {
  if (!c.room) return;
  const set = rooms.get(c.room);
  if (set) {
    set.delete(c);
    broadcast(c.room, { t: 'leave', id: c.id });
    if (!set.size) rooms.delete(c.room);
  }
  c.room = null;
}
// 이동·모습 정보는 숫자와 정해진 글자만 받아서 다시 만들어요 (이상한 값은 버려요)
const ANIMS = new Set(['idle', 'walk', 'charge', 'cast', 'wait', 'bite', 'reel', 'caught', 'swim', 'sit', 'hold']);
function cleanState(s) {
  if (!s || typeof s !== 'object') return null;
  const bob = Array.isArray(s.b) && s.b.length === 3 ? s.b.map((v) => num(v, -200, 200)) : null;
  return {
    x: num(s.x, -200, 200), y: num(s.y, -5, 30), z: num(s.z, -200, 200), r: num(s.r, -100, 100),
    a: ANIMS.has(s.a) ? s.a : 'idle', rod: Math.floor(num(s.rod, -1, 30)),
    f: s.f ? clean(s.f, 20) : null, m: s.m ? clean(s.m, 16) : null, n: Math.floor(num(s.n, 0, 1e9)), b: bob
  };
}

function handle(c, msg) {
  if (msg.t === 'join') {
    const room = clean(msg.room, 8).toUpperCase() || 'PLAZA';
    if (!ROOM_RE.test(room)) { wsSend(c.sock, JSON.stringify({ t: 'error', msg: '방 코드는 영어 대문자·숫자 3~8글자예요.' })); return; }
    leave(c);
    if (!rooms.has(room) && rooms.size >= MAX_ROOMS) { wsSend(c.sock, JSON.stringify({ t: 'error', msg: '지금 서버에 방이 너무 많아요. 잠시 뒤에 다시 해 주세요.' })); return; }
    const set = rooms.get(room) || new Set();
    if (set.size >= MAX_PER_ROOM) { wsSend(c.sock, JSON.stringify({ t: 'full', max: MAX_PER_ROOM })); return; }
    c.name = clean(msg.name, 12) || '낚시꾼';
    c.look = Math.floor(num(msg.look, 0, 20));
    c.state = cleanState(msg.s);
    c.room = room;
    set.add(c);
    rooms.set(room, set);
    // 나에게: 내 번호와 이미 있는 사람들 / 다른 사람들에게: 새로 온 나
    const others = [...set].filter((o) => o !== c).map((o) => ({ id: o.id, name: o.name, look: o.look, s: o.state }));
    wsSend(c.sock, JSON.stringify({ t: 'welcome', id: c.id, room, max: MAX_PER_ROOM, players: others }));
    broadcast(room, { t: 'join', id: c.id, name: c.name, look: c.look, s: c.state }, c);
    return;
  }
  if (!c.room) return;
  if (msg.t === 's') {
    c.state = cleanState(msg.s);
    if (c.state) broadcast(c.room, { t: 's', id: c.id, s: c.state }, c);
  } else if (msg.t === 'catch') {
    // 잡은 물고기 소식: 이름·이로치·무게만 전해요
    broadcast(c.room, { t: 'catch', id: c.id, f: clean(msg.f, 20), m: msg.m ? clean(msg.m, 16) : null, w: num(msg.w, 0, 10000) }, c);
  } else if (msg.t === 'leave') {
    leave(c);
  }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.log('\n  이미 게임 서버가 켜져 있어요. 브라우저에서 http://localhost:' + PORT + ' 로 들어가세요.\n');
  else console.log('서버 오류:', err.message);
});
server.listen(PORT, HOST, () => {
  console.log('\n  준비됐어요!  ->  http://localhost:' + PORT + (HOST === '0.0.0.0' ? '  (인터넷에서도 접속 가능)' : '') + '\n');
});
