'use strict';

// Utils
var util = require('util');

// EventEmitter
var EventEmitter = require('events').EventEmitter;

// Protocol
var protocol = require('./jsonrpc.js');

// Debug output
var debug = console.log.bind(console);
/*
try {
    debug = require('debug')('ws_client');
} catch (e) {
}
*/

export default function Client() {
    // Init EventEmitter
    EventEmitter.call(this);

    // Queue list for messages
    this._messageQueue = [];

    // Callback container for results
    this._awaitingResults = {};

    // Client-side methods
    this._methods = {};

    // Event handler containers
    this._events = {
        open: [],
        close: [],
        connection: [],
        message: []
    };

    // Options container
    this._options = {};

    // Session container
    this._session = null;

    // On WebSocket open
    this.on('open', this.onOpen);

    // On WebSocket close
    this.on('close', this.onClose);

    // On WebSocket message
    this.on('message', this.onMessage);

    var _this = this;
    // Listen for options
    this.register('options', function () {
        _this._options = this.params;
    });

    // Listen for session
    this.register('session', function () {
        _this._session = this.params;
    });
}

// Inherit prototype from EventEmitter
util.inherits(Client, EventEmitter);

Client.prototype.onOpen = function (e) {
    debug('WebSocket opened');
    if (this._messageQueue.length) {
        var payload;
        while (this._messageQueue.length) {
            payload = this._messageQueue.shift();
            debug('→ %o', payload);
            this.socket.send(JSON.stringify(payload));
        }
    }
};

Client.prototype.onClose = function (e) {
    debug('WebSocket closed');
};

Client.prototype.onMessage = function (evt) {
    protocol.apply(this, [debug, this.socket, evt.data]);
};

Client.prototype.connect = function (address) {
    if (!address) {
        let isDev = (process.env.NODE_ENV !== 'production');
        address = isDev ? 'ws://localhost:8080/' : location.origin.replace(/^http/, 'ws')
    }

    // Initialize WebSocket client
    debug('Connecting to server:' , address);
    this.socket = new WebSocket(address);

    this.socket.error = (code,msg) => {
        debug("error : "+code+" : "+ msg);
    };

    // Add helper handlers for the folowing events
    ['open', 'close', 'message']
        .forEach(function (type, i) {
            var handler = function (e) {
                this.emit.apply(this, [type].concat(Array.prototype.slice.call(arguments)));
            }.bind(this);
            if (this.socket.on) {
                this.socket.on(type, handler);
            } else if (!this.socket['on' + type]) {
                this.socket['on' + type] = handler;
            }
        }.bind(this));
};

Client.prototype.disconnect = function (code, reason) {
    if (this.socket) {
        this.socket.close(code, reason);
    }
};

// Register a client-side method
Client.prototype.register = function (method, handler, expose) {
    var m;
    if (typeof method === 'object') {
        for (m in method) {
            this.register(m, method[m]);
        }
    } else if (typeof handler === 'object') {
        for (m in handler) {
            this.register(method + ':' + m, handler[m]);
        }
    } else if (typeof method === 'string') {
        debug('Registering method: %s', method);
        handler.expose = expose || false;
        this._methods[method] = handler;
    }
};

// Call a server-side method
Client.prototype.method = function () {
    var cb = null;
    var payload = {
        jsonrpc: '2.0',
        method: arguments[0],
        id: Math.random().toString(36).substr(2, 9) // Generate random id
    };

    if (typeof arguments[1] !== 'function' && typeof arguments[1] !== 'undefined') {
        payload.params = arguments[1];
        if (typeof arguments[2] === 'function') {
            cb = arguments[2];
        }
    } else if (typeof arguments[1] === 'function') {
        cb = arguments[1];
    }

    if (cb) {
        this._awaitingResults[payload.id] = function () {
            cb.apply(this, arguments);
            delete this._awaitingResults[payload.id];
        };
    }

    if (this.socket.readyState !== 1) {
        // WebSocket is not ready yet, push payload to messsage queue
        this._messageQueue.push(payload);
    } else {
        try {
            debug('→ (%s) %s: %o', payload.id, payload.method, payload.params);
            this.socket.send(JSON.stringify(payload));
        } catch (e) {
            if (cb) {
                cb.call(this, e);
            }
        }
    }
};

