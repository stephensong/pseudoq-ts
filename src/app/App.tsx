"use strict";

import '../../css/bootstrap-flatly.css';
import './bootstrap';

import * as React from 'react';
import { Button } from 'react-bootstrap';
import { BrowserRouter, Match, Miss, Link } from 'react-router';

import { fetchContents } from './main';

import { isMember } from '../lib/utils';

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

import { User, Login, Logout, initUser } from './user';
import { Blog, BlogEntry } from './blog';
import { Links } from './links';


function cacheStatus() {
    var sCacheStatus = "Not supported";
    if (window.applicationCache) {
        var oAppCache = window.applicationCache;
        switch (oAppCache.status) {
            case oAppCache.UNCACHED:
                sCacheStatus = "Not cached";
                break;
            case oAppCache.IDLE:
                sCacheStatus = "Idle";
                break;
            case oAppCache.CHECKING:
                sCacheStatus = "Checking";
                break;
            case oAppCache.DOWNLOADING:
                sCacheStatus = "Downloading";
                break;
            case oAppCache.UPDATEREADY:
                sCacheStatus = "Update ready";
                break;
            case oAppCache.OBSOLETE:
                sCacheStatus = "Obsolete";
                break;
            default:
                sCacheStatus = "Unexpected Status ( " +
                    oAppCache.status.toString() + ")";
                break;
        }
    }
    return sCacheStatus;
}

const NoMatch = ({ location }) => (
  <div>
    <h2>Whoops</h2>
    <p>Sorry but {location.pathname} didn’t match any pages</p>
  </div>
)

const _app = React.createClass({
    displayName: 'App',

    handleDoubleClick(e) {
        e.preventDefault;
    },

    componentDidMount() {
        this.props.dispatch(fetchContents(this.props.today));
        let cachestat = cacheStatus();
        console.log("cache : " + cachestat);
        if (cachestat !== 'Idle' && cachestat !== 'Not cached' && cachestat !== 'Not supported') {
            var oCache = window.applicationCache;
            oCache.addEventListener("updateready", (e) => {
                console.log('cache updated');
                oCache.swapCache();
                this.props.dispatch({ type: 'FORCEREFRESH' })
            }, true);
        }
    },

    render() {
        console.log("app render");
        let cachestat = cacheStatus();
        if (cachestat !== 'Idle' && cachestat !== 'Not cached') {
            console.log("Waiting for cache : current status is : " + cachestat);
            //return null;
        }
        let userName = this.props.user.moniker; //localStorage.getItem('pseudoq.userName');
        if (userName !== localStorage.getItem('pseudoq.userName')) console.log("userName farked : ");
        let prov = localStorage.getItem('pseudoq.authprov')
        let lis = prov ? (<Link to='/logout'>Sign Out ({prov})</Link>)
            : (<Link to='/login'>Sign In</Link>);

        let lis2 = (isMember('member')) ? [<li key='blog' ><Link to="/blog">Blog</Link></li>, <li key='links' ><Link to="/links">Links</Link></li>]
            : [];
        return (
            <BrowserRouter>
                <div onDoubleClick={this.handleDoubleClick} >
                    <div className="navbar navbar-default" width='100%'>
                        <div className="navbar-header">
                            <div className="navbar-brand">
                               <Link to="/">PseudoQ</Link>
                            </div>
                        </div>
                        <div className="navbar-collapse collapse navbar-responsive-collapse">
                            <ul className="nav navbar-nav navbar-right">
                                <li><Link to="/help">How to Play</Link></li>
                                <li><Link to="/about">About</Link></li>
                                {lis2}
                                <li><a href="mailto:stephensong2@gmail.com">Contact Us</a></li>
                                <li>{lis}</li>
                                <li><Link to='/user' >User : {userName} </Link></li>
                            </ul>
                        </div>
                    </div>
                    {this.props.children}
                    <Match pattern="/help" component={Help} />
                    <Match pattern="/about" component={About} />
                    <Match pattern="/login" component={Login} />
                    <Match pattern="/logout" component={Logout} />
                    <Match pattern="/user" component={User} />
                    <Match pattern="/blogentry/:id" component={BlogEntry} />
                    <Match pattern="/blog" component={Blog} />
                    <Match pattern="/links" component={Links} />
                    <Match pattern="/hidato" component={HidatoApp} />
                    <Match pattern="/:dayName/:pos" component={PlayPage} />
                    <Match exactly pattern="/" component={_app} />
                    <Miss component={NoMatch}/>

                </div>
            </BrowserRouter>
        );
    }
});


/*
                      <Match path="/help" component={Help}/>
        <Match path="/about" component={About}/>
        <Match path="/login" component={Login} />
        <Match path="/logout" component={Logout} />
        <Match path="/user" component={User}/>
        // <Match path="/multi" component={MultiPlayerGame} />
        // <Match path="/challenge5" component={Challenge5min} />
        // <Match path="/challenge15" component={Challenge15min} />
        <Match path="/blogentry/:id" component={BlogEntry} />
        <Match path="/blog" component={Blog} />
        <Match path="/links" component={Links} />
        <Match path="/hidato" component={HidatoApp} />
        <Match path="/:dayName/:pos" component={PlayPage}/>
        <Match path="/refresh" component={Refresh}>
            <Match path="_=_" component={Refresh} />
        </Route>
        <Redirect from="/_=_" to="/" />
        <Match path="/" component={FP} >
          <Match path=":dayName" component={Daily}/>
        </Route>
*/


export default _app;
