diff --git a/src/creatio-client.js b/src/creatio-client.js
new file mode 100644
index 0000000000000000000000000000000000000000..eb29006276f3dac7a26014ce9e208b310f499836
--- /dev/null
+++ b/src/creatio-client.js
@@ -0,0 +1,70 @@
+import { logger } from './logger.js';
+
+export class CreatioClient {
+  constructor(config) {
+    this.config = config;
+  }
+
+  async findClientByPhone(phone) {
+    const requestUrl = new URL(this.config.contactsEndpoint, this.config.baseUrl);
+    requestUrl.searchParams.set('$filter', `contains(MobilePhone,'${escapeODataLiteral(phone)}')`);
+    requestUrl.searchParams.set('$top', '1');
+
+    try {
+      const response = await fetch(requestUrl, {
+        headers: this.buildHeaders()
+      });
+
+      if (!response.ok) {
+        throw new Error(`Creatio responded with status ${response.status}`);
+      }
+
+      const body = await response.json();
+      const row = body?.value?.[0];
+      if (!row) {
+        return {
+          clientFound: false,
+          clientId: null,
+          clientName: phone || 'Unknown caller',
+          cardUrl: this.config.cardUrlTemplate.replace('{id}', 'new')
+        };
+      }
+
+      const clientId = row.Id;
+      const clientName = row.Name ?? row.ContactName ?? row.AccountName ?? 'Creatio contact';
+
+      return {
+        clientFound: true,
+        clientId,
+        clientName,
+        cardUrl: this.config.cardUrlTemplate.replace('{id}', clientId)
+      };
+    } catch (error) {
+      logger.error('Creatio lookup failed', { error: error.message, phone });
+
+      return {
+        clientFound: false,
+        clientId: null,
+        clientName: phone || 'Unknown caller',
+        cardUrl: this.config.cardUrlTemplate.replace('{id}', 'new')
+      };
+    }
+  }
+
+  buildHeaders() {
+    const headers = {
+      Accept: 'application/json'
+    };
+
+    if (this.config.authType === 'basic' && this.config.username && this.config.password) {
+      const token = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
+      headers.Authorization = `Basic ${token}`;
+    }
+
+    return headers;
+  }
+}
+
+function escapeODataLiteral(text) {
+  return String(text).replace(/'/g, "''");
+}
