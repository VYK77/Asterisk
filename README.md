diff --git a/README.md b/README.md
index 627c16531a0981be2e7f1d13e426241d43efc8ea..5309bf641b115cc98f7ba7c8b77065b637b707d6 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,116 @@
-# Asterisk
\ No newline at end of file
+# Asterisk → Creatio WebSocket backend
+
+Node.js backend-сервис для:
+- постоянного подключения к Asterisk AMI;
+- обработки событий входящих звонков;
+- поиска клиента в Creatio;
+- отправки `incoming_call` сообщений Chrome-расширениям через WebSocket.
+
+## Node.js версия
+- **LTS: Node.js 20.11.1+**.
+
+## Быстрый старт
+```bash
+npm install
+cp .env.example .env
+npm start
+```
+
+## Конфигурация (env)
+Все секреты задаются только через переменные окружения (или внешний secrets manager), не в коде.
+
+| Переменная | Назначение |
+|---|---|
+| `ASTERISK_HOST`, `ASTERISK_PORT` | AMI endpoint (обычно `5038`) |
+| `AMI_USERNAME`, `AMI_SECRET` | AMI credentials |
+| `AMI_RECONNECT_DELAY_MS` | задержка переподключения |
+| `CREATIO_BASE_URL` | базовый URL Creatio |
+| `CREATIO_CONTACTS_ENDPOINT` | OData endpoint контактов |
+| `CREATIO_AUTH_TYPE` | `basic` (по умолчанию) |
+| `CREATIO_USERNAME`, `CREATIO_PASSWORD` | учетные данные Creatio |
+| `CREATIO_CARD_URL_TEMPLATE` | шаблон карточки, `{id}` заменяется на GUID |
+| `WS_PORT`, `WS_PATH` | параметры WebSocket сервера |
+| `WS_ALLOWED_ORIGINS` | список origin через запятую |
+| `HTTP_PORT` | порт healthcheck endpoint |
+
+## Реализованная логика
+1. При старте открывается TCP-соединение к AMI и выполняется `Action: Login` c `Events: on`.
+2. AMI поток парсится на блоки, разделенные пустой строкой, и преобразуется в объект.
+3. Обрабатываются события `Newstate`/`Newchannel`/`NewCallerid`.
+4. Попап-триггер: `ChannelStateDesc = Ringing` (базовый обязательный сценарий).
+5. Номер нормализуется к формату `+...`; состояние звонка хранится по `Uniqueid`.
+6. Выполняется lookup клиента в Creatio по телефону (REST/OData).
+7. Формируется и рассылается всем WebSocket клиентам событие:
+
+```json
+{
+  "type": "incoming_call",
+  "phone": "+380...",
+  "clientName": "...",
+  "clientId": "GUID",
+  "cardUrl": "https://crm.../{GUID}",
+  "operatorExt": "101",
+  "callId": "Uniqueid",
+  "timestamp": "2026-04-17T10:15:00Z",
+  "clientFound": true
+}
+```
+
+## Healthcheck
+`GET /health`
+
+Пример ответа:
+```json
+{
+  "status": "ok",
+  "amiConnected": true,
+  "websocketActive": true,
+  "activeWsClients": 2,
+  "trackedCalls": 4,
+  "timestamp": "2026-04-17T10:15:00Z"
+}
+```
+
+## Логирование
+JSON-логи в stdout:
+- подключение/отключение AMI;
+- ошибки логина и парсинга;
+- ошибки запроса к Creatio;
+- отправка WebSocket-сообщений.
+
+## Запуск как постоянный сервис
+
+### Docker
+```dockerfile
+FROM node:20.11.1-alpine
+WORKDIR /app
+COPY package*.json ./
+RUN npm ci --omit=dev
+COPY . .
+CMD ["node", "src/index.js"]
+```
+
+Рекомендуемый restart policy: `--restart=always`.
+
+### systemd (пример)
+```ini
+[Unit]
+Description=Asterisk Creatio Backend
+After=network.target
+
+[Service]
+Type=simple
+WorkingDirectory=/opt/asterisk-backend
+ExecStart=/usr/bin/node /opt/asterisk-backend/src/index.js
+Restart=always
+RestartSec=5
+EnvironmentFile=/opt/asterisk-backend/.env
+
+[Install]
+WantedBy=multi-user.target
+```
+
+## Безопасность
+- AMI должен быть ограничен в `manager.conf` по IP (например, `permit=10.2.5.7/255.255.255.255`).
+- Используйте отдельного AMI-пользователя с минимальными правами.
+- Ограничивайте WebSocket origin через `WS_ALLOWED_ORIGINS`.
