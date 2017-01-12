"use strict";

const React = require('react');
const ReactDOM = require('react-dom')
const ReactBootStrap = require('react-bootstrap');

import { getMoniker } from 'user.jsx';
import { connect } from 'react-redux';

import WsClient from './ws-koa/client.js';

const { Button, Table } = ReactBootStrap;

//const initGame = {gameType: 'Killer', table: '', board: undefined, players: [], phase: 'setup', tricks: [] };

const initState = {
	available: null,   // array of available tables (rooms)
	game: null,       // table we have joined
	client: null
}

const CONNECT = 'multi/CONNECT';
const AVAIL = 'multi/AVAIL';
const JOINED = 'multi/JOINED';
const STARTED = 'multi/STARTED';
const STARTTRICK = 'multi/STARTTRICK';
const ENDTRICK = 'multi/ENDTRICK';

/*
let ws_connect = function (client, address) {
    address = address || location.origin.replace(/^http/, 'ws')

    //debug('Connecting to server: ws://%s', address);
    client.socket = new WebSocket(address);

    ['open', 'close', 'message']
        .forEach( (type, i) => {
            let handler = (...args) => {
                client.emit(type, ...args);
            };
            if (client.socket.on) {
                client.socket.on(type, handler);
            } else if (!client.socket['on' + type]) {
                client.socket['on' + type] = handler;
            }
        });
};
*/


function connectToGameServer() {
	const client = new WsClient();
	client.register('session', function (err, payload) {
	    if (err) console.error('Something went wrong', err);
	    console.log(payload) // should include our session
	});
    client.mkr = getMoniker();

	return (dispatch) => {

        client.register('game', {
	        starttrick: (err) => dispatch({type: STARTTRICK}),
	        endtrick: (err,trick) => dispatch({type: ENDTRICK, trick}),
	        joined: (err,game) => dispatch({type: JOINED, game}),
  	        started: (err,game) => {
		    	dispatch({type: STARTED, game});
	            dispatch({type: 'psq/LOAD', props: game.board, dayName: 'multi', pos: 0 });
		    },
		    timedout: () => {
		    	console.log("timedout");  //  ???
		    },
		    moved: (err,{moniker}) => console.log(moniker + " moved"),
	    });

	    client.connect();
	    client.method('game:getavailable', (err,avail) => {
            dispatch({type: AVAIL, avail})
	    });
	    dispatch({type: CONNECT, client})
	};
}

function createGame(client) {
	return dispatch => {
		let mkr = client.mkr;
        client.method('game:create', {table: mkr, moniker: mkr},(err,game) => {
        	if (!err) dispatch({type: JOINED, game});
        	else console.log(err);
        });
	};
}

function joinGame(client, game) {
	return dispatch => {
		let moniker = client.mkr;
		let table = game.table;
        client.method('game:join', {table, moniker},(err,game) => {
        	if (!err) dispatch({type: JOINED, game});
        	else console.log(err);
        });
	};
}

function startGame(client, table) {
	return dispatch => {
		let moniker = client.mkr;
        client.method('game:start', {table, moniker},(err,game) => {
        	if (!err) dispatch({type: STARTED, game});
        	else console.log(err);
        });
	};
}


export function multiPlayReducer(st = initState, action) {

    const mkr = st.client ? st.client.mkr : getMoniker();
    const typ = action.type; 
	if (typ === CONNECT) {
		let client = action.client;
		return {...st, client};
	}
	else if (typ === JOINED) {
		let game = action.game;
		return {...st, game};
	}
	//else if (typ === CREATE) {
    //    st.client.method('game:create', {table: mkr, moniker: mkr} );
	//}
	else if (typ === AVAIL) {
        let available = action.avail;
        let game = st.game;
        if (!game) {
        	available.forEach(g => {
                if (g.players.indexOf(mkr) >= 0) game = g;
        	});
        }
        return  {...st, available, game};
	}
	else if (typ === STARTED) {
		// receive board at this point
		let game = {...st.game, ...action.game}
		return {...st, game}
	}
	else if (typ === STARTTRICK) {
		let game = {...st.game, ...action.game}
		return {...st, game}
	}
	else if (typ === ENDTRICK) {
		let game = {...st.game, ...action.game}
		return {...st, game}
	}
	return st;

}

const _multiPlayerGame = React.createClass({displayName: 'multi',

	componentWillMount() {
        this.props.dispatch(connectToGameServer());
	},

	createTable() {
		const {client,dispatch} = this.props;
        dispatch(createGame(client));
	},

	joinTable(table) {
		const {client,dispatch} = this.props;
        dispatch(joinGame(client, table));
	},

	startTable(table) {
		const {client,dispatch} = this.props;
        dispatch(startGame(client, table));
	},

	render() {
		const {available, client, game, dispatch} = this.props;
		if (game) {
			console.log(JSON.stringify(game));
            let {board} = game;
            if (!board) {
                if (game.owner !== client.mkr) {
	                return ( <div><p>You have joined the table : {game.table}  </p>
	                            <p>Currently, the players at the table are : { game.players.join(", ")}.</p>
	                            <p>Waiting for other players to join, or <strong>{game.owner}</strong> to start the game.</p>
	                        </div> );
	            }
	            else {
	                return ( <div><p>You have created the table : {game.table}  </p>
	                            <p>Currently, the players at the table are : { game.players.join(", ")}.</p>
	                            <p>Waiting for other players to join, or for you to start the game.</p>
	                            <Button onClick={ () => this.startTable(game.table) }>Start</Button>
	                        </div> );

	            }
            }
            if (!board.allRegions) return null;
            console.log("rendering multi");
            return ( <PseudoqBoard key={ 'multi:play' } dayName={ 'multi' } pos={ 0 } dispatch={ dispatch } {...board} mode={ 'play' } timeOut={ joined.secondsPerMove } /> );

		}
		let avails = "No games currently available";
		if (available) {
			let j = 0;
			let rows = available.map(a => {
				let players = a.players.join(", ");
				console.log("table : "+ a.table);
				++j;
				return (
	                 <tr key={ a.table } >
	                     <td><Button onClick={ () => this.joinTable(a.table) } >Join</Button></td>
	                     <td>{ players }</td>
	                </tr>
	                );
 
			});
			avails = (
	            <div>
	              <p>Choose from available Tables :</p>
	              <Table striped bordered condensed hover>
	                  <thead>
	                    <tr>
	                      <th>Table #</th>
	                      <th>Players</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {rows}
	                  </tbody>
	              </Table>
	            </div>    
            );
		}
        return (
        	<div>
        	   {avails}
        	   <p>If you wish, you can create your own table.</p>
        	   <Button onClick={ this.createTable }>Create Table</Button>
        	</div>  
        	);
	}

});

export let MultiPlayerGame = connect(state => state.multi)(_multiPlayerGame);


