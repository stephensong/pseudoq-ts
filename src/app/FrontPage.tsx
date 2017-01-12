"use strict";

import * as React from 'react';
import * as oxiDate from '../lib/oxidate';

import {PseudoqBoard} from './PseudoqBoard';
import { Hidato } from './Hidato';

import { Button, Input, NavItem, Nav } from 'react-bootstrap';
import createHistory from 'history/createBrowserHistory';
const history = createHistory();

import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';

interface FrontPageProps {date: Date, params: any};
export default class FrontPage extends React.Component<FrontPageProps, {}> {
    
    displayName: 'FP'

    componentWillMount() { 
        console.log("mounting FP");
        this.initComponent(this.props); 
    }

    componentWillReceiveProps(nextProps) { this.initComponent(nextProps); } 
    initComponent(props) {  
        const { dayName } = props.params;
        if (!dayName || dayName === '_#_') {
            const firstDay = oxiDate.toFormat(props.date, 'DDDD');
            history.push("/" + firstDay);
        }
    }

    render() {

        const { dayName } = this.props.params;
        //console.log("rendering FP for day : " + dayName);
        if (!dayName || dayName === '_#_') {
            return null;
        }
        let dt = this.props.date;
        let userName = localStorage.getItem('pseudoq.userName');
        let items = [];
        var i = 7;
        while (i > 0) {
            let cdt = oxiDate.toFormat(dt, 'yyyyMMdd');
            let dy = oxiDate.toFormat(dt, "DDDD");
            items.push( <LinkContainer key={ dy } to={ "/" + dy } ><NavItem>{ dy }</NavItem></LinkContainer> );
            dt = oxiDate.addDays(dt, -1);
            i = i - 1;
        }

        items.push( <LinkContainer key="challenge5" to="/challenge5"><NavItem>5 minute Challenge</NavItem></LinkContainer> );

        items.push( <LinkContainer key="challenge15" to="/challenge15"><NavItem>15 minute Challenge</NavItem></LinkContainer> );

        items.push( <LinkContainer key="hidato" to="/hidato"><NavItem>Hidato</NavItem></LinkContainer> );

        items.push( <LinkContainer key="multi" to="/multi"><NavItem>Multi-Player</NavItem></LinkContainer> );

        let prov = localStorage.getItem('pseudoq.authprov') ? null : (
                       <p>You are not currently signed in to PseudoQ.net. This only means that your games in progress can not
                       be made available on other devices.  
                       You can sign-in from <LinkContainer key="loginlink" to="/login"><a>here</a></LinkContainer> 
                       </p>
                       );

        let anon = userName && userName.substring(0, 9) !== 'anonymous' ? null : (
                      <p>You are currently using an automatically assigned user-name (aka moniker).  
                       This only means that you will not be able to submit your solutions for display on the leaderboards.
                       You can change your moniker <LinkContainer key="monikerlink" to="/changeMoniker"><a>here</a></LinkContainer>  
                       </p>
                       );



        return ( 
              <div>
                <div className="row">
                  <div className="col-md-12">
                      <p>Welcome to PseudoQ.net. Here we publish puzzles (mainly murderous Sudoku variants) that are playable online.
                      </p>
                      {anon}
                      {prov}
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-2">
                      <Nav bsStyle='pills' stacked activeKey={ dayName } >
                           {items}
                      </Nav>
                  </div>
                  <div className="col-md-10">
                    {this.props.children}
                  </div>
                </div>
              </div>
        );

    }

};
