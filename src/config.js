diff --git a/src/config.js b/src/config.js
new file mode 100644
index 0000000000000000000000000000000000000000..b1f556f35db2f432b1ee8ac280fc7036c69642d5
--- /dev/null
+++ b/src/config.js
@@ -0,0 +1,53 @@
+import dotenv from 'dotenv';
+
+dotenv.config();
+
+const required = [
+  'ASTERISK_HOST',
+  'AMI_USERNAME',
+  'AMI_SECRET',
+  'CREATIO_BASE_URL',
+  'CREATIO_CONTACTS_ENDPOINT',
+  'CREATIO_CARD_URL_TEMPLATE'
+];
+
+for (const key of required) {
+  if (!process.env[key]) {
+    throw new Error(`Missing required environment variable: ${key}`);
+  }
+}
+
+export const config = {
+  nodeLts: process.env.NODE_LTS_VERSION ?? '20.11.1',
+  ami: {
+    host: process.env.ASTERISK_HOST,
+    port: Number(process.env.ASTERISK_PORT ?? 5038),
+    username: process.env.AMI_USERNAME,
+    secret: process.env.AMI_SECRET,
+    reconnectDelayMs: Number(process.env.AMI_RECONNECT_DELAY_MS ?? 5000)
+  },
+  creatio: {
+    baseUrl: process.env.CREATIO_BASE_URL,
+    contactsEndpoint: process.env.CREATIO_CONTACTS_ENDPOINT,
+    username: process.env.CREATIO_USERNAME,
+    password: process.env.CREATIO_PASSWORD,
+    authType: process.env.CREATIO_AUTH_TYPE ?? 'basic',
+    cardUrlTemplate: process.env.CREATIO_CARD_URL_TEMPLATE
+  },
+  websocket: {
+    port: Number(process.env.WS_PORT ?? 8080),
+    path: process.env.WS_PATH ?? '/ws',
+    allowedOrigins: splitList(process.env.WS_ALLOWED_ORIGINS)
+  },
+  http: {
+    port: Number(process.env.HTTP_PORT ?? 8081)
+  }
+};
+
+function splitList(input) {
+  if (!input) {
+    return [];
+  }
+
+  return input.split(',').map((item) => item.trim()).filter(Boolean);
+}
