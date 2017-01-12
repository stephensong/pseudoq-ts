"use strict";

import * as oxiDate from '../lib/oxidate';

import * as utils  from '../lib/utils';
import * as uuid from '../lib/uuid.js';

import { TimeSpan } from '../lib/timeSpan';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactBootStrap from 'react-bootstrap';
import Flex from './flex';

import * as Remarkable from 'remarkable';
const md = new Remarkable({html: true});

const { Button, Input } = ReactBootStrap;

import Tag from './tag';

import { connect } from 'react-redux';

export interface Post {
  readonly id?: number,
  readonly published?: Date,
  readonly lastedit?: Date,
  readonly title?: string,
  readonly body?: string,
  readonly tags?: string[]
}

interface BlogState {
   readonly posts: Post[],
   readonly filterTags: string[],
   readonly currentPost?: Post,
   readonly editing: boolean
}

type LOAD = 'blog/LOAD';
const LOAD: LOAD = 'blog/LOAD';
type LoadAction = {
  type: LOAD,
  posts: Post[]
}

type LOADENTRY = 'blog/LOADENTRY';
const LOADENTRY: LOADENTRY = 'blog/LOADENTRY';
type LoadEntryAction = {
  type: LOADENTRY,
  post: Post
}

type SELECT = 'blog/SELECT';
const SELECT: SELECT = 'blog/SELECT';
type SelectAction = {
  type: SELECT,
  post: Post
}

type UPDATE = 'blog/UPDATE';
const UPDATE: UPDATE = 'blog/UPDATE';
type UpdateAction = {
  type: UPDATE,
  post: Post
}

type STARTEDIT = 'blog/STARTEDIT';
const STARTEDIT: STARTEDIT = 'blog/STARTEDIT';
type StartEditAction = {
  type: STARTEDIT
}

type STOPEDIT = 'blog/STOPEDIT';
const STOPEDIT: STOPEDIT = 'blog/STOPEDIT';
type StopEditAction = {
  type: STOPEDIT
}

type EDITNEW = 'blog/EDITNEW';
const EDITNEW: EDITNEW = 'blog/EDITNEW';
type EditNewAction = {
  type: EDITNEW
}

type ADDTAG = 'link/ADDTAG';
const ADDTAG: ADDTAG = 'link/ADDTAG';
type AddTagAction = {
  type: ADDTAG,
  tag: string
}

type DROPTAG = 'link/DROPTAG';
const DROPTAG: DROPTAG = 'link/DROPTAG';
type DropTagAction = {
  type: DROPTAG,
  tag: string
}

type OtherAction = { type: '' };
const OtherAction : OtherAction = { type: '' };

type BlogAction = LoadAction | LoadEntryAction | SelectAction | UpdateAction
                | StartEditAction | StopEditAction | EditNewAction
                | AddTagAction | DropTagAction 
                | OtherAction

let initState: BlogState = {
    posts: [],
    filterTags: [],
    currentPost: undefined,
    editing: false
}

export function blankPost(): Post {
    return {id: 0,
            published: null,
            lastedit: new Date(),
            title: '',
            body: '',
            tags: []
           };
}

export function blogReducer(state: BlogState = initState, action: BlogAction): BlogState {
    //console.log("blogReducer called");
    let filterTags = state.filterTags
    switch (action.type) {

        case LOAD:
            if (action.posts.length === 0) return state;
            return {...state, currentPost: action.posts[0], posts: action.posts};

        case LOADENTRY:
            return {...state, currentPost: action.post};

        case SELECT:
            return {...state, currentPost: action.post};

        case EDITNEW:
            return {...state, currentPost: blankPost(), editing: true};

        case STARTEDIT:
            return {...state, editing: true};

        case STOPEDIT:
            return {...state, editing: false};

        case ADDTAG:
            if (filterTags.indexOf(action.tag) >= 0) return state;
            filterTags = [...filterTags, action.tag]
            return {...state, filterTags };

        case DROPTAG:
            var i = filterTags.indexOf(action.tag);
            if (i < 0) return state;
            filterTags = filterTags.slice(0);
            filterTags.splice(i,1);
            return {...state, filterTags };

        case UPDATE:
            let posts = state.posts;
            let id = action.post.id;
            var i = posts.findIndex(p => p.id === id);
            let newposts = i >= 0 ? posts.map(p => p.id === id ? action.post : p)
                                 : [action.post, ...posts];
            return {...state, currentPost: action.post, posts: newposts, editing: false};

        default: 
            return state;
    }
}

export interface BlogPostProps {post: Post, editing: boolean, dispatch: (action: BlogAction) => void };
export class BlogPost extends React.Component<BlogPostProps, {}> {
    ctrls: {
        title: HTMLInputElement,
        tags: HTMLInputElement,
        body: HTMLInputElement
    }

    save() {
        let title = this.ctrls.title.value;
        let tags = this.ctrls.tags.value.split(/[\s,]+/);
        let body = this.ctrls.body.value;
        let xhr = new XMLHttpRequest();   
        let post = {...this.props.post, title, body, tags};
        xhr.open("POST", "/blog/save");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onload = () => { 
            let rslt = JSON.parse(xhr.responseText);        
            if (rslt.ok) {
                let {id, lastedit, published} = rslt.results;     
                let newpost = {...post, id, lastedit: new Date(lastedit), published: new Date(published)};
                this.props.dispatch({type: UPDATE, post: newpost});
            }
        };
        xhr.send(JSON.stringify(post));
    }

    startEdit() { this.props.dispatch({type: STARTEDIT}) } 
    stopEdit() { this.props.dispatch({type: STOPEDIT}) }
    editNew() { this.props.dispatch({type: EDITNEW}) }
    addTag(tag) { this.props.dispatch({type: ADDTAG, tag}) }

    render() {
        let post = this.props.post; 
        if (!post) return null;
        if (this.props.editing) {
            let tags = post.tags.join(' ');
            return (
                <Flex row >
                  <Flex column style={{justifyContent: 'flex-start', flex: '0 0 100px' }}>
                    <Button key='save' bsSize='small' onClick={this.save} block >Save</Button> 
                    <Button key='stop' bsSize='small' onClick={this.stopEdit} block >Cancel</Button> 
                  </Flex>  
                  <Flex column style={{flex: '1 1 auto',  marginRight: 20 }}>
                        <Input type="text" style={{height: 40, width: '100%'}} ref={(e) => this.ctrls.title = e} label='Title' defaultValue={ post.title }  />                  
                        <Input type="textarea" style={{width: '100%', height: 400}}  ref={(e) => this.ctrls.body = e} label='Body' defaultValue={ post.body } />
                        <Input type="text" style={{height: 40, width: '100%'}}  ref={(e) => this.ctrls.tags = e} label='Tags' defaultValue={ tags } />
                  </Flex>
                </Flex> );
        } else {
            let h = {__html: md.render(post.body)};
            let lstedit = post.lastedit ? oxiDate.toFormat(post.lastedit, "DDDD, MMMM D @ HH:MIP") : '';
            let pub = post.published ? oxiDate.toFormat(post.published, "DDDD, MMMM D @ HH:MIP") : '';
            let edits = null;
            let tagbtns = post.tags.map(t => { return (<Tag key={'tag:'+t} onClick={ () => { this.addTag(t); }} >{t}</Tag> ); } );
            let userName = localStorage.getItem('pseudoq.userName');
            if (process.env.NODE_ENV !== 'production' || utils.isMember('author')) {
                edits = ( <Flex row style={{justifyContent: 'flex-start', alignItems: 'stretch', height: 30}}>
                           <Button key='edit' bsSize='small' style={{width: 100, height: '100%', marginTop: 0, marginRight: 10}} onClick={this.startEdit} block >Edit</Button> 
                           <Button key='new' bsSize='small' style={{width: 100, height: '100%', marginTop: 0, marginRight: 10}} onClick={this.editNew} block >New</Button> 
                        </Flex> );
            }
            return (
                <div>
                   { edits }
                    <Flex row style={{justifyContent: 'space-between' }}>
                       <h2>{post.title}</h2>
                       <div>
                           {tagbtns}
                       </div>
                    </Flex>
                   <p/>
                   <div dangerouslySetInnerHTML={h} />
                   <div>Id: {post.id}</div>
                   <Flex row style={{justifyContent: 'space-between' }}>
                      <div>Published: {pub}</div>
                      <div>Last Edit: {lstedit}</div>
                   </Flex>
                </div>   
                 );
        }
    }
}

export interface BlogProps extends BlogState {dispatch: (action: BlogAction) => void };
class _blog extends React.Component<BlogProps, {}> {

    componentWillMount() {
        let xhr = new XMLHttpRequest();   
        xhr.open("GET", "/blog/latest");
        xhr.onload = () => { 
            let posts: Post[] = JSON.parse(xhr.responseText).map(p => { return {...p, lastedit: new Date(p.lastedit), published: new Date(p.published) } } );
            this.props.dispatch({type: LOAD, posts});
        };
        xhr.send();
    }

    dropTag(tag) { this.props.dispatch({type: DROPTAG, tag}) }

    render() {
        let {currentPost, posts, editing, dispatch, filterTags} = this.props;
        if (!currentPost) return null;
        let others = null;
        if (!editing) {        
            let tagMatch = (ps, qs) => { return ps.some(p => qs.indexOf(p) >= 0) };
            let links = posts.filter( post => ( filterTags.length === 0 || tagMatch(post.tags, filterTags) ) )
                             .map( post => {
                  let txt = ( <span>{ post.title.trim() }</span> );
                  if (post.id === currentPost.id) txt = ( <strong>{ txt }</strong> );             
                  return (<li key={ post.id } onClick={ () => dispatch({type: SELECT, post}) }><a>{ txt }</a></li> );
              });
            others = ( <div>Posts: <ul>{links}</ul></div> );
        }
        let fltr = null
        if (filterTags.length > 0) {
            let fltrtags = filterTags.map(t => { return (<Tag key={'fltr:'+t} bsStyle='info' onClick={ () => { this.dropTag(t); }} >{t}</Tag> ); });
            fltr = ( <Flex row><span>Showing posts tagged :  { fltrtags }</span></Flex> );
        }


        return (
            <div>
                <h1>The Soapbox on the Nullarbor</h1>
                {fltr}
                {others}
                <p/>
                <BlogPost dispatch={ dispatch } post={ currentPost } editing={ editing } /> 
            </div>
            );
    }
}

export let Blog = connect(state => {
    //console.log("blog connect called");
    return state ? state.blog : null;
})(_blog);


let _blogEntry = React.createClass({

    componentWillMount() {
        let xhr = new XMLHttpRequest();   
        let {id} = this.props.params; 
        xhr.open("GET", "/blog/"+id);
        xhr.onload = () => { 
            let p = JSON.parse(xhr.responseText);   
            let post = ( {...p, lastedit: new Date(p.lastedit), published: new Date(p.published) } );
            this.props.dispatch({type: LOADENTRY, post});
        };
        xhr.send();
    },

    render() {
        let {currentPost, dispatch} = this.props;
        if (!currentPost) return null;
        return (
                <BlogPost dispatch={ dispatch } post={ currentPost } editing={ false } /> 
            );
    }
})

export let BlogEntry = connect(state => {
    //console.log("blog connect called");
    return state ? state.blog : null;
})(_blog);



