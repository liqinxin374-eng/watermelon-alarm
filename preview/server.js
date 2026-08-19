const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const ROOT_DIR = __dirname;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. 本地代理接口（支持实时拉取最新云端节假日数据，彻底解决浏览器跨域限制）
  if (req.url.startsWith('/api/proxy-holidays')) {
    const urls = [
      'https://www.xiguazi.online/alarm/holidays.json',
      'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json',
      'http://testingcf.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json'
    ];

    const tryFetch = (index) => {
      if (index >= urls.length) {
        // 读取本地 server/holidays.json 兜底
        const localPath = path.join(ROOT_DIR, '..', 'server', 'holidays.json');
        if (fs.existsSync(localPath)) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          fs.createReadStream(localPath).pipe(res);
          return;
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch holidays' }));
        return;
      }

      const targetUrl = urls[index];
      const client = targetUrl.startsWith('https') ? https : http;
      const r = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 }, (resp) => {
        if (resp.statusCode === 200) {
          let body = '';
          resp.on('data', chunk => body += chunk);
          resp.on('end', () => {
            try {
              const raw = JSON.parse(body);
              if (raw.holidays && raw.makeupWorkdays) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(body);
                return;
              } else if (raw.days) {
                const hList = raw.days.filter(d => d.isOffDay === true).map(d => d.date);
                const mList = raw.days.filter(d => d.isOffDay === false).map(d => d.date);
                const payload = {
                  version: '2026.1-cloud',
                  updatedAt: new Date().toISOString().slice(0, 10) + ' (实时同步)',
                  description: '中国法定节假日与调休补班数据',
                  holidays: hList.sort(),
                  makeupWorkdays: mList.sort()
                };
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(payload, null, 2));
                return;
              }
            } catch (e) {}
            tryFetch(index + 1);
          });
        } else {
          tryFetch(index + 1);
        }
      });
      r.on('error', () => tryFetch(index + 1));
      r.on('timeout', () => { r.destroy(); tryFetch(index + 1); });
    };

    tryFetch(0);
    return;
  }

  // 2. 静态网页服务
  let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT_DIR, 'index.html');
    }
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html' : (ext === '.js' ? 'text/javascript' : (ext === '.css' ? 'text/css' : 'application/octet-stream'));
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Node preview server listening on http://localhost:${PORT}`);
});
