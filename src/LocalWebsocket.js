const WebSocket = require('ws');
const EventEmitter = require('events');

class LocalWebsocket extends EventEmitter {
  constructor(lockfile) {
    super();
    this._lockfile = lockfile;
    this._eventsQueue = [];
  }

  subscribeToEvents(events = []) {
    this._eventsQueue = this._eventsQueue.concat(events);
  }

  subscribeToEvent(event) {
    this._eventsQueue.push(event);
  }

  connect() {
    this.ws = new WebSocket(`wss://riot:${this._lockfile.password}@127.0.0.1:${this._lockfile.port}`, {
        rejectUnauthorized: false
    });

    this.ws.on('open', () => {
      this._eventsQueue.forEach(eventName => {
        this.ws.send(JSON.stringify([5, eventName]));
      });
    });

    this.ws.on('message', data => {
      try {
        let json = JSON.parse(data);

        this.emit(json[1], json[2]);
      } catch {
      }
    });
  }
}

module.exports = LocalWebsocket;