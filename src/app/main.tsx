"use strict";

//window.jQuery = require('jquery');
//const $ = jQuery;

//require('./css/bootstrap-flatly.css');
//require('bootstrap');


import * as oxiDate from '../lib/oxidate';
import * as grph from './graphics';

import * as React from 'react';

import { Button, Input, NavItem, Nav } from 'react-bootstrap';

export {About} from './PseudoqAbout';
import PseudoqHelp from './PseudoqHelp';
import {psqReducer, PseudoqBoard} from './PseudoqBoard';

import { connect } from 'react-redux';
import { History, Link } from 'react-router';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';

import { hidatoReducer, Hidato } from './Hidato';

import DailyPanel from './DailyPanel';
import FrontPage from './FrontPage';
import {storeAuthHeaders} from './user';

const LOADCONTENTS = 'main/LOADCONTENTS';


function loadContents( current, o ) {
    console.log('loadContents called');
    let brds = o.boards;
    let dt = current.today;
    let days = {...current};
    let diff = false;

    let brdsDiffer = (o1,o2) => {
        //console.log("differ called");
        if (!o2) {diff = true; return true; };
        let ks1 = Object.keys(o1);
        let ks2 = Object.keys(o2);
        if (ks1.length != ks2.length) { diff = true; return true; }
        return ks1.some( ky => { 
            let b1 = o1[ky];
            let b2 = o2[ky];
            if (!b2 || b1.pubID !== b2.pubID) {diff = true; return true; }
            return false;
        });

    }

    var i = 7;
    while (i > 0) {
        let cdt = oxiDate.toFormat(dt, 'yyyyMMdd');
        //console.log('cdt :'+cdt);
        let dy = oxiDate.toFormat(dt, "DDDD");
        let boards = brds[cdt];
        if (brdsDiffer(days[dy].boards,boards)) days[dy].boards = boards;
        dt = oxiDate.addDays(dt, -1);
        i = i - 1;
    }

    let cdt = oxiDate.toFormat(dt, 'yyyyMMdd');
    let fnd = false;
    Object.keys(brds).forEach(function (k) {
        if (k < cdt) {
            fnd = true;
            delete brds.k
        }
    }); 
    if (brdsDiffer(days.tomorrow.boards,brds[days.tomorrow.date])) days.tomorrow.boards = brds[days.tomorrow.date];
    if (brdsDiffer(days.tutorial.boards,{0: brds.tutorial})) {
        diff = true; 
        days.tutorial.boards[0] = brds.tutorial; 
    }
    return diff ? days : current;
};

export function initDays(dt) {
    console.log("initDays called");
    const today = dt;
    var o = Object.create(null);
    o.date =  oxiDate.toFormat(dt, 'yyyyMMdd');
    o.today = dt;

    var i = 7;
    while (i > 0) {
        let cdt = oxiDate.toFormat(dt, 'yyyyMMdd');
        let dy = oxiDate.toFormat(dt, "DDDD");
        o[dy] = {dayName: dy, date: cdt, boards: {} };
        dt = oxiDate.addDays(dt, -1);
        i = i - 1;
    }
    dt = oxiDate.addDays(today, 1);
    o.tomorrow = {date: oxiDate.toFormat(dt, 'yyyyMMdd'), boards: {0: {}} }; 
    o.tutorial = {dayName: 'tutorial', boards: {0: {}} };
    o.hidato = {dayName: 'hidato', boards: {0: {}} };
    o.challenge5 = {dayName: 'challenge5', boards: {0: {}} };
    o.challenge15 = {dayName: 'challenge15', boards: {0: {}} };


    let stg = localStorage.getItem('pseudoq.boards');

    if (stg) {
        try {
            let t = JSON.parse(stg);
            o = loadContents(o,t);

        }
        catch (e) {
            console.log("error parsing local storage : "+e);
            localStorage.removeItem('pseudoq.boards');
        }
    }

    return o;
};

// should get called exactly once for each mount of the app
let fetchDone = false
export function fetchContents(today) {
    console.log("fetchcontents called");

    return function (dispatch) {
        if (fetchDone) return;
        let xhr = new XMLHttpRequest();
        let cdt = oxiDate.toFormat(today, 'yyyyMMdd');

        xhr.open("GET", '/puzzles/'+cdt);
        xhr.onload = () => {
            storeAuthHeaders(xhr);
            dispatch({type: 'user/LOAD'});
            if (xhr.status == 200) {
                try { 
                    let t = JSON.parse(xhr.responseText);
                    localStorage.setItem('pseudoq.boards', xhr.responseText);
                    dispatch({type: LOADCONTENTS, contents: t});
                    fetchDone = true;
                } catch (e) {
                    console.log("error (parsing response?) : "+e);
                }
            }
        };
        xhr.send();
    }
};

export function daysReducer(st, action) {
    if (!st) throw new Error("initDays not called");  //.return initDays(today);

    let typ = action.type;
    if (typ === LOADCONTENTS) {
        return loadContents(st, action.contents);
    }

    let {dayName,pos} = action;
    if (dayName) {
        let boards = st[dayName].boards;
        if (!boards) return st;
        let brd = boards[pos];
        if (!brd) return st;
        if (dayName === 'hidato' || brd.gameType === 'Hidato') brd = hidatoReducer(brd, action);
        else brd = psqReducer(brd, action);
        if (brd !== boards[pos]) {
            let brds = {...boards, [pos]: brd};
            let day = {...st[dayName], boards: brds }
            return {...st, [dayName]: day};
        }
    }

    return st;
}

var _help = React.createClass({displayName: 'Help',

    render() {
        let {tutorial, dispatch} = this.props;
        if (!tutorial) return null;
        return (<PseudoqHelp board={ tutorial } dispatch={ dispatch } />);
    }
});

export let Help = connect(state => { return  {tutorial: state.days.tutorial.boards[0]}; } )(_help);


let _challenge5min = React.createClass({displayName: 'Challenge5min',

    componentDidMount() {
        this.newGame()
    },

    newGame() {
        var xhr = new XMLHttpRequest();
        console.log("challenge5min puzzle requested");
        xhr.open("GET", '/challenge5min');
        xhr.onload = () => {
            let json = JSON.parse(xhr.responseText);
            console.log("challenge5min puzzle received");
            let transformer : any = grph.Transformer(json);
            json = transformer.randomTransform();
            this.props.dispatch({type: 'psq/LOAD', props: json, dayName: 'challenge5', pos: 0 });
        };
        xhr.send();
    },

    render: function () {
        let {board, dispatch} = this.props; 
        if (!board.allRegions) return null;
        console.log("rendering challenge5");

        return ( <PseudoqBoard key={ 'challenge5:play' } dayName={ 'challenge5' } pos={ 0 } dispatch={ dispatch } newGame={ this.newGame } {...board} mode={ 'play' } random={ true } timeOut={ 300 } /> );
    },

});

export let Challenge5min = connect(state => {
    return {board: state.days.challenge5.boards[0] };
})(_challenge5min);


let _challenge15min = React.createClass({displayName: 'Challenge15min',

    componentDidMount() {
        this.newGame()
    },

    newGame() {
        var xhr = new XMLHttpRequest();
        console.log("challenge15min puzzle requested");
        xhr.open("GET", '/challenge15min');
        xhr.onload = () => {
            let json = JSON.parse(xhr.responseText);
            console.log("challenge15min puzzle received");
            let t: any = grph.Transformer(json);
            json = t.randomTransform();
            this.props.dispatch({type: 'psq/LOAD', props: json, dayName: 'challenge15', pos: 0 });
        };
        xhr.send();
    },

    render: function () { 
        let {board, dispatch} = this.props; 
        if (!board.allRegions) return null;
        console.log("rendering challenge15");

        return ( <PseudoqBoard key={ 'challenge15:play' } dayName={ 'challenge15' } pos={ 0 }  dispatch={ dispatch } newGame={ this.newGame } {...board } mode={ 'play' } random={ true } timeOut={ 300 } /> );
    },

});

export let Challenge15min = connect(state => {
    return {board: state.days.challenge15.boards[0] };
})(_challenge15min);


const _hidatoApp = React.createClass({displayName: 'HidatoApp',

    render: function () { 
        let dayName = 'hidato';
        let pos = 0;
        return (<Hidato { ...this.props }  key={ 'hidato:play' } dayName={ dayName } pos={ pos } dispatch={ this.props.dispatch } mode='play' /> );
    },
})

export let HidatoApp = connect( state => { return state.days['hidato'].boards[0];  }
                              )(_hidatoApp);

export const FP = connect(state => {
        let date = state.today;
        return { date }; 
    } )(FrontPage);


export const Daily = connect((state,props) => {
        //console.log(JSON.stringify(props.params));
        let {dayName} = props.params;
        return state.days[dayName]; 
    })(DailyPanel);

const _playPage = React.createClass({

    render() {
        //console.log('rendering PlayPage');
        const {dayName, pos, board, dispatch} = this.props;
        if (!board) return null;
        const puzzle = dayName + "/" + pos;
        let mode = board.mode || 'play';
        if (mode === 'view') mode = 'play';

        if (board.gameType && board.gameType === 'Hidato') {
            return ( <Hidato       key={ puzzle+':play' } {...board} dispatch={ dispatch } dayName={ dayName } pos={ pos } mode={ mode } /> );
        } else {
            return ( <PseudoqBoard key={ puzzle+':play' } {...board} dispatch={ dispatch } dayName={ dayName } pos={ pos } mode={ mode } /> );
        }
    }
});

export const PlayPage = connect((state,props) => {
    const { dayName, pos } = props.params;
    return {dayName, pos, board: state.days[dayName].boards[pos] };
})(_playPage);

