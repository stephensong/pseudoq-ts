"use strict";

import '../../css/bootstrap-flatly.css';
import '../../css/psq.css';
import './bootstrap';

import * as oxiDate from '../lib/oxidate';
import { isMember } from '../lib/utils';
import * as uuid from '../lib/uuid';

import {TimeSpan} from '../lib/timeSpan';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Input } from 'react-bootstrap';
import Flex from './flex';

import Tag from './tag';

import * as Remarkable from 'remarkable';
const md = new Remarkable({html: true});

import { connect } from 'react-redux';

export function blankLink() {
    return {id: 0,
            guid: uuid.generate(),
            published: null,
            lastedit: new Date(),
            url: '',
            notes: '',
            tags: [],
            expanded: false,
            editing: false
           };
}

const LOAD = 'link/LOAD';
const UPDATE = 'link/UPDATE';
const STARTEDIT = 'link/STARTEDIT';
const STOPEDIT = 'link/STOPEDIT';
const EDITNEW = 'link/EDITNEW';
const EXPAND = 'link/EXPAND';
const UNEXPAND = 'link/UNEXPAND';
const DELETE = 'link/DELETE';
const ADDTAG = 'link/ADDTAG';
const DROPTAG = 'link/DROPTAG';

let initState = {
    tags: [],
    links: []
}

export function linksReducer(state = initState, action) {
    //console.log("linksReducer called");
    let news = null;
    let {links, tags} = state;
    let i = 0;
    switch (action.type) {

        case LOAD:
            if (action.links.length === 0) return state;
            let rslt = {...state, links: action.links};
            return rslt;

        case EDITNEW:
            let nl = blankLink();
            nl.editing = true;
            news = links.slice(0)
            news.unshift(nl);
            return {...state, links: news };

        case EXPAND:
            news = links.map(l => l === action.link ? {...l, expanded: true} : l)
            return {...state, links: news };

        case UNEXPAND:
            news = links.map(l => l === action.link ? {...l, expanded: false} : l)
            return {...state, links: news };

        case STARTEDIT:
            news = links.map(l => l === action.link ? {...l, editing: true} : l)
            return {...state, links: news };

        case STOPEDIT:
            news = links.map(l => l === action.link ? {...l, editing: false} : l)
            return {...state, links: news };

        case ADDTAG:
            if (tags.indexOf(action.tag) >= 0) return state;
            tags = [...tags, action.tag]
            return {...state, tags };

        case DROPTAG:
            i = tags.indexOf(action.tag);
            if (i < 0) return state;
            tags = tags.slice(0);
            tags.splice(i,1);
            return {...state, tags };

       case UPDATE:
            var guid = action.link.guid;
            var f = p => guid ? (p.guid === guid) : (p.id === action.link.id);
            i = links.findIndex(f);
            news = links.slice(0);
            if (i >= 0 ) news.splice(i,1,action.link);
            else news.unshift(action.link);
            return {...state, links: news};

        case DELETE:
            var guid = action.link.guid;
            var f = p => guid ? (p.guid === guid) : (p.id === action.link.id);
            i = links.findIndex(f);
            if (i < 0) return state;
            news = links.slice(0);
            news.splice(i,1);
            return {...state, links: news};

        default: 
            return state;
    }
}

interface LinkEntryProps {link: any, dispatch: (action: any) => void};
class LinkEntry extends React.Component<LinkEntryProps, {}> {
    ctrls: {
        url: HTMLInputElement,
        tags: HTMLInputElement,
        notes: HTMLInputElement
    }

    save() {
        let url = this.ctrls.url.value;
        if (!url) return;
        let tags = this.ctrls.tags.value.split(/[\s,]+/);
        let notes = this.ctrls.notes.value;
        let xhr = new XMLHttpRequest();   
        let link = {...this.props.link, url, notes, tags};
        let guid = link.guid;
        delete link.editing;
        delete link.expanded;
        delete link.guid;
        xhr.open("POST", "/link");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onload = () => { 
            let rslt = JSON.parse(xhr.responseText);        
            if (rslt.ok) {
                let {id, lastedit, published} = rslt.results;     
                let newlink = {...link, guid, id, lastedit: new Date(lastedit), published: new Date(published)};
                this.props.dispatch({type: UPDATE, link: newlink});
            }
        };
        xhr.send(JSON.stringify(link));
    }

    destroy() {
        let xhr = new XMLHttpRequest();   
        let link = this.props.link;
        let id = link.id;
        if (!id) {
            this.props.dispatch({type: DELETE, link});
            return;
        }
        xhr.open("POST", "/link/delete");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onload = () => { 
            //console.log(xhr.responseText);     
            let rslt = JSON.parse(xhr.responseText);   
            if (rslt.length === 1) {
                this.props.dispatch({type: DELETE, link});
            }
        };
        xhr.send(JSON.stringify({id}));
    }

    startEdit() { this.props.dispatch({type: STARTEDIT, link: this.props.link}) }

    stopEdit() { 
        this.props.dispatch({type: this.props.link.id > 0 ? STOPEDIT : DELETE, 
                             link: this.props.link}) 
    }

    addTag(tag) { this.props.dispatch({type: ADDTAG, tag}) }

    render() {
        let {link, dispatch} = this.props; 
        if (!link) return null;
        let tags = link.tags.join(' ');
    	if (link.editing) {
            return (
                <Flex row >
                  <Flex column style={{flex: '1 1 auto',  marginRight: 20 }}>
                        <Input type="text" style={{height: 40, width: '100%'}} ref={(e) => this.ctrls.url = e} label='Url' defaultValue={ link.url }  />                  
                        <Input type="textarea" style={{width: '100%', height: 400}} ref={(e) => this.ctrls.notes = e} label='Notes' defaultValue={ link.notes } />
                        <Input type="text" style={{height: 40, width: '100%'}} ref={(e) => this.ctrls.tags = e} label='Tags' defaultValue={ tags } />
                  </Flex>
                  <Flex column style={{justifyContent: 'flex-start', flex: '0 0 100px' }}>
                    <Button key='save' bsSize='small' onClick={this.save} block >Save</Button> 
                    <Button key='stop' bsSize='small' onClick={this.stopEdit} block >Cancel</Button> 
                  </Flex>  
                </Flex> );
        } else {
            let h = null;
            let edits = null;
            let expBtn = ( <Button bsSize='small' style={{width: 30, margin: 5}} block onClick={ () => dispatch({type: link.expanded ? UNEXPAND : EXPAND, link})}>{link.expanded ? '-' : '+'}</Button> );
            let tagbtns = link.tags.map(t => { return (<Tag key={'tag:'+t} onClick={ () => { this.addTag(t); }} >{t}</Tag> ); } );
            if (link.expanded) {
                let lstedit = link.lastedit ? oxiDate.toFormat(link.lastedit, 'DDDD, MMMM D @ HH:MIP') : '';
                let pub = link.published ? oxiDate.toFormat(link.published, 'DDDD, MMMM D @ HH:MIP') : '';
	            if (process.env.NODE_ENV !== 'production' || isMember('author')) {
	                edits = ( <Flex row style={{justifyContent: 'flex-start', alignItems: 'stretch', height: 30}}>
                               <Button key='edit' bsSize='small' style={{width: 100, height: '100%', marginTop: 0, marginRight: 10}} onClick={this.startEdit} block >Edit</Button> 
                               <Button key='del' bsSize='small' style={{width: 100, height: '100%', marginTop: 0, marginRight: 10}} onClick={this.destroy} block >Delete</Button> 
	                        </Flex> );
                }
            	h = (<Flex row key={ link.id + "_exp"}>
                      <Flex column style={{width: '100%'}} >
            	       <Flex row style={{width: '100%'}}  >
                         <div dangerouslySetInnerHTML={{__html: md.render(link.notes)}} />
                       </Flex> 
	                   <Flex row style={{width: '100%', justifyContent: 'space-between' }}>
	                      <div>Id: {link.id}</div>
	                      <div>Published: {pub}</div>
	                      <div>Last Edit: {lstedit}</div>
	                   </Flex>
	                   { edits }
                      </Flex>
	                 </Flex> 
	                );
	        }
            let url = link.url.trim();
            if (url.substring(0,4).toLowerCase() !== 'http') url = 'http://' + url
            return (
              <div>
                <Flex row key={ link.id } style={{justifyContent: 'flex-start', alignItems: 'center'}} >
                    <div>{ expBtn }</div> 
                    <a href={ url } target="_blank">{ url }</a>
                    <div>{ tagbtns }</div>
                </Flex>
                {h}
              </div>  );
        }
    }
};

let _links = React.createClass({

    componentWillMount() {
        let xhr = new XMLHttpRequest();   
        xhr.open("GET", "/links");
        xhr.onload = () => { 
            let links = JSON.parse(xhr.responseText);   
            links = links.map(p => { return {...p, lastedit: new Date(p.lastedit), published: new Date(p.published) } } );
            this.props.dispatch({type: LOAD, links});
        };
        xhr.send();
    },

    editNew() { console.log("edit new"); this.props.dispatch({type: EDITNEW}); },
    dropTag(tag) { this.props.dispatch({type: DROPTAG, tag}) },


    render() {
        let {links, dispatch, tags} = this.props;
       //if (links.length === 0) return null;
        let tagMatch = (ps, qs) => { return ps.some(p => qs.indexOf(p) >= 0) };
        let entries = links.filter( link => ( tags.length === 0 || tagMatch(link.tags, tags) ) )
                           .map( link => {
        	return <LinkEntry key={link.id} dispatch={ dispatch } link={ link } />
        });

        let fltr = null
        if (tags.length > 0) {
            let fltrtags = this.props.tags.map(t => { return (<Tag key={'fltr:'+t} bsStyle='info' onClick={ () => { this.dropTag(t); }} >{t}</Tag> ); });
            fltr = ( <Flex row><span>Showing entries tagged :  { fltrtags }</span></Flex> );
        }

        return (
            <div>
                <h2>Links</h2> 
                <Button key='new' bsSize='small' style={{width: 100, height: '100%', marginTop: 0, marginRight: 10}} onClick={this.editNew} block >New</Button> 
                {fltr}
                <p/>
                {entries}
                <p/>
            </div>
            );
    }
});


export let Links = connect(state => {
    //console.log("blog connect called");
    return state ? state.links : null;
})(_links);

