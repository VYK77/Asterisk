import EventEmitter from 'node:events';
import net from 'node:net';
import { logger } from './logger.js';
import { parseAmiBlock } from './utils.js';

export class AmiClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.buffer = '';
    this.connected = false;
    this.reconnectTimer = null;
  }

  start() {
    this.connect();
  }

  connect() {
    this.socket = net.createConnection({
      host: this.config.host,
      port: this.config.port
    });

    this.socket.setEncoding('utf8');

    this.socket.on('connect', () => {
      logger.info('Connected to AMI', { host: this.config.host, port: this.config.port });
      this.login();
    });

    this.socket.on('data', (chunk) => {
      this.buffer += chunk;
      this.processBuffer();
    });

    this.socket.on('error', (error) => {
      logger.error('AMI socket error', { error: error.message });
      this.connected = false;
    });

    this.socket.on('close', () => {
      logger.warn('AMI connection closed');
      this.connected = false;
      this.scheduleReconnect();
    });
  }

  login() {
    this.sendAction({
      Action: 'Login',
      Username: this.config.username,
      Secret: this.config.secret,
      Events: 'on'
    });
  }

  sendAction(actionFields) {
    const lines = Object.entries(actionFields).map(([key, value]) => `${key}: ${value}`);
    this.socket.write(`${lines.join('\r\n')}\r\n\r\n`);
  }

  processBuffer() {
    let separatorIndex = this.buffer.indexOf('\r\n\r\n');
    while (separatorIndex !== -1) {
      const block = this.buffer.slice(0, separatorIndex);
      this.buffer = this.buffer.slice(separatorIndex + 4);

      if (block.trim()) {
        this.handleMessage(parseAmiBlock(block));
      }

      separatorIndex = this.buffer.indexOf('\r\n\r\n');
    }
  }

  handleMessage(message) {
    if (message.Response === 'Success' && message.Message?.includes('Authentication accepted')) {
      this.connected = true;
      logger.info('AMI login successful');
      return;
    }

    if (message.Response === 'Error' && message.Message) {
      this.connected = false;
      logger.error('AMI login failed', { reason: message.Message });
      this.socket.end();
      return;
    }

    if (message.Event) {
      this.emit('ami_event', message);
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      logger.info('Reconnecting to AMI');
      this.connect();
    }, this.config.reconnectDelayMs);
  }

  get isHealthy() {
    return this.connected;
  }
}
