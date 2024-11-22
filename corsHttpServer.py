#   ______ ______           _____           _       _     #
#  |  ____|  ____|   /\    / ____|         (_)     | |    #
#  | |__  | |__     /  \  | (___   ___ ____ _ ____ | |_   #
#  |  __| |  __|   / /\ \  \___ \ / __|  __| |  _ \| __|  #
#  | |    | |____ / ____ \ ____) | (__| |  | | |_) | |    #
#  |_|    |______/_/    \_\_____/ \___|_|  |_|  __/| |    #
#                                            | |   | |    #
#                                            |_|   | |_   #
#       Website: https://feascript.com/             \__|  #

#
# Set up a Python HTTP Server with CORS Support
#

import http.server
import socketserver
import os

# Define the port on which the server will run
PORT = 8000
# Define the directory to serve files from
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

# Create and start the server
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()