diff --git a/src/ws-server.js b/src/ws-server.js
new file mode 100644
index 0000000000000000000000000000000000000000..fd7a3d68a555c137790752c20332f1394045d1de
--- /dev/null
+++ b/src/ws-server.js
@@ -0,0 +1,68 @@
+import { WebSocketServer } from 'ws';
+import { logger } from './logger.js';
+
+export class WsHub {
+  constructor({ port, path, allowedOrigins }) {
+    this.port = port;
+    this.path = path;
+    this.allowedOrigins = allowedOrigins;
+    this.clients = new Set();
+    this.server = null;
+  }
+
+  start() {
+    this.server = new WebSocketServer({
+      port: this.port,
+      path: this.path,
+      verifyClient: ({ origin }) => this.verifyOrigin(origin)
+    });
+
+    this.server.on('connection', (socket) => {
+      this.clients.add(socket);
+      logger.info('WebSocket client connected', { clients: this.clients.size });
+
+      socket.on('close', () => {
+        this.clients.delete(socket);
+        logger.info('WebSocket client disconnected', { clients: this.clients.size });
+      });
+
+      socket.on('error', (error) => {
+        logger.warn('WebSocket client error', { error: error.message });
+      });
+    });
+
+    this.server.on('listening', () => {
+      logger.info('WebSocket server started', { port: this.port, path: this.path });
+    });
+
+    this.server.on('error', (error) => {
+      logger.error('WebSocket server error', { error: error.message });
+    });
+  }
+
+  broadcast(payload) {
+    const message = JSON.stringify(payload);
+    let sent = 0;
+
+    for (const client of this.clients) {
+      if (client.readyState === client.OPEN) {
+        client.send(message);
+        sent += 1;
+      }
+    }
+
+    logger.info('WebSocket message sent', { type: payload.type, sent });
+  }
+
+  get isHealthy() {
+    return Boolean(this.server?.address());
+  }
+
+  verifyOrigin(origin) {
+    if (!this.allowedOrigins.length) {
+      return true;
+    }
+
+    return this.allowedOrigins.includes(origin);
+  }
+}
