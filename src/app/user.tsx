"use strict";

import '../../css/bootstrap-flatly.css';
import './bootstrap';

import * as React from 'react';

import { Button, Input, Table } from 'react-bootstrap';
import { History, Link } from 'react-router';
import { connect } from 'react-redux';

import Flex from './flex';

export function getMoniker() {
    return localStorage.getItem('pseudoq.userName');
}

export function loadUser() {
    let cgrps = localStorage.getItem('pseudoq.groups');
    let groups = cgrps ? cgrps.split(',') : [];
    return {
        moniker: localStorage.getItem('pseudoq.userName') || '',
        groups,
        prov: localStorage.getItem('pseudoq.authprov') || ''
    };
}

export function initUser() {
    return {
        moniker: getMoniker(),
        groups: [],
        prov: '',
        stats: undefined
    };
}


export function storeAuthHeaders(xhr) {
    console.log("loading Auth headers");
    localStorage.setItem('pseudoq.userName', xhr.getResponseHeader('X-psq-moniker'));
    let prov = xhr.getResponseHeader('X-psq-authprov')
    if (prov)  localStorage.setItem('pseudoq.authprov', prov);
    else localStorage.removeItem('pseudoq.authprov');

    let grps = xhr.getResponseHeader('X-psq-groups') || '';
    grps = grps.replace('}',',');
    localStorage.setItem('pseudoq.groups', grps);
}

const LOADUSER = 'user/LOAD';
const NEWMONIKER = 'user/NEWMONIKER';
const INITSTATS = 'user/INITSTATS';
 
export function userReducer(state, action) {
    switch (action.type) {
        case LOADUSER:
            let usr = loadUser();
            return {...state, ...usr};

        case INITSTATS:
            return {...state, stats: action.stats};

        case NEWMONIKER:
            return {...state, moniker: action.newMoniker};

        default: 
            return state;
    }
}

export interface UserStatsProps {dispatch: any, stats: any[]};
export class UserStats extends React.Component<UserStatsProps, {} > {
    displayName: 'UserStats'

    componentWillMount() {
        //if (this.props.stats) return;
        let xhr = new XMLHttpRequest();   
        xhr.open("GET", "/userstats");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onload = () => {
            let rsp = JSON.parse(xhr.responseText);
            if (rsp.ok) this.props.dispatch({type: INITSTATS, stats: rsp.rows});
        };
        xhr.send();
    }

    render() {
        if (!this.props.stats) return null;
        let rows = [];
        this.props.stats.forEach(function (r) {
            rows.push( 
                <tr key={ r.gameType } >
                     <td>{ r.gameType }</td>
                     <td>{ r.gamescompleted }</td>
                     <td>{ r.avgmoves }</td>
                     <td>{ r.avgmoves_all }</td>
                </tr>
            );
        });


        return (
            <div>
              <p>Your current stats:</p>
              <Table striped bordered condensed hover>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th># completed</th>
                      <th>Average moves</th>
                      <th>Average moves - all users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows}
                  </tbody>
              </Table>
            </div>    
            )
    }


};

const _Login = React.createClass({displayName: 'Login',

    render() {
        return (
            <div>Sign in via:
      <ul>
        <li><a href="/auth/facebook" >Facebook</a></li>
        <li><a href="/auth/twitter" >Twitter</a></li> 
        <li><a href="/auth/github">GitHub</a></li>
        <li><a href="/auth/google">Google</a></li>
      </ul> 
      <p/>       
      <h3>Security Policy</h3>
      <p>This site refuses to ask you for a password, or any other identifying information - other than your moniker.  
      You do not have to choose a moniker, but if you choose to remain &apos;anonymous&apos; your completed games will not
      be eligible for inclusion in leaderboards.  Nor will the system provide 
      </p>
      <p> We do not store, encrypt or otherwise concern ourselves with any of your personal data.  
      The <strong>only</strong> thing we store about you
      is your moniker, along with games in progress, solutions submitted etc.</p>
      <p>In order to still reliably identify you, allowing e.g. for games in progress to be accessed across multiple devices, we
      ask that you identify yourself using any of the above "social login"s.  Essentially, this means that we rely on you
      identifying yourself to a third party, who then vouches for your identity to us.  If you would prefer to use another social
      login provider (LinkedIn, Pinterest, ...) please email your request, and we will endeavour to accomodate you.  
      </p>
           </div>
      );
    }
});

export const Login = connect(state => state )(_Login);

const _Logout = React.createClass({displayName: 'Logout',
    mixins: [History],

    componentDidMount() {
        var xhr = new XMLHttpRequest();
        console.log("logout requested");
        xhr.open("GET", '/logout');
        xhr.onload = () => {
            storeAuthHeaders(xhr);
            this.history.goBack();
            this.props.dispatch("FORCEREFRESH");

        };
        xhr.send();
    },

    render() { return null; },
});

export const Logout = connect(state => state )(_Logout);

interface ChangeMonikerProps {dispatch: any, moniker: string};
interface ChangeMonikerState {response: any, newMoniker: string};
export class ChangeMoniker extends  React.Component<ChangeMonikerProps, ChangeMonikerState > {
    ctrls: {
        moniker: HTMLInputElement
    }
    
    getInitialState() {
        return {
            response: {ok: true},
            newMoniker: this.props.moniker,
        };
    }

    changeMoniker() {
        this.setState({...this.state, newMoniker: this.ctrls.moniker.value });
    }

    saveMoniker() {
        let newName = this.state.newMoniker;
        //console.log("saving moniker : "+newName);

        let xhr = new XMLHttpRequest();   
        xhr.open("POST", "/newMoniker");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        xhr.onload = () => {
            let rsptxt = xhr.responseText;
            console.log("response received : "+rsptxt);           
            if(xhr.status !== 200) { 
                let msg = 'failed : ' + xhr.status + " - " + rsptxt;
                alert(msg);
            } else {
                let rsp = JSON.parse(rsptxt);
                this.setState({...this.state, response: rsp}); 
                if (rsp.ok) {
                    localStorage.setItem('pseudoq.userName', newName);
                    this.props.dispatch({type: NEWMONIKER, newMoniker: newName})
                }
            }
        };
        xhr.send(JSON.stringify({userName: newName}));

    }

    render() {
        console.log("rendering ChangeMoniker");
        let xtra = this.state.response.ok ? null : ( <div className="row">The moniker you requested is already taken.  Please try another.</div> );
        return (
            <div>
              <p>You can change your moniker, by editing below, then pressing Save.  The system requires that monikers have not been used before, either 
              by yourself or anyone else.</p>
              <Flex row style={{ justifyContent: 'flex-start' }} >
                  <Input type="text" ref={(e) => this.ctrls.moniker = e} value={ this.state.newMoniker } onChange={this.changeMoniker} style={{width: 300, height: 30 }} />   
                  <Button bsSize='small' onClick={this.saveMoniker} style={{ height: 30 }} >Save</Button>
              </Flex>
              <p>{ xtra }</p>
            </div>               
        )
    }
};

const UserDetails = React.createClass({
    render() {
        const {dispatch, stats, moniker} = this.props;
        return (
            <div>
                <UserStats stats={ stats }  dispatch={ dispatch } />
                <ChangeMoniker dispatch={ dispatch } moniker={ moniker } />
            </div>
            );
    }
});

export const User = connect(state => state.user )(UserDetails);

