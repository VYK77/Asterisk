# Asterisk -> Creatio WebSocket backend

Node.js backend-service for:
- persistent connection to Asterisk AMI;
- processing incoming call events;
- searching for a client in Creatio;
- sending `incoming_call` messages to Chrome extensions via WebSocket.

## Node.js version
- **LTS: Node.js 20.11.1+**

## Quick start
```bash
npm install
cp .env.example .env
npm start
```

### Windows PowerShell
```powershell
Copy-Item .env.example .env
npm install
npm start
```

Before `npm start`, open `.env` and fill in your real values for:
- `ASTERISK_HOST`
- `AMI_USERNAME`
- `AMI_SECRET`
- `CREATIO_BASE_URL`
- `CREATIO_USERNAME`
- `CREATIO_PASSWORD`
- `WS_ALLOWED_ORIGINS`

## Configuration
All secrets should be provided through environment variables, not hardcoded in source files.

| Variable | Purpose |
|---|---|
| `ASTERISK_HOST`, `ASTERISK_PORT` | AMI endpoint, usually `5038` |
| `AMI_USERNAME`, `AMI_SECRET` | AMI credentials |
| `AMI_RECONNECT_DELAY_MS` | reconnect delay |
| `CREATIO_BASE_URL` | base Creatio URL |
| `CREATIO_CONTACTS_ENDPOINT` | contacts OData endpoint |
| `CREATIO_AUTH_TYPE` | `basic` by default |
| `CREATIO_USERNAME`, `CREATIO_PASSWORD` | Creatio credentials |
| `CREATIO_CARD_URL_TEMPLATE` | card URL template, `{id}` is replaced with GUID |
| `WS_PORT`, `WS_PATH` | WebSocket server settings |
| `WS_ALLOWED_ORIGINS` | comma-separated allowed origins |
| `HTTP_PORT` | healthcheck port |

## Implemented flow
1. On startup the service opens a TCP connection to AMI and sends `Action: Login` with `Events: on`.
2. The AMI stream is parsed into blocks separated by empty lines.
3. It handles `Newstate`, `Newchannel`, and `NewCallerid`.
4. Popup trigger: `ChannelStateDesc = Ringing`.
5. The phone number is normalized to `+...`; call state is tracked by `Uniqueid`.
6. The service looks up the client in Creatio by phone number.
7. It broadcasts the following payload to all connected WebSocket clients:

```json
{
  "type": "incoming_call",
  "phone": "+380...",
  "clientName": "...",
  "clientId": "GUID",
  "cardUrl": "https://crm.../{GUID}",
  "operatorExt": "101",
  "callId": "Uniqueid",
  "timestamp": "2026-04-17T10:15:00Z",
  "clientFound": true
}
```

## Healthcheck
`GET /health`

Example response:
```json
{
  "status": "ok",
  "amiConnected": true,
  "websocketActive": true,
  "activeWsClients": 2,
  "trackedCalls": 4,
  "timestamp": "2026-04-17T10:15:00Z"
}
```

## Logging
JSON logs are written to stdout:
- AMI connect and disconnect events;
- login and parsing errors;
- Creatio request errors;
- WebSocket message delivery.
