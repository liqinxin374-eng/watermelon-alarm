import http.server
import socketserver
import urllib.request
import json
import os

PORT = 8081
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/proxy-holidays'):
            # 1. 优先从 CDN 镜像实时拉取最新 2026 数据
            urls = [
                'http://testingcf.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json',
                'http://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json'
            ]
            for u in urls:
                try:
                    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=4) as resp:
                        if resp.status == 200:
                            raw = json.loads(resp.read().decode('utf-8'))
                            h_list = [item['date'] for item in raw.get('days', []) if item.get('isOffDay')]
                            m_list = [item['date'] for item in raw.get('days', []) if item.get('isOffDay') is False]
                            payload = {
                                "version": "2026.1-cloud",
                                "updatedAt": "2026-08-19 (实时同步)",
                                "description": "中国法定节假日与调休补班数据（云端直连）",
                                "holidays": sorted(h_list),
                                "makeupWorkdays": sorted(m_list)
                            }
                            content = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')
                            self.send_response(200)
                            self.send_header('Content-Type', 'application/json; charset=utf-8')
                            self.end_headers()
                            self.wfile.write(content)
                            return
                except Exception:
                    continue

            # 2. 兜底返回本地备份
            local_json_path = os.path.join(ROOT_DIR, '..', 'server', 'holidays.json')
            if os.path.exists(local_json_path):
                with open(local_json_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(content)
                return

            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Failed to fetch holidays"}')
            return

        return super().do_GET()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Preview server listening on http://localhost:{PORT}")
        httpd.serve_forever()
