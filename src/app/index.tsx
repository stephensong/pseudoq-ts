"use strict";

//window.jQuery = require('jquery');

/* global __DEVTOOLS__ */
//import '../assets/stylesheets/index.css'

import * as oxiDate from '../lib/oxidate';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter, Match, Miss, Link } from 'react-router';
import { Provider, connect } from 'react-redux';
//import { IntlProvider } from 'react-intl'
//import createBrowserHistory from 'history/lib/createBrowserHistory';
//import createHashHistory from 'history/lib/createHashHistory';
//import configureStore from './utils/configure-store'
//import * as storage from './persistence/storage'
//import * as components from './components'
//import * as constants from './constants'
//import * as i18n from './i18n'

import * as thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { compose, createStore, applyMiddleware, combineReducers } from 'redux';

//import { devTools, persistState } from 'redux-devtools';

import {
    daysReducer,
    About,
    Help,
    Daily,
    PlayPage,
    FP,
    HidatoApp,
    Challenge5min,
    Challenge15min,
    initDays
} from './main';

import { User, Login, Logout, userReducer, initUser } from './user';

import _root from './App';

import { blogReducer, Blog, BlogEntry} from './blog';
import { linksReducer, Links} from './links';
//import { multiPlayReducer, MultiPlayerGame} from 'gameclient.jsx';

//const history = createHashHistory({queryKey: false});

//const loggerMiddleware = createLogger();

/*
const enhCreateStore = compose(
  devTools(),
  // Lets you write ?debug_session=<name> in address bar to persist debug sessions
  //persistState(window.location.href.match(/[?&]debug_session=([^&]+)\b/))
)(createStore);

const _refresh = React.createClass({displayName: 'Refresh',

    componentDidMount() {
        history.go(-2);
        this.props.dispatch({type: 'user/LOAD'});
    },
    render() { return null; },
});

const Refresh = connect(state => state)(_refresh);
*/

const finalCreateStore =  applyMiddleware(thunkMiddleware 
                  //,loggerMiddleware
                  )(createStore); 

const today = new Date();

const initialState = {
    today,
    days: initDays(today),     // keyed by dayName/pos
    blog: undefined,
    links: undefined,
    user: initUser(),
    multi: undefined,
    seq: 0
};

/*
let combReducer = combineReducers({
        days: daysReducer, 
        blog: blogReducer, 
        links: linksReducer, 
        user: userReducer, 
        multi: multiPlayReducer
    });
*/

function reducer(state = initialState, action) {
    let days = daysReducer(state.days, action);
    let blog = blogReducer(state.blog, action);
    let links = linksReducer(state.links, action);
    let user = userReducer(state.user, action);
    //let multi = multiPlayReducer(state.multi, action);
    //if (days === state.days && blog === state.blog && links === state.links && user === state.user && multi === state.multi) return state;
    let seq = state.seq;
    if (action === 'FORCEREFRESH') seq = seq + 1;
    let rslt = {...state, days, blog, links, user, /*multi,*/ seq };
    return rslt;
}

const store = finalCreateStore(reducer, initialState);

let Root = connect(state => state)(_root);

ReactDOM.render(
  <Provider store={store}>
    <Root />
  </Provider>
, document.getElementById('page-body'))


