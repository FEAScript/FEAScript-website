#   _____   _____               _____                 _                    #
#  |  ___) |  ___)     /\      /  ___)               (_)             _     #
#  | |___  | |___     /  \    | (___     ____   ___   _    ____    _| |_   # 
#  |  ___) |  ___)   / /\ \    \___ \   / ___) |  _) | |  |  _ \  |_   _)  # 
#  | |     | |___   / ____ \   ____) ) | |___  | /   | |  | |_) )   | |    # 
#  |_|     |_____) /_/    \_\ |_____/   \____) |/    |_|  |  __/    | |    # 
#                                                         | |       | |    #
#                                                         |_|       | |    #
#        Website:  www.feacript.com                                 \ __\  #

#
# Set up a Python HTTP Server with CORS Support. It is configured to run on port 8000.
#

import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = ".."

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Ensure the path does not have leading slashes
        path = path.lstrip('/')
        # Join the parent directory with the requested path
        full_path = os.path.join(DIRECTORY, path)
        # Resolve the full path
        return os.path.abspath(full_path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'x-api-key, Content-Type')
        return super(CORSRequestHandler, self).end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'x-api-key, Content-Type')
        self.end_headers()

handler = CORSRequestHandler
handler.extensions_map.update({
    ".js": "application/javascript",
})

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()