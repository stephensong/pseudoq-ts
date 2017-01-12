"use strict";

const vals = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const secondsPerMove = 120;

import {isCellActive} from './utils.js';

let games = {};

function newModel(cols,rows) {
    let mdl = Object.create(null);
    cols.forEach( c => {
        rows.forEach( r => {
            let trues = Object.create(null)
            vals.forEach( v => trues[v] = '' );
            mdl[c+r] = trues;
        });
    }); 
    return mdl;
};

function isCompleted(mdl, board) {
    let soln = board.solution;
    return board.cols.every( c => {
        return board.rows.every( r => {
            let id = c+r;
            let ps = mdl[id];
            let chk = soln[id];
            return !isCellActive(id) || vals.every( c => c === chk ? ps[c] !== '' : ps[c] === '' );
        });
    });
};



// phases : setup ; inprogress ; completed
function newgame(table, gameType = 'Killer') {
    //let id = uuid.generate();
    if (games[table]) throw new Error("game already created");
    let g = {type: gameType, table, board: undefined, model: undefined, players: [], phase: 'setup', tricks: [], trick: {} };
    games[table] = g;
    return g;
}

function applyMoveToGame(table, m, moniker) {
	let game = games[table];
	let mdl = game.model;
	let rmv = [];
	let vld = true;
	let soln = board.solution;

    Object.keys(m).forEach( cid => {
        if (mdl[cid]) {
            let oks = m[cid];
            let ps = mdl[cid];
            vals.forEach( v => {
                if (vld && ps[v] === '' && oks.indexOf(v) < 0) {
                    if (soln[cid] === v) vld = false;
                    else rmv.push({cid,v});
                }
            });
        }
    }); 
    if (vld) rmv.forEach( ({cid,v}) => mdl[cid][v] = moniker );
    else rmv = [];
    game.trick[moniker] = rmv;
};

export function init(ws) {

	let selectSockets = filter => {
	    let rslt = []
	    if(ws.server && ws.server.clients) {
	        for (var i in ws.server.clients) {
	            let socket = ws.server.clients[i];
	            if (filter(socket)) rslt.push(socket);
	        }
	    }
	    return rslt;
	}

	let narrowcast = (method, params, filter) => {
	    if(ws.server && ws.server.clients) {
	        for (var i in ws.server.clients) {
	            let socket = ws.server.clients[i];
	            if (filter(socket)) {
	                socket.method(method, params, (err) => console.log('Could not send message') );
	            };
	        }
	    }
	}

	let tablecast = (table, method, params) => {
		narrowcast(method, params, s => s.table === table );
	};

    let socketsInGame = (table => selectSockets(s => s.table === table ) );

	let startTrick = (table) => {
		let game = games[table];
		let sockets = socketsInGame(table);
		game.socketsToMove = sockets;
		let tmout = setTimeout(() => {
			// this should never actually happen.  
			// clients should time themselves out
			sockets.forEach(s => s.method('game:timedout'));
	        endTrick(table);
		}, (secondsPerMove + 10) * 1000);
		game.timeout = tmout;
		tablecast(table, 'game:starttrick', game.trick);
		game.trick = {};
	};

	let endTrick = (table) => {
		let game = games[table];
		tablecast(table, 'game:endtrick', game.trick);
		game.tricks.push(game.trick);
		cancelTimeout(game.timeout);
		if (!isCompleted(game)) {
			setTimeout(() => startTrick(table),  5000);
		}
	};

	ws.register('game', {

	    create: function* () {
	    	console.log("creating table");
	    	let {table, moniker} = this.params;
	    	console.log("creating table "+ table);
	    	if (games[table]) {
	    		this.error("table already exists"); 
	    		return;
	    	}
	        this.table = table;
	        this.moniker = moniker;
	        let game = newgame(table);
	        game.owner = moniker;
	        game.players.push( moniker );
	        this.result(game);
	    },

	    join: function* () {
	    	let {table, moniker} = this.params;
	    	let game = games[table];
	        if (!game || game.phase !== 'setup' ) {	err("game closed");	return; }
	        this.table = table;
	        let players = game.players;
	        players.push(moniker)
	        this.result("ok");
	        tablecast(table, 'game:joined', game);
	    },

	    getavailable: function* () {
	        let rslt = [];
	        games['Bernie'] = {table: 'Bernie', owner: 'Bernie', players: ['Bernie','Joe','Kevin'], secondsPerMove, phase: 'setup' };
	        games['Emma'] = {table: 'Emma', owner: 'Emma', players: ['Emma','Bob','Sam'], secondsPerMove, phase: 'setup' };

	        Object.keys(games).forEach(table => {
	        	let g = games[table];
	        	if (g.phase === 'setup') {
		        	rslt.push(g);
		        }
	        });
	        this.result(rslt);
	    },

	    start: function* () {
	    	let {table, moniker} = this.params;
	    	let game = games[table];
	   	    if (game.phase !== 'setup') { err("game has already started"); return; }
	    	if (game.owner !== moniker) { err("Only game owner can start game"); return; }
		    game.phase = 'inprogress';

	        let board = pg.get_random_killer();

	        let mdl = newModel(board.cols,board.rows);
	        board.solution = board.solution.map(i => i.toString());
	        game.board = board;
	        this.result("ok");
	        tablecast(table, 'game:started', game);
	    },

	    submitMove: function* () {
	    	let {table, move, moniker} = this.params;
	    	let game = games[table];
	    	applyMoveToGame(table, m, moniker)
	    	let socks = game.socketsToMove;
	    	let i = socks.indexOf(this);
	    	if (i < 0) {err("wtf???"); return; }
	        this.result("ok");
	    	if (socks.length > 1) {
	    		socks.splice(i,1);
	            tablecast(table, 'game:moved', { moniker });
	        } 
	        else endTrick(table);
        }

    });

}