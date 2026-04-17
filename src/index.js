diff --git a/src/index.js b/src/index.js
new file mode 100644
index 0000000000000000000000000000000000000000..61bcf2c4ba8ef9c6086a287162858c813cded985
--- /dev/null
+++ b/src/index.js
@@ -0,0 +1,95 @@
+import express from 'express';
+import { AmiClient } from './ami-client.js';
+import { config } from './config.js';
+import { CreatioClient } from './creatio-client.js';
+import { logger } from './logger.js';
+import { normalizePhone, buildIncomingCallPayload } from './utils.js';
+import { WsHub } from './ws-server.js';
+
+const ami = new AmiClient(config.ami);
+const creatio = new CreatioClient(config.creatio);
+const wsHub = new WsHub(config.websocket);
+const callState = new Map();
+
+ami.on('ami_event', async (event) => {
+  try {
+    await handleAmiEvent(event);
+  } catch (error) {
+    logger.error('Failed to process AMI event', { error: error.message, event: event.Event });
+  }
+});
+
+ami.start();
+wsHub.start();
+startHealthServer();
+
+async function handleAmiEvent(event) {
+  const targetEvents = new Set(['Newstate', 'Newchannel', 'NewCallerid']);
+  if (!targetEvents.has(event.Event)) {
+    return;
+  }
+
+  const callId = event.Uniqueid;
+  if (!callId) {
+    return;
+  }
+
+  const phone = normalizePhone(event.CallerIDNum);
+  const operatorExt = event.Exten || event.ConnectedLineNum || parseOperatorFromChannel(event.Channel);
+
+  const prev = callState.get(callId) ?? { popupSent: false };
+  const mergedState = {
+    ...prev,
+    phone: phone || prev.phone,
+    operatorExt: operatorExt || prev.operatorExt,
+    latestEvent: event.Event,
+    latestChannelState: event.ChannelStateDesc
+  };
+
+  callState.set(callId, mergedState);
+
+  const ringing = event.ChannelStateDesc === 'Ringing';
+  if (!ringing || mergedState.popupSent || !mergedState.phone) {
+    return;
+  }
+
+  const crmResult = await creatio.findClientByPhone(mergedState.phone);
+  const payload = buildIncomingCallPayload({
+    event,
+    phone: mergedState.phone,
+    crmResult,
+    callId,
+    operatorExt: mergedState.operatorExt ?? ''
+  });
+
+  wsHub.broadcast(payload);
+  callState.set(callId, { ...mergedState, popupSent: true });
+}
+
+function parseOperatorFromChannel(channel) {
+  if (!channel) {
+    return '';
+  }
+
+  const match = channel.match(/\/(\d+)-/);
+  return match?.[1] ?? '';
+}
+
+function startHealthServer() {
+  const app = express();
+
+  app.get('/health', (_req, res) => {
+    res.json({
+      status: ami.isHealthy && wsHub.isHealthy ? 'ok' : 'degraded',
+      amiConnected: ami.isHealthy,
+      websocketActive: wsHub.isHealthy,
+      activeWsClients: wsHub.clients.size,
+      trackedCalls: callState.size,
+      timestamp: new Date().toISOString()
+    });
+  });
+
+  app.listen(config.http.port, () => {
+    logger.info('Health server started', { port: config.http.port });
+  });
+}
