diff --git a/src/logger.js b/src/logger.js
new file mode 100644
index 0000000000000000000000000000000000000000..569f90211d5e802a8d7b63d6daf3d8911a799a5a
--- /dev/null
+++ b/src/logger.js
@@ -0,0 +1,26 @@
+export const logger = {
+  info(message, meta = {}) {
+    log('INFO', message, meta);
+  },
+  warn(message, meta = {}) {
+    log('WARN', message, meta);
+  },
+  error(message, meta = {}) {
+    log('ERROR', message, meta);
+  },
+  debug(message, meta = {}) {
+    if (process.env.LOG_LEVEL === 'debug') {
+      log('DEBUG', message, meta);
+    }
+  }
+};
+
+function log(level, message, meta) {
+  const payload = {
+    level,
+    message,
+    ...meta,
+    timestamp: new Date().toISOString()
+  };
+  console.log(JSON.stringify(payload));
+}
