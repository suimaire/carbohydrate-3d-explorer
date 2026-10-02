"""Local production/offline validation server; stdlib, loopback only.

After npm run build, run this script and visit
http://127.0.0.1:4193/carbohydrate-3d-explorer/ . Stop with Ctrl+C to test the
already installed service worker while the application origin is unavailable.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'dist'
BASE = '/carbohydrate-3d-explorer/'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if not self.path.startswith(BASE):
            self.send_error(404)
            return
        self.path = '/' + self.path[len(BASE):]
        super().do_GET()

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 4193), Handler)
    print('Validation server: http://127.0.0.1:4193' + BASE, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
