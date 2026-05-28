#!/usr/bin/env python3
"""
정적 파일 서버 (VRP 배차 시뮬레이터)
- dist/ 디렉토리를 서빙
- SPA 라우팅 지원 (모든 경로 → index.html)
- CORS 허용
"""
import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 3000
DIST_DIR = Path(__file__).parent / "dist"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # 실제 파일이 존재하면 그대로 서빙
        file_path = DIST_DIR / self.path.lstrip("/")
        if file_path.exists() and file_path.is_file():
            super().do_GET()
        else:
            # SPA fallback → index.html
            self.path = "/index.html"
            super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

if __name__ == "__main__":
    os.chdir(DIST_DIR)
    with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"✅ VRP 배차 시뮬레이터 서버 실행 중 → http://0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()
