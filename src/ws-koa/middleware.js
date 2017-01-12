"use strict";

var fs = require('fs');
var path = require('path');
var debug = require('debug')('ws-koa');

import KoaWebSocketServer from './server.js';

export default function (app, passedOptions = {}) {
    // Default options
    var options = {
        serveClientFile: true,
        clientFilePath: '/koaws.js',
        heartbeat: true,
        heartbeatInterval: 5000,
        ...passedOptions
    };

    var oldListen = app.listen;
    app.listen = function () {
        debug('Attaching server...')
        app.server = oldListen.apply(app, arguments);
        app.ws.listen(app.server);
        return app;
    };

    app.ws = new KoaWebSocketServer(app, options);

    return function* (next) {
        if (this.session && this.session.id) {
            if (typeof app.ws.sockets[this.session.id] === 'undefined') {
                ws.sockets[this.session.id] = [];
            }
            app.ws.sessions[this.session.id] = this.session;
            this.sockets = app.ws.sockets[this.session.id];
        }
        yield next;
    };
};