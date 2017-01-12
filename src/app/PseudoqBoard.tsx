"use strict";

import '../../css/bootstrap-flatly.css';
import '../../css/psq.css';
import './bootstrap';

import * as oxiDate from '../lib/oxidate';
import {solutionSorter, isCellActive} from '../lib/utils';

import {TimeSpan} from '../lib/timeSpan';

import * as grph from './graphics';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, ButtonToolbar, ButtonGroup, Input, Modal } from 'react-bootstrap';

import {LinkContainer} from 'react-router-bootstrap';
import SolutionsTable from './SolutionsTable';
import ChallengesTable from './challengesTable';

import * as PickerPanels from './pickers';
const HorizontalPickerPanel = PickerPanels.Horizontal;
const VerticalPickerPanel = PickerPanels.Vertical;
const ColwisePickerPanel = PickerPanels.Colwise;
const RowwisePickerPanel = PickerPanels.Rowwise;

import Flex from './flex';
const renderedBoards = {};

let vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
let defaultAvail = Object.create(null);
vals.forEach( function(i) {
    defaultAvail[i] = false; 
});

function newPickers() { return [false,false,false,false,false,false,false,false,false,false]; };

function newModel(cols,rows) {
    let mdl = Object.create(null);
    cols.forEach( function(c) {
        rows.forEach( function(r) {
            let trues = Object.create(null)
            vals.forEach( function(i) {
                trues[i] = true;
            });
            mdl[c+r] = trues;
        });
    }); 
    mdl.comment = '';
    mdl.moveCount = 0;
    return mdl;
};

function isCompleted(mdl, board) {
    let soln = board.solution;
    return board.cols.every( c => {
        return board.rows.every( r => {
            let id = c+r;
            let ps = mdl[id];
            let chk = soln[id];
            return !isCellActive(id) || ( typeof ps !== 'object' ? ps === chk : vals.every( function (i) { return i === chk ? ps[i] : !ps[i]; }) );
        });
    });
};

export function createModel(prnt) {
    let mdl = Object.create(prnt);
    mdl.comment = '';
    mdl.moveCount = prnt.moveCount + 1;
    return mdl;
};

function constructMoves(mdl,storeModel = false) {
    let _cons = function _cons(mdl,storeModel) {
        let prnt = Object.getPrototypeOf(mdl);
        if (!prnt) return [];
        let rslt = Object.getPrototypeOf(prnt) ? _cons(prnt,storeModel) : [];
        let pstr = function(ps) {
            let trslt = '';
            if (typeof ps === 'object') vals.forEach( function(i) { if (ps[i]) { trslt += i.toString(); } } );
            else trslt = ps.toString();
            return trslt;
        };
        let a = Object.create(null);
        Object.keys(mdl).forEach( function(c) {
            if (mdl[c]) {
                let s = pstr(mdl[c]);
                if (s.length < 9) a[c] = pstr(mdl[c]);
            }
        });
        a.comment = mdl.comment; 
        a.moveCount = mdl.moveCount;
        if (storeModel) {
            let t = {model: prnt, move: a}
            a = t;
        }
        rslt.push(a);
        return rslt;
    }
    let rslt = _cons(mdl,storeModel);
    if (storeModel) rslt.push({model: mdl, move: {dummy: true, comment: '', moveCount: mdl.moveCount}});
    return rslt;

};

let initState = {
    pickers: newPickers(),
    selectedCells: [],
    mode: 'view',
    model: undefined,
    autoEliminate: true,
    autoPromote: false,
    focusCell: undefined,
    moveComment: '',
    moveIndex: -1,   // currently only used in review mode
    savedMoveCount: 0,
    savedModel: undefined,
    moves: [], 
    solutions: [],
    reSubmit: false,
    completed: false,
    pickerPanelPos: 'top',
    layoutNo: 3,
    timer: null,
    colorTag: 'Transparent',
    unitsize: -1
};

function getUnitSize(board) {
    if (board.mode === 'view') return 36; 
    let sz = board.cols.length;
    let cu = localStorage.getItem('pseudoq.settings.' + sz);
    if (cu) return parseInt(cu);
    return sz === 21 ? 45 : 54;
}


function getLocalStorage(props) {
    console.log("getLocalStorage called");
    let {dayName, pos, pubID} = props;
    let pzl = dayName + "/" + pos;
    let cmvs = localStorage.getItem('pseudoq.local.' + pzl);
    let bmvs = props.moves;
    let mvs = null
    if (mvs) {
        let tmvs = JSON.parse(cmvs);
        if (mvs.pubID == pubID) mvs = tmvs.moves;
    }
    let a = mvs && mvs.length > 0 ? mvs[mvs.length - 1].moveCount : -1; 
    let b = bmvs && bmvs.length > 0 ? bmvs[bmvs.length - 1].moveCount : -1; 
    if (b > a) mvs = bmvs;
    return mvs;
}

function applyMoveToModel(mdl,m) {
    Object.keys(m).forEach( function(cid) {
        if (cid !== 'moveCount' && cid != 'comment' && cid != 'user' && mdl[cid]) {
            let oks = m[cid];
            if (oks.length === 1) {
                mdl[cid] = parseInt(oks);
            } else {
                let ps = Object.create(null)
                vals.forEach( function(i) {
                    let c = i.toString();
                    ps[i] = oks.indexOf(c) >= 0;
                });
                mdl[cid] = ps;
            }
        }
    }); 
    mdl.comment = m.comment;
    mdl.moveCount = m.moveCount;
    mdl.user = m.user;
    return mdl;
};

function completionPoints(mdl, board) {
    let soln = board.solution;
    let score = 0;
    let tot = 0;
    board.cols.forEach( (c) => {
        board.rows.forEach( (r) => {
            let id = c+r;
            if (isCellActive(id)) {  
                let ps = mdl[id];
                let chk = soln[id];
                tot += 8;
                if ( typeof ps !== 'object' ) {
                     if (ps === chk) score += 8;
                } else {
                    let ok = true;
                    let tscore = 0
                    vals.forEach( (i) => { 
                        if (i === chk && !ps[i]) ok = false;
                        else if (!ps[i]) tscore += 1; 
                    });
                    if (ok) score += tscore; 
                } 
            } 
        });
    });
    return {points: score, total: tot};
}

function applyMovesToModel(org, mvs) {
    let mdl = org;   
    mvs.forEach( m => { mdl = applyMoveToModel( createModel(mdl), m); });
    return mdl;
};

function initRegions(cols,rows) {
    let regs = []
    let sz = rows.length;
    let origs =  sz === 9 ? [ [0,0 ] ]
                          : [ [6,6], [0,0], [0,12], [12,0], [12,12] ];

    origs.forEach( function(e) {
        let x = e[0], y = e[1];
        let cid;
        let reg;
        for (let c = 0; c < 9; c++) {
            reg = []; 
            for (let r = 0; r < 9; r++) {
                cid = cols[x+c] + rows[y+r]
                reg.push(cid);
            };
            regs.push(reg)
        }; 

        for (let r = 0; r < 9; r++) {
            reg = []; 
            for (let c = 0; c < 9; c++) {
                cid = cols[x+c] + rows[y+r]
                reg.push(cid);
            };
            regs.push(reg)
        }; 

        let a = [0,1,2];

        for (let n = 0; n < 9; n++) {
            let x0 = ( n % 3 ) * 3;
            let y0 = Math.floor( n / 3 ) * 3;
            reg = [];
            a.forEach( function (i) {
                a.forEach( function (j) {
                    cid = cols[x+x0+i] + rows[y+y0+j]
                    reg.push(cid);
                });
            });
            regs.push(reg); 

        };
    });

    return regs;

};


let renderBoard = function(brd,unitsize,mode) {
    let ky = brd.pubID.toString() + unitsize + (mode === 'view' ? '1' : '0') + (mode === 'completed' ? '1' : '0') ;
    let cUrl = renderedBoards[ky];

    if (!cUrl) {
        let boardsize = brd.cols.length;
        let board = {...brd, unitsize};
        let dim = boardsize * unitsize + 1; 
        board.showTotals = mode !== 'view';

       if (mode === 'completed') {
            board.clrBackGround = board.clrGreen;
            board.lineColor = 'black';
        } else {
            delete board.clrBackGround;
            delete board.lineColor;
        }

        console.log('rendering : '+mode);
        let d: any = grph.Drawer(board);
        let canvas = d.drawLayout();
        cUrl = canvas.toDataURL();
        renderedBoards[ky] = cUrl;
    }
    return cUrl;
}

function reviewGoto(brd, i, mvs?, st?) {
    //console.log('goto : '+i);
    st = st || {};
    let props = {...brd, ...st}
    mvs = mvs || props.moves;
    mvs[props.moveIndex].move.comment = props.moveComment;
    if (i < 0 || i >= mvs.length) return;
    let mv = mvs[i];
    let sels = [];
    let pkrs = newPickers();
    let mdl = mv.model;

    Object.keys(mv.move).forEach( function(cid) {
        if (cid !== 'comment' && cid !== 'moveCount' && mdl[cid]) sels.push(cid);
    });


    vals.forEach( function(i) { 
        sels.forEach( function(cid) { 
            let ps = mdl[cid];
            if (typeof ps === 'object') {
                if (!pkrs[i] && ps[i]) pkrs[i] = true; 
            }
        });
    });

    sels.forEach( function(cid) {
        let ps = mv.move[cid];
        vals.forEach( function(i) {
            if (ps.indexOf(i) >= 0 ) {
                pkrs[i] = false;
            };
        });
    });

    return {...props, moves: mvs, model: mdl, moveComment: mv.move.comment || '', selectedCells: sels, pickers: pkrs, moveIndex: i};
};

function reviewSolution(a, board) {
    let mdl = newModel(board.cols,board.rows);
    mdl = applyMovesToModel(mdl,a);
    let mvs = constructMoves(mdl, true);
    let cmt = mvs.length === 0 ? '' : mvs[0].move.comment;
    let savmdl = board.model || mdl;
    let cnt = savmdl.moveCount || 0;
    let brd = {...board, moves: mvs, model: mvs[0].model, moveIndex: 0, moveComment: cmt, savedMoveCount: cnt, savedModel: savmdl};
    return reviewGoto(brd,0)
}

function loadComponent(st, props) {
    console.log('loadComponent');
    let strt = new Date();
    let mode = props.mode || 'view' ;
    let mvs = props.random ? null : mode === 'reviewSolution' ? props.initMoves : getLocalStorage(props);

    let brd = {...props};

    let sz = parseInt(brd.size)
    let rows = [];
    let cols = [];
    for (let i = 1; i <= sz; ++i) {
        rows.push(i);
        cols.push(String.fromCharCode(64+i));
    }

    brd.cols = cols;
    brd.rows = rows;
    let regs = [];
    let autoEliminate = true;
    let layoutNo = 3;

    regs = initRegions(cols,rows)
    Object.keys(brd.regions).forEach(r => regs.push(r.split(":")) );
    let svdauto = localStorage.getItem('pseudoq.settings.autoEliminate');
    if (svdauto) autoEliminate = (svdauto === 'true');
    let svdlno = localStorage.getItem('pseudoq.settings.layoutNo')
    if (svdlno) layoutNo = parseInt(svdlno);

    brd.clrBackGround = "White";
    brd.clrForeGround = "Black";
    brd.clrRed = "Red";
    brd.clrGreen = "LightGreen";
    brd.clrYellow = "Yellow";
    brd.clrBlue = '#64E8E2';
    brd.clrPurple = '#CE2DB3';

    let gt = brd.lessThans || brd.equalTos;
    brd.gameType = sz == 21 ? ( gt ? "Assassin" : "Samurai")
                            : ( gt ? "Ninja" : "Killer");

    
    if (mode === 'reviewSolution') {
        brd = reviewSolution(mvs,brd);
        mvs = null;
    }
    else {
        let mdl = newModel(cols,rows);
        if (mvs) mdl = applyMovesToModel(mdl, mvs);
        brd.model = mdl;
    }
    let rslt = {...initState, ...st, ...brd, boardsize: rows.length, allRegions: regs, autoEliminate, layoutNo, completed: false};
    if (mvs) {
        if (mode === 'review') {  // untested at this stage
            rslt.moves = constructMoves(brd.model, true);
            rslt.moveIndex = 0;
            rslt.moveComment = st.moves[0].move.comment;
            rslt.model = st.moves[0].model;
        } 
        else rslt.completed = isCompleted(brd.model, brd);

    }

    return rslt;
};


const LOAD = 'psq/LOAD';
const POSTMODEL = 'psq/POSTMODEL';
const POSTSTATE = 'psq/POSTSTATE';

export function psqReducer(state = initState, action) {

    let typ = action.type;
    if (typ === LOAD) {
        let brd = loadComponent(state, action.props)
        return brd;

    } 
    else if (typ === POSTMODEL) {
        return {...state, 
                model: action.model,
                pickers: newPickers(),
                selectedCells: [],
                moveComment: '',
                ...action.newst,
                };
    } 
    else if (typ === POSTSTATE) {
        return {...state, ...action.newst };
    }
    return state;
}

interface CheckModalProps {check: any, opened: any, fix: any}; 
interface CheckModalState {showModal: boolean};
class CheckModal extends React.Component<CheckModalProps, CheckModalState> {

    getInitialState() {
        return { showModal: false };
    }

    close() {
        this.setState({ showModal: false });
    }

    open() {
        this.props.opened()
        this.setState({ showModal: true });
    }

    fixErrors() {
        this.close();
        this.props.fix();
    }

    render() {
        let modal = this.props.check() ? (
                <Modal show={this.state.showModal} onHide={this.close}>
                  <Modal.Header closeButton>
                    <Modal.Title>Errors found</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                      <div> Mistakes have been made! Revert to last good state?
                      </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={this.fixErrors} bsStyle="primary">Revert</Button>
                    <Button onClick={this.close} >Cancel</Button>
                  </Modal.Footer>
                </Modal>
            ): (
                <Modal show={this.state.showModal} onHide={this.close}>
                  <Modal.Header closeButton>
                    <Modal.Title>Heavenly bliss</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                      <div> Fantastic, you&apos;ve managed to not fuck it up yet ... You&apos;re naked genius shines eternal!
                      </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={this.close} >Close</Button>
                  </Modal.Footer>
                </Modal>
            );
        return (
              <Button bsSize='small' block>
                <div onClick={this.open} >Check</div>
                {modal}
              </Button>
            );
    }

};

interface RestartModalProps {restart: any}; 
interface RestartModalState {showModal: boolean};
class RestartModal extends React.Component<RestartModalProps,RestartModalState> {
  getInitialState() {
    return { showModal: false };
  }

  close() {
    this.setState({ showModal: false });
  }

  open() {
    this.setState({ showModal: true });
  }

  restart() {
    this.close();
    this.props.restart();
  }

  render() {
    return (
      <Button bsSize="small" block>
        <div onClick={this.open} >Restart</div>

        <Modal show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Restart Puzzle</Modal.Title>
          </Modal.Header>
          <Modal.Body>
              <div>This will erase all moves and restart the puzzle from scratch.  It is not Undo-able.
              </div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.restart} bsStyle="primary">Proceed</Button>
            <Button onClick={this.close} >Cancel</Button>
          </Modal.Footer>
        </Modal>
      </Button>  
    );
  }
};

interface PossProps {board: any, mode: string, setCellValue: any, bkg: any, clr: any, key: number, val: number};
class Poss extends React.Component<PossProps, {}> {
    handleRightClick(e) {
        if (this.props.mode === 'play') {
            this.props.setCellValue(this.props.val);
            e.preventDefault();
        }
    }

    render() {
        let board = this.props.board;
        let styl = {
                display: 'block',
                width: board.possSize,
                height: board.possSize,
                float: 'left',
                textAlign: 'center',
                fontFamily: 'Verdana',
                fontWeight: "lighter" as "lighter",   // "600"  wtf??
                fontSize: board.possFontSize,
                color: this.props.clr, 
                cursor: 'default',
                backgroundColor: this.props.bkg
            };
        return(
            <div style={styl} onContextMenu={this.handleRightClick} > 
               {this.props.val}
            </div>
        );
    }
};

interface CellProps {board: any, mode: string, handleClick: any, setCellValue: any, cid: string, issel: boolean, active: boolean, completed: boolean, solution: any};
class Cell extends React.Component<CellProps, {}> {

    handleClick() {
        let mode = this.props.board.mode;
        if (mode === 'play') this.props.handleClick(this);
    }

    handleKeyPress(e) {
        if (this.props.board.mode === 'play') {
            let it = e.which - 48;
            this.setCellValue(it);
        }
    }

    setCellValue(it) {
        this.props.setCellValue(this.props.cid,it);
    }

    render() {
        let id = this.props.cid;
        let board = this.props.board;
        let mode = board.mode;
        let mdl = board.model;
        let issel = this.props.issel;
        let ps = mdl[id];

        let borderStyle = {
            display: 'block',
            float: 'left',
            width: board.unitsize,
            height: board.unitsize,
            padding: 6
        };

        let cellStyle = {
            display: 'block',
            position: 'relative',
            backgroundColor: 'Transparent',
            top: board.cellTop,
            left: board.cellLeft,
            width: board.cellSize,
            height: board.cellSize,
            float: 'left',
            padding: 0,
            margin: 0
        };

        if (this.props.active && this.props.completed) {
            //console.log("soln : "+this.props.solutionn+", "+( (typeof ps === 'object') ? ps[this.props.solution] : ps));
            let ok = (typeof ps === 'object' && ps[this.props.solution]) || ps === this.props.solution;
            if (!ok) cellStyle.backgroundColor = board.clrRed;
        }

        if (!this.props.active) return( <div style={borderStyle} /> );

        if (typeof ps === 'object') {
            let alltrue = true;
            vals.forEach( function(i) { if (!ps[i]) { alltrue = false; return; } });
            if (alltrue && !issel) {
                return mode === 'view' ? ( <div style={borderStyle}  /> )
                        : ( <div style={borderStyle} onKeyPress={this.handleKeyPress} onClick={this.handleClick}  tabIndex={0} /> );
            } else {
                let fontsz = board.possFontSize; //Math.floor(possSize * 6.5).toString() + '%';
                let poss =
                    vals.map( function(i) {
                        let bkg = 'Transparent'; // board.clrBackGround;
                        let clr = ps[i] ? board.clrForeGround : 'Transparent';
                        if (issel && ps[i] ) {
                            bkg = board.pickers[i] ? board.clrRed : board.clrGreen;
                        }
                        return (
                            <Poss board={board} mode={mode} setCellValue={this.setCellValue} bkg={bkg} clr={clr} key={i} val={i} />
                        );
                    }, this);
                return this.props.mode === 'view' ? (<div style={borderStyle}  ><div style={cellStyle} >{poss}</div></div> )
                                                  : (
                   <div style={borderStyle}  onKeyPress={this.handleKeyPress} onClick={this.handleClick} tabIndex={0} >
                       <div style={cellStyle}>
                           {poss}
                       </div>    
                    </div>
                );
            }
        } else {
            let cStyle = {...cellStyle, color: board.clrForeGround, textAlign: "center", fontWeight: 'bold' as "bold", fontSize: board.cellFontSize};
            return (
                <div style={borderStyle}  >
                    <div style={cStyle} onClick={this.handleClick}  tabIndex={0} >{ps}</div>
                </div>
            );
        };

    }

};

interface TimerProps {timer: any, elapsed: number};
interface TimerState {timer: any, elapsed: number};
class Timer extends React.Component<TimerProps,TimerState> {

    getInitialState(){
        return { timer: null, elapsed: 0};
    }

    componentDidMount(){
        this.setState({...this.state, timer: window.setInterval(this.tick, 500)});
    }

    componentWillUnmount(){
        window.clearInterval(this.state.timer);
    }

    tick(){
        if (!this.props.timer.isPaused()) {
            this.setState({...this.state, elapsed: this.props.timer.elapsed()});
        }        
    }

    render() {
        var elapsed = new TimeSpan(this.props.elapsed);
        return <span>{elapsed.toString()}</span>;
    }
};

interface ProgressProps {height: number, width: number, score: number, timer: any, timeOut: number, onTimeout: any};
interface ProgressState {ticker: any, elapsed: number};
class Progress extends React.Component<ProgressProps,ProgressState> {

    getInitialState(){
        return { ticker: null, elapsed: 0};
    }

    componentDidMount(){
        this.setState({ticker: window.setInterval(this.tick, 500), elapsed: 0});
    }

    componentWillUnmount(){
        window.clearInterval(this.state.ticker);
    }

    tick(){
        let el = Math.floor(this.props.timer.elapsed() / 1000);
        if (el >= this.props.timeOut) {
            if (this.props.onTimeout) this.props.onTimeout();
            window.clearInterval(this.state.ticker);
        }
        this.setState({...this.state, elapsed: el});
    }

    render() {
        var elapsed = this.state.elapsed;
        //console.log("elapsed : "+elapsed);
        var tmOut = this.props.timeOut; 
        let h = this.props.height;
        let w = this.props.width;
        var pc = Math.floor((elapsed / tmOut) * 100);
        var pct = pc.toString() + '%'; 
        var pcr = (100-pc).toString() + '%'; 
        return (
            <Flex row style={{height: h, width: '100%', borderStyle: 'solid', borderWidth: 2, marginTop: 5, marginLeft: 5, padding: 6 }} >
                <Flex column style={{alignItems: 'center'}} >
                    <Flex row style={{flex: 1} }>Score</Flex>
                    <Flex row style={{flex: 2, fontSize: 30 }}>{ this.props.score }</Flex>
                    <Flex row style={{borderStyle: 'solid', borderWidth: 1, flex: 70, width: '100%'}}>
                        <Flex column>
                            <Flex row style={{backgroundColor: 'Transparent', flex: pc, width: '100%' }} />
                            <Flex row style={{backgroundColor: 'red', flex: (100-pc), width: '100%' }} />
                        </Flex>
                    </Flex>
                </Flex>
            </Flex>
        );
    }
};

interface PseudoqBoardProps {
     moveComment: string, mode: string, dayName: string, pos: number, boardsize: number, pubDay: any,
     lessThans: any[], equalTos: any[], rating: any, pubID: number, moves: any[], moveIndex: number,
     reSubmit: boolean, random: boolean, dispatch: (action: any) => void, solutions: any[],
     cols: any[], rows: any[], model: any, selectedCells: any[], pickers: any[], pickerPanelPos: any,
     autoEliminate: boolean, allRegions: any[], size: number, autoPromote: boolean, focusCell: any,
     savedMoveCount: number, savedModel: any, completed: boolean, timeOut?: any, puzzleId: number,
     solution: any, layoutNo: number, timer?: any,
     unitsize: number, cellSize: number, possSize: number, cellLeft: number, cellTop: number,
     cellFontSize: string, possFontSize: string, clrBackGround: string, gameType: string,
     newGame: any, _isMounted?: boolean, initMoves?: any[]
};

interface PseudoqBoardState {reSubmitTimer: any};
export class PseudoqBoard extends React.Component<PseudoqBoardProps,PseudoqBoardState> { 

    getInitialState() {
        return {
            reSubmitTimer: null,
        };
    }

    ctrls: {
        comment: HTMLInputElement,
    }

    setModelState(model, cmt?, st?) {
        cmt = cmt || this.props.moveComment || '';
        st = st || {}
        model.comment = cmt;
        let {mode, dayName, pos} = this.props;
        if (mode === 'play' || mode == 'review') {
            let board = this.props;
            let mdl = model;
            let mvs = Object.create(null);
            let completed = isCompleted(mdl,board);
            mvs.version = 2.1;
            mvs.pubDay = board.pubDay;
            mvs.samurai = this.props.boardsize === 21;
            mvs.greaterThan = (board.lessThans || board.equalTos ? true : false );
            mvs.rating = board.rating;
            mvs.pubID = board.pubID;
            mvs.completed = completed;

            if (mode === 'play') {
                mvs.moves = constructMoves(mdl);
                mvs.lastPlay = new Date();
            } else if (mode === 'review') {
                let a = this.props.moves;
                if (a[this.props.moveIndex].move.comment === this.props.moveComment ) mvs = undefined;
                else {
                    a[this.props.moveIndex].move.comment = this.props.moveComment;
                    mvs.moves = a.map( function(mv) { return mv.move; } );
                }
            }
            if (mvs) {
                let txt = JSON.stringify(mvs);
                this.setLocalStorage(txt);
                if (mode !== 'review') {
                    if (this.props.reSubmit || mvs.completed) {
                        if (!this.props.random) this.autoSubmit(mdl);
                        st.completed = mvs.completed;
                    }
                }
            }
        }
        let act = {type: POSTMODEL, model, newst: st, dayName, pos}
        this.props.dispatch(act);
    }

    postState(newst) {
        let {dispatch, dayName, pos} = this.props;
        dispatch({type: POSTSTATE, newst, dayName, pos });
    }

    hasSolution() {
        let solns = this.props.solutions;
        return solns && solns.length > 0;
    }

    saveComment() {
        var cmt = this.ctrls.comment.value;
        this.postState({ moveComment: cmt });
    }

    restart() {
        let board = this.props;
        let mdl = newModel(board.cols,board.rows);
        mdl.moveCount = this.props.model.moveCount;
        this.setModelState(mdl);
    }

    getPickables() {
        let avail = Object.create(defaultAvail);
        let mdl = this.props.model;
        this.props.selectedCells.forEach( function (id) {
            let ps = mdl[id];
            vals.forEach(function(i) {
                if (!avail[i] && ps[i]) avail[i] = true;
            });
        });
        return avail;
    }

    completionPoints(mdl?) {
        mdl = mdl || this.props.model;
        let board = this.props
        return completionPoints(mdl,board);
    }

    percentCompleted(mdl?) {
        mdl = mdl || this.props.model;
        let {points, total} = this.completionPoints(mdl);
        return Math.round((points/total) * 100);
    }

    toggleCellSelect(cell) {
        let mode = this.props.mode;
        if (mode === 'view') return;
        let selectedCells = this.props.selectedCells.slice(0);
        let pickers = [...this.props.pickers];
        let id = cell.props.cid;
        let i = selectedCells.indexOf(id);
        if (this.props.size === 21) {
            let col = id.charCodeAt(0) - 65;
            let row = parseInt( id.slice(1) ) - 1;
            let ppos = this.props.pickerPanelPos;
            if (ppos === 'top') { if (row > 11) this.setPickerPanelPos('bottom'); }
            else if (ppos === 'bottom') { if (row < 9) this.setPickerPanelPos('top'); }
            else if (ppos === 'left') { if (col > 11) this.setPickerPanelPos('right'); }
            else if (col < 9) { this.setPickerPanelPos('left'); }
        }

        if ( i >= 0 ) { 
            selectedCells.splice(i,1)
            let avail = this.getPickables();
            vals.forEach( function (i) {
                if (pickers[i] && !avail[i]) {
                    pickers[i] = false;
                }
            });
        } else { 
            let ps = this.props.model[id];
            if (typeof ps === 'object') {
                selectedCells.push(id); 
            }
        }
        ReactDOM.findDOMNode<HTMLInputElement>(cell).focus();
        this.postState({focusCell: cell, selectedCells, pickers});
    
    }

    handleKeyPress(cell,e) {
        let it = e.which - 48;
        this.setCellValue(cell.props.cid,it);
    }

    selectThisOne(it) {
        if (this.props.selectedCells.length !== 1) return;
        let pkrs = this.props.pickers;
        if (pkrs[it]) return;
        this.setCellValue(this.props.selectedCells[0],it);
    }

    setCellValue(cid,it) {
        if (this.props.mode === 'view') return;
        let selectedCells = this.props.selectedCells;
        let newmdl = createModel(this.props.model);
        let i = selectedCells.indexOf(cid);
        if ( it > 0 && it < 10 ) {
            let ps = newmdl[cid];
            if (typeof ps === 'object' && ps[it]) {
                if ( i >= 0 ) selectedCells.splice(i,1);
                newmdl[cid] = it;
                if (this.props.autoEliminate) {
                    let newmdl2 = this.eliminate(cid, newmdl);
                    if (newmdl2) {
                        newmdl.comment = this.props.moveComment;  // this is completely wrong ... evil in fact
                        this.setModelState(newmdl2, 'Elimination');
                    } else this.setModelState(newmdl);
                } else this.setModelState(newmdl);
            }
        }
    }

    eliminate(cid, prnt?) {
        let newmdl = createModel(prnt || this.props.model);
        let autoPromote = this.props.autoPromote;
        let it = newmdl[cid];
        if ( typeof it === 'object') return;
        let regs = this.props.allRegions;
        let fnd = false;
        regs.forEach( function(reg) {
            let j = reg.indexOf(cid);
            if (j >= 0) {
                reg.forEach( function (c) {
                    if (c !== cid) {
                        let ps = newmdl[c];
                        if ( typeof ps === 'object' && ps[it]) {
                            let newps = Object.create(null);
                            let mps = -1;
                            vals.forEach( function(i) {
                                if (ps[i]) {
                                    if (i !== it) {
                                        mps = mps < 0 ? i : 0;
                                        newps[i] = true;
                                    } else {
                                        newps[i] = false;
                                        fnd = true;
                                    }
                                } else newps[i] = false;
                            });
                            newmdl[c] = (mps > 0 && autoPromote) ? mps : newps;
                        }

                    }
                });
            }    
        });
        return fnd ? newmdl : undefined;
    }

    togglePicker(i) {
        let pkrs = this.props.pickers;
        pkrs[i] = !pkrs[i];
        this.postState({pickers: pkrs});

    }

    toggleAllPickers() {
        let pkrs = this.props.pickers;
        for (let i = 1; i < 10; ++i) { pkrs[i] = !pkrs[i]; };
        this.postState({pickers: pkrs});
    }

    toggleAutoPromote() {
        if (this.props.autoPromote) this.postState({autoPromote: false});
        else {
            let newmdl = createModel(this.props.model);
            let board = this.props
            board.cols.forEach( function(c) {
                board.rows.forEach( function(r) {
                    let id = c+r;
                    if (isCellActive(id)) { 
                        let ps = newmdl[id];
                        if (typeof ps === 'object') {
                            let it = undefined;
                            if (vals.every( function (i) { 
                                                if (!it) {
                                                    if (ps[i]) it = i;
                                                    return true;
                                                } else return !ps[i];
                                            })) newmdl[id] = it;
                        }
                    }
                }, this);
            }, this);
            this.postState({autoPromote: true, model: newmdl});
        } 
    }

    toggleAutoElim() {
        let aut = !this.props.autoEliminate;
        localStorage.setItem('pseudoq.settings.autoEliminate', aut ? 'true' : 'false'); 
        this.postState({autoEliminate: aut});
    }

/*
    cycleColorTagging() {
        let clr = this.props.colorTag;
        let brd = this.props;
        if (clr === 'Transparent') clr = brd.clrYellow;
        else if (clr === brd.clrYellow) clr = brd.clrBlue ;
        else if (clr === brd.clrBlue) clr = brd.clrPurple;
        else if (clr === brd.clrPurple) clr = 'Transparent';
        else console.log("whoops - unknown color");
        this.postState({colorTag: clr});
    }
*/
    nakedGroup() {
        let newmdl = this.checkNakedGroup();
        if (newmdl) {
            let cmt = this.props.moveComment ? this.props.moveComment + " (Naked Group)" : "Naked Group";
            this.setModelState(newmdl,cmt);
        }
    }

    checkNakedGroup(mdl?) {
        let cs = this.props.selectedCells;
        let autoPromote = this.props.autoPromote;
        let l = cs.length;
        let grp = [];
        let fnd = false;
        mdl = mdl || this.props.model;
        if (l > 0 && l < 5) {
            vals.forEach( function(i) {
                if ( cs.some( function(c) { return mdl[c][i]; }) ) grp.push(i); 
            });
            if (grp.length === l) {
                let newmdl = createModel(mdl);
                let regs = this.props.allRegions;
                regs.forEach( function(reg) {
                    if (cs.every(function(c) { return reg.indexOf(c) >= 0; })) {
                        //console.log("region :" + JSON.stringify(reg));
                        reg.forEach( function (c) {
                            if (cs.indexOf(c) === -1) {
                                let ps = newmdl[c];
                                if ( typeof ps === 'object' && grp.some(function(it) { return ps[it]; }) ) {
                                    let newps = Object.create(null);
                                    let mps = -1;
                                    fnd = true;
                                    vals.forEach( function(i) {
                                        if (ps[i]) {
                                            if (grp.indexOf(i) === -1 ) {
                                                mps = mps < 0 ? i : 0;
                                                newps[i] = true;
                                            }
                                            else newps[i] = false;
                                        } else newps[i] = false;
                                    });
                                    newmdl[c] = (mps > 0 && autoPromote) ? mps : newps;
                                }
                            }
                        });
                    }    
                });
                if (fnd) return newmdl;
            }
        }
        return undefined;
    }

    applySelections () {
        if (this.props.selectedCells.length === 0) {
            if (this.props.focusCell) {
                let newmdl = this.eliminate(this.props.focusCell.props.cid);
                if (newmdl) {
                    this.props.model.comment = this.props.moveComment
                    this.setModelState(newmdl, 'Elimination');
                }
            }
        }
        else {
            let pkrs = this.props.pickers;
            if (pkrs.every( function(pkr) { return !pkr; })) this.nakedGroup(); 
            else this.applySels(pkrs);
        }
    }

    applySels(pkrs) {
        let fnd = false;
        let mdl = this.props.model;
        let autoPromote = this.props.autoPromote;
        let newmdl = createModel(mdl);
        this.props.selectedCells.forEach( function(cid) {
            let ps = newmdl[cid];
            let mps = -1;
            let newps = Object.create(null);
            vals.forEach( function(i) {
                if (pkrs[i] && ps[i]) {
                    fnd = true;
                    newps[i] = false;
                } else {
                    newps[i] = ps[i];
                    if (ps[i]) mps = mps < 0 ? i : 0;
                };
            });
            newmdl[cid] = (mps > 0 && autoPromote) ? mps : newps;
        });
        if (fnd) {
            if (this.props.autoEliminate) {
                let newmdl2 = this.checkNakedGroup(newmdl);
                if (newmdl2) {
                    newmdl.comment = this.props.moveComment;
                    this.setModelState(newmdl2, "Naked Group"); 
                }
                else this.setModelState(newmdl);
            }
            else this.setModelState(newmdl);
        }
        else this.setModelState(mdl); 
    }

    undo() {
        let mdl = this.props.model;
        let prvmdl = Object.getPrototypeOf(mdl);
        if (prvmdl) {
            prvmdl.moveCount = mdl.moveCount + 1;
            this.setModelState(prvmdl);
        }
    }

    play() {
        this.postState({mode: 'play'});
    }
    
    review() {
        let mdl = this.props.model;
        let mvs = constructMoves(mdl, true);
        let cmt = mvs.length === 0 ? '' : mvs[0].move.comment;
        let cnt = mdl.moveCount;
        this.reviewGoto(0, mvs, {mode: 'review', moveIndex: 0, moveComment: cmt, savedMoveCount: cnt, savedModel: mdl});
        //this.reviewFirst();
    }

    reviewSolution(a) {
        let board = reviewSolution(a,this.props)
        this.reviewGoto(0, board.move, {...board, mode: 'reviewSolution'});
    }

    reviewGoto(i,mvs?,st?) {
        //console.log('goto : '+i);
        let newst = reviewGoto(this.props,i,mvs,st);
        this.postState(newst);
    }

    reviewLoad() {
        let a = this.props.moves;
        a[this.props.moveIndex].move.comment = this.props.moveComment;
        let cnt = this.props.savedMoveCount;
        a.length = this.props.moveIndex + 1;
        let moves = a.map( function(mv) { return mv.move; } );
        moves.splice(moves.length - 1,1);
        let mdl = a[0].model;
        mdl = applyMovesToModel(mdl, moves);
        mdl.moveCount += cnt;
        this.setModelState(mdl, null, {mode: 'play', savedModel: undefined, savedMoveCount: 0 });
    }

    reviewReturn() {
        let mdl = this.props.savedModel;
        if (mdl) {
            mdl.comment = '';
            //mdl.moveCount += 2;
            this.setModelState(mdl, null, {mode: 'play', savedModel: undefined, savedMoveCount: 0});
        }
    }

    reviewFirst() {
        this.reviewGoto(0);
    }

    reviewNext() {
        this.reviewGoto(this.props.moveIndex + 1);
    }

    reviewPrev() {
        this.reviewGoto(this.props.moveIndex - 1);
    }

    reviewLast() {
        this.reviewGoto(this.props.moves.length - 1);
    }

    autoSubmit(mdl?) {
        mdl = mdl || this.props.model;
        this._submit(constructMoves(mdl, true));
    }

    reviewSubmit() {
        this._submit(this.props.moves);
    }

    tick() {
        if (this.props._isMounted && !this.props.completed) this.postState({reSubmit: true});
    }

    _submit(a) {
        let board = this.props;
        let {dayName, pos, timeOut, mode, pubID} = board;

        let xhr = new XMLHttpRequest();   
        if (timeOut) xhr.open("POST", "/challenges");
        else xhr.open("POST", "/solutions");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        let rslt: any = timeOut? {timeOut: timeOut} : {puzzle: pubID};
        rslt.lastPlay = new Date();
        if (a && a.length > 0) {
            let mvs = a.map( function(mv) { return mv.move; } );
            rslt.moves = mvs;
            let mv = a[mvs.length - 1];
            rslt.moveCount = mv.moveCount;
            let {points, total} = this.completionPoints(mv.model);
            rslt.completed = (points === total);
            rslt.percentCompleted = Math.round(100 * points / total);
            if (timeOut) rslt.points = points;
        } else {
            rslt.moves = [];
            rslt.moveCount = 0;
            rslt.percentCompleted = 0;
            //rslt.secondsElapsed = 0;
            rslt.completed = false;
        }

        let txt = JSON.stringify(rslt);

        xhr.onload = () => this.receiveSolutions(xhr);
        xhr.send(txt);
        this.postState({reSubmit: false});
    }

    requestSolutions() {
        let xhr = new XMLHttpRequest();   
        let {timeOut} = this.props;
        if (timeOut) xhr.open("GET", "/challenges/"+timeOut);
        else xhr.open("GET", "/solutions/"+this.props.pubID);
        //let that = this;
        //xhr.onload = () => { that.receiveSolutions(xhr) };
        xhr.onload = () => this.receiveSolutions(xhr);
        xhr.send();
    }

    receiveSolutions(xhr) {
        if(xhr.status !== 200) { 
            let msg = 'failed : ' + xhr.status + " - " + xhr.responseText;
            console.log(msg);
        } else {
            let rsp = JSON.parse(xhr.responseText);
            if (rsp.ok) {

                let {timeOut} = this.props;
                if (timeOut) {
                    let rslts = rsp.results ;
                    this.postState({solutions: rslts});  // lazy kludge?
                } else {
                    let solns = rsp.solutions.sort(solutionSorter);
                    //console.log("solutions received : "+solns.length);
                    //solns.forEach(function (s) {console.log(s.lastPlay);});
                    //localStorage.setItem('pseudoq.solutions.' + dayName + '.' + pos, JSON.stringify(solns));
                    this.postState({solutions: solns});
                }
            } else {
                console.log(rsp.msg);
            }
        }
    }

    reviewShow() {
        let a = this.props.moves;
        let mvs = [];
        a.forEach( function(mv) { 
            let o = Object.create(null);
            let mov = mv.move;
            if (!mov.dummy) {
                Object.keys(mov).forEach(function (k) {
                    if (k !== 'moveCount' && k !== 'comment') o[k] = mov[k];  
                });
                if (mov.comment) o.comment = mov.comment;
                mvs.push(o);
            } 
        });
        let rslt = {user: 'anonymousCoward', puzzle: this.props.puzzleId, moves: mvs }
        let txt = JSON.stringify(rslt);
        let w = window.open("data:text/json," + encodeURIComponent(txt), "_blank"); //, "width=200,height=100");
        w.focus();
    }

    checkForErrors(mdl?) {

        let board = this.props; 
        let soln = board.solution;
        mdl = mdl || this.props.model;

        return board.cols.some( function(c) {
            return board.rows.some( function(r) {
                let id = c+r;
                let rslt = false;
                if (Object.prototype.hasOwnProperty.call(soln,id)) {
                    let sn = soln[id];
                    let ps = mdl[id];
                    rslt = (typeof ps === 'object') ? !ps[sn] : ps !== sn;
                }
                return rslt;
            });
        });
    }

    payForCheck() {
        let mdl = this.props.model;
        let nmvs = mdl.moveCount + 10;
        mdl.moveCount = nmvs;
        this.setModelState(mdl);
    }

    fixErrors() {
        let mdl = this.props.model;
        let nmvs = mdl.moveCount;
        if (this.checkForErrors()) {
            while (true) {
                mdl = Object.getPrototypeOf(mdl)
                if (!this.checkForErrors(mdl)) break;
            }
        }
        mdl.moveCount = nmvs + 10;
        this.setModelState(mdl);
    }

    setLocalStorage(mvs) {
        let {dayName, pos, mode} = this.props;
        if (mode !== 'play') return;
        let pzl = dayName + "/" + pos;
        localStorage.setItem('pseudoq.local.' + pzl, mvs);
    }

    changeLayout() {
        let lno = this.props.layoutNo + 1;
        if (lno === 5) lno = 1;
        localStorage.setItem('pseudoq.settings.layoutNo', lno.toString()); 
        this.postState({layoutNo: lno});
    }

    setUnitSize(unitsz) {
        let sz = this.props.cols.length;
        localStorage.setItem('pseudoq.settings.' + sz, unitsz.toString()); 
        this.postState({unitsize: unitsz});
    }

    enlarge() {
        let unitsize = getUnitSize(this.props);
        this.setUnitSize(unitsize + 9);
    }

    shrink() {
        let unitsize = getUnitSize(this.props);
        this.setUnitSize(unitsize - 9);
    }

    componentWillMount() {  
        console.log('ComponentWillMount Board');
        let {dispatch, dayName, pos} = this.props;
        dispatch( {type: LOAD, dayName, pos, props: {...this.props, _isMounted: true} });
    }

    componentDidMount() {

        let {mode,completed,random} = this.props;
        if (mode === 'play') {
            this.requestSolutions();
            if (!completed ) {
                if (random) this.postState({timer: oxiDate.pauseableTimer() });
                else this.setState({...this.state, reSubmitTimer: window.setInterval(this.tick, 60000)});   // only submit a max of once a minute, upon next move.
            }
        }
    }

    componentWillUnmount(){
        //console.log("PseudoqBoard will unmount");
        window.clearInterval(this.state.reSubmitTimer);
    }

    getSecondsElapsed () {
        let timer = this.props.timer;
        return timer ? Math.round(timer.elapsed() / 1000) : 0;
     }

    timedOut () {
        //console.log("timed out");
        if (!this.checkForErrors()) this.autoSubmit();
        this.postState({completed: true});
    }

    reload () {
        document.location.reload(true);
    }

    setPickerPanelPos(pos) {
        this.postState({pickerPanelPos: pos});
    }

    render() {
        //console.log("rendering board"); 
        const that = this;
        let board = {...this.props};
        let {dayName, pos, mode, model, pickers, selectedCells, layoutNo, pickerPanelPos} = board;
        if (!model || mode === 'hide') return null;

        let sz = board.cols.length;
        let unitsize = getUnitSize(board);
        board.unitsize = unitsize;
        let completed = !mode.startsWith('review') && isCompleted(model, board);

        board.cellSize = unitsize * (21 / 36);
        board.possSize = board.cellSize / 3;
        board.cellLeft = (board.cellSize / 6);
        board.cellTop = board.cellLeft + (unitsize / 25);
        board.cellFontSize = Math.floor( unitsize * 3 ).toString() + "%";

        let pss = Math.floor( board.possSize * 6 );
        if (pss < 43) pss = 43;
        board.possFontSize = pss.toString() + '%';


        let cvsurl = renderBoard(board, unitsize, completed ? 'completed' : mode);
        let dim = (sz * unitsize) + 1; 


        let divStyle = {
          color: board.clrBackGround,
          width: dim,
          height: dim,
          background: 'url(' + cvsurl + ')',
          backgroundRepeat: "no-repeat",
        };

        let mnuStyle = {
            width: 130, 
            height: dim + 30,
            display: 'inline-block',
            verticalAlign: 'top',
            padding: 6,
        };

        let btnStyle = {
            width: '100%',
            margin: 2,
        };

        let game = board.gameType;

        let cells = [];
        let soln = board.solution;
        board.rows.forEach( r => {
            board.cols.forEach( c => {
                let id = c+r;
                let issel = selectedCells && selectedCells.indexOf(id) >= 0;
                cells.push(
                    <Cell key={id} cid={id}  
                          active={isCellActive(id)} 
                          mode={mode}
                          board={board} 
                          issel={issel} 
                          solution={soln[id]}
                          completed={completed}
                          handleClick={this.toggleCellSelect} 
                          setCellValue={this.setCellValue}  />
                )
            }); 
        });

        let pkrpanels = [];
        let lhcol = null;
        let hpnl = null
        let ppos = pickerPanelPos;

        let th1 =  <h2>{ mode.indexOf('review') < 0 ? "Play" : "Review"}</h2>;

        let h1txt = '"There are 10 types of people in this world - those who understand binary, and I forget what the other nine are."  --anon';

        let h1 = ( <Flex row style={{justifyContent: 'space-between', width: '100%'}}>
                    <span>{ th1 }</span>
                    <span>{ h1txt }</span>
                 </Flex> );

        let h2 = (
          <Flex row style={ {flex: 'none', justifyContent: 'space-between', height: 30, width: dim, paddingTop: 10} }>
            <span style={ {paddingLeft: 10} } >{ game }</span>
            <span style={ {paddingRight: 10} } >Rating : {board.rating}</span>
          </Flex>
        );


        let btns = []
        if (mode === 'view') {
            let rt = "/" + dayName + "/" + pos;
            btns.push( <LinkContainer key='play' to={rt} ><Button  style={btnStyle} >Play</Button></LinkContainer> );
            let ftr = null;
            let solutions = this.props.solutions || [];
            let l = solutions.length;
            if (l > 0) {
                //console.log("solutions : "+l);
                ftr = <div>Solutions: { l }</div>
            }
            return (
                <div> 
                  {h2}
                  <div style={{height: dim + 20}}>
                      <div style={ {display: 'inline-block', width: dim} }>
                        <div className="brd" style={divStyle} >
                          {cells}
                        </div>  
                      </div>
                      <ButtonGroup vertical style={mnuStyle}>
                          {btns}
                      </ButtonGroup>
                  </div>
                  {ftr}
                  {this.props.children}
                </div>
            );
        } 

        let avail = this.getPickables();
        let glyphSpanStyle = {fontFamily: 'entypo', fontSize: '200%', lineHeight: 0} ;
        let tglPt = '\uD83D\uDD04';
        let goPt = '\u25B6';
        let tglSpan = <span style={ glyphSpanStyle} >{tglPt}</span>;
        let goSpan = <span style={ glyphSpanStyle } >{goPt}</span>;
        let mvCount = model.moveCount;
        let tmr = null;

        let {points, total} = this.completionPoints();
        //console.log("points: "+points);
        let pccomp = Math.round((points/total) * 100);


        if (mode === 'play') {
            if (this.props.timeOut) {
                if (completed && this.checkForErrors()) points = 0;
                btns.push( <Button key='tryagain' bsSize='small' onClick={this.props.newGame} block >New Game</Button>);
                btns.push( <Button key='undo' bsSize='small' onClick={this.undo} block >Undo</Button> );
            } else {
                btns.push( <Button key='undo' bsSize='small' onClick={this.undo} block >Undo</Button> );
                if (!completed) {
                    btns.push( <CheckModal key='check' opened={this.payForCheck} check={this.checkForErrors} fix={this.fixErrors} /> );
                }
                btns.push( <RestartModal key='restart' restart={this.restart} /> );
                btns.push( <Button key='review' bsSize='small' onClick={this.review} block >Review</Button> );
                if (this.props.random) {
                    tmr = <Flex row style={{ height: 30}}>Time: <Timer timer={this.props.timer } elapsed={0} /></Flex>
                }
            }
            btns.push( <Button key='enlarge' bsSize='small' onClick={ this.enlarge } block >Enlarge</Button> );
            btns.push( <Button key='shrink' bsSize='small' onClick={ this.shrink } block >Shrink</Button> );
            if (game === 'Killer' || game === 'Ninja') btns.push( <Button key='layout' bsSize='small' onClick={ this.changeLayout } block >Layout</Button> );

        } else if (mode.indexOf('review') >= 0) {
            btns.push( <Button key='first' bsSize='small' onClick={this.reviewFirst} block >First</Button> );
            btns.push( <Button key='next' bsSize='small' onClick={this.reviewNext} block >Next</Button> );
            btns.push( <Button key='prev' bsSize='small' onClick={this.reviewPrev} block >Prev</Button> );
            btns.push( <Button key='last' bsSize='small' onClick={this.reviewLast} block >Last</Button> );
            if (process.env["NODE_ENV"] !== "production") btns.push( <Button key='show' bsSize='small' onClick={this.reviewShow} block >Show All</Button> );
            if (mode === 'review') {
                btns.push( <Button key='submit' bsSize='small' onClick={this.reviewSubmit} block >Upload</Button> );
            }
            btns.push( <Button key='reviewplay' bsSize='small' onClick={this.reviewLoad} block >Load</Button> );
            btns.push( <Button key='reviewReturn' bsSize='small' onClick={this.reviewReturn} block >Return</Button> );
        }

        let prog =  (mode === 'play' && this.props.timeOut) ? (
            <Progress key='progress' width={mnuStyle.width} height={200} timer={this.props.timer} 
                                timeOut={this.props.timeOut} onTimeout={this.timedOut} score={points}/> 
            ) : (
                <Flex row style={ {borderStyle: 'solid', borderWidth: 1 } } onClick={this.applySelections} >
                  <Flex column style={{alignItems: 'center'}} >
                      <Flex row style={ {height: 21 } }># Moves</Flex>
                      <Flex row>
                          <Flex column style={ {alignSelf: 'middle', height: 50, width: '100%', fontSize: 30 } }>{mvCount}</Flex>
                      </Flex>
                    </Flex>
                </Flex>     
            );

        let toppad = 32 + unitsize / 2;
        let lthelp = (board.lessThans || board.equalTos) ? ( <p>A '&lt;', '&gt;', or, '=' between two cages means the sum of the values in the cages must obey the indicated relationship.</p> )
                                                         : null;
        let helptext = (
            <div>
              <h3>Rules</h3>
              <p>Normal Sudoku rules apply.  Numbers inside cages must be unique, and add up to the total displayed.</p>
              { lthelp }
              <h3>Play</h3>
              <p>Click on the board cells you wish to affect. Selected cells will display with a green background.
              </p>

              <p>Click on the numbered buttons to select the possibilities you wish to eliminate (from the selected cells). Selected numbers will have a red background.  (Pressing the {tglSpan} button will toggle all number selections.)
              </p>

              <p>Press the {goSpan} button to have the selected numbers (highlighted in red) eliminated as possibilities from the selected cells (highlighted in green). (Selections will then be reset.)
              </p>

              <h4>Direct Selection</h4>

              <p>Typing a number (1 to 9) will directly select that number for the currently focused cell (unless the number has already been eliminated from that cell).<br/>          
                 Right clicking on a a green numbered button when exactly one cell is selected, will directly select that number for the selected cell.<br/>  
                 Right clicking on a possibility will also directly select that number for the containing cell.  
              </p>

              <h4>Elimination and auto-Elimination</h4>
              
              <p>If no cells have been selected and the focus is on a solved cell, then pressing the {goSpan} button will eliminate
                 the value of the focused cell from all other cells that share a region with that cell. This will count as one move, regardless of the outcome.
              </p>

              <p>If a direct selection is made (see above), and the auto-Eliminate option is active, then the eliminate process will be automatically applied
              </p>

              <p>In addition, a number of <b>special patterns</b> will be automatically detected and acted upon when the {goSpan} button is pressed.<br/>  
                 It is left as an exercise for the attentive reader to figure out the relevant rules.  (Hint: <b>Naked Pairs</b> is the name of one such pattern. ) 
              </p>

              <p>These mechanisms allow only for possibilities to be <b>eliminated</b>.  Use the Undo button to restore previous eliminations.
              </p>

              <h4>Uploaded Solutions</h4>

              <p>Partial solutions can be uploaded at any time using the 'Upload', so long as you have signed in. If you sign in on a different machine, 
              you should see the game in progress as it was uploaded.  Partial solutions are automatically uploaded on completion of a move,
              but only if more than a minute has elapsed since last uploaded.
              </p>
              <p>If desired, solutions can also elaborated with comments and uploaded from review mode (by use of the 'Review' button).  
              </p>
              <p>Completed puzzles are automatically uploaded. Such completed submitted solutions can be reviewed by clicking on the solution number in the table displayed.  
              </p>
              <p>Only the top ten submitted solutions (graded by minimum number of Moves) will be displayed.  
              </p>
              <h4>Move Count</h4>
              <p>Whilst the aim of the game is obviously to solve the puzzle, the subplot it to solve it in as few moves as possible.
              </p>
              <p>As such, the intent is to never allow the Move Count to decrease for a given puzzle. The Check button 'costs'
              10 moves, Undo costs 1 move and Restart leaves the move count unchanged.  
              If you find a way to decrease the move count somehow, it is a bug in the program, and a bug report would be much appreciated.
              </p>
            </div>
            );
        let solutionTable = 
              mode.indexOf('review') >= 0 ? null
            : this.props.timeOut ? ( <ChallengesTable board={ this } results={ this.props.solutions } /> )         
            : (<SolutionsTable board={ this } solutions={ this.props.solutions } /> );
        let commentInput = <div />;
        let rowlbls = <div />;
        let collbls = <div />;
        let thght = 30;
        if (mode.indexOf('review') >= 0) {
            thght += 20;
            /*
            let selectedCells = this.props.selectedreviewCells;   
            selectedCells.sort();
            let cellstr = "[" + selectedCells.join(":") + "]";
                <Input type="textarea" label='Marked Cells : ' value={ cellstr }  />


                <p>To assist with the formulation of helpful comments, a mechanism is (will be!) provided to allow regions to be
                lighlighted within the board and the equivalent textual representation to be displayed in the comment text.  Simply
                click on each cell to be included, locate the cursor at the desired point of insertion in the comment text and press
                ctrl-V (or right click and select Paste). 
                </p>
            */
            
            commentInput = (
                <div style={ { width: dim-20} }>
                    <Input type="textarea" ref="comment" label='Commentary for Move' value={ this.props.moveComment } onChange={this.saveComment} />                  
                </div> );

            helptext = (
              <div>
                <h2>Review mode</h2>
                <p>Navigate through the moves with the First, Last, Next and Prev buttons.  Whilst the moves themselves 
                cannot be changed, the comments associated with them can.  The idea is that you can describe the thought process
                that led to the move being made.  
                </p>

                <p>The Submit button allows the entire set of moves to be uploaded and made available to future players of this 
                game.
                </p>

                <p>The Load button return to Play mode with the currently displayed review state loaded. 
                </p>

                <p>The Return button returns to Play mode in the state it was in before the review (abandoning any comments entered). 
                </p>

              </div>
            );

            let rowLabels = [];
            board.rows.forEach( function(r) {
                rowLabels.push( <div key={r} style={ {float: 'left', width: 20, margin: 0, border: 0, padding: 0, height: unitsize } }>{r}</div>);
            });

            let colLabels = [];
            board.cols.forEach( function(c) {
                colLabels.push( <span key={c} style={ {float: 'left', textAlign: 'center', width: unitsize, height: 20 } }>{c}</span>);
            });

            rowlbls = (
                <div style={ {display: 'inline-block', width: 20, height: dim + thght, marginLeft: 5, border: 0, verticalAlign: 'top', paddingTop: toppad, clear: 'both'} }>
                   {rowLabels}
                </div>
            );
            collbls = (
                <div style={ {height: 20, width: dim, margin: 0, border: 0, padding: 0, clear: 'both'} }>
                    {colLabels}
                </div>
            );
        }

        let rhMnuStyle = mnuStyle
        if (mode.indexOf('review') >= 0) {
            let th = mnuStyle.height += 20;
            rhMnuStyle = {...mnuStyle, height: th};
            let th2 = ( <div style={{height: thght}} >{ h2 }{ collbls }</div> );
            h2 = th2;
        }
        
        if (board.size === 21) {
            //console.log("picker panel :" + ppos);
            pkrpanels.push( ppos === 'top' ? (
                <div key='top' style={{ position: 'absolute', top: unitsize, left: (9*unitsize)+2, width: (3*unitsize) - 1, height: (5*unitsize) - 1 }}>
                    <ColwisePickerPanel parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                </div> ) 
            : (
                <div key='topblank' onClick={ function () {that.setPickerPanelPos('top');} } style={{ position: 'absolute', top: 0, left: (9*unitsize)+1, width: (3*unitsize) - 1, height: (6*unitsize) - 1 }} />
            ));
            pkrpanels.push( ppos === 'left' ? (
                <div key='left' style={{ position: 'absolute', left: unitsize, top: (9*unitsize), width: (5*unitsize) - 1, height: (3*unitsize) - 2 }}>
                    <RowwisePickerPanel parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                </div> )
            : (
                <div key='leftblank' onClick={ function () {that.setPickerPanelPos('left');} } style={{ position: 'absolute', left: 0, top: (9*unitsize)+1, height: (3*unitsize) - 1, width: (6*unitsize) - 1 }} />
            ));
            pkrpanels.push( ppos === 'bottom' ? (
                <div key='bottom' style={{ position: 'absolute', top: (unitsize * 15), left: (9*unitsize)+2, width: (3*unitsize) - 1, height: (5*unitsize) - 1 }}>
                    <ColwisePickerPanel parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                </div> )
            : (
                <div key='bottomblank' onClick={ function () {that.setPickerPanelPos('bottom');} } style={{ position: 'absolute', top: (unitsize * 15), left: (9*unitsize)+1, width: (3*unitsize) - 1, height: (6*unitsize) - 1 }} />
            ));
            pkrpanels.push( ppos === 'right' ? (
                <div key='right' style={{ position: 'absolute', left: (unitsize * 15), top: (9*unitsize), width: (5*unitsize) - 1, height: (3*unitsize) - 2 }}>
                    <RowwisePickerPanel parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                </div> )
            : (
                <div key='rightblank' onClick={ function () {that.setPickerPanelPos('right');} } style={{ position: 'absolute', left: (unitsize * 15) , top: (9*unitsize)+1, width: (6*unitsize) - 1, height: (3*unitsize) - 1 }} />
            ));
        } else {
            let pnl = layoutNo === 1 ? ( <Flex column style={{alignItems: 'center'}}>
                                                <RowwisePickerPanel key='rowwise' parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                                               </Flex> )
                        :  layoutNo === 2 ? ( <Flex column style={{alignItems: 'center'}}>
                                                 <HorizontalPickerPanel key='horizontal' parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                                               </Flex> )
                        :  layoutNo === 3 ? <div style={{margin: 'auto'}}><ColwisePickerPanel key='colwise' parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} /></div>
                        :  layoutNo === 4 ? <VerticalPickerPanel key='vertical' parent={ this } unitsize={ unitsize } avail={ avail } pickers={pickers} />
                        : null;
            if (layoutNo === 1 || layoutNo === 2 ) hpnl = <div style={{width: dim}}>{ pnl } </div>;
            else if (layoutNo === 4 || layoutNo === 3) {
                let w = layoutNo === 4 ? 45 : (unitsize - 1) * 3
                lhcol = (
                    <Flex column style={{flex: 'none', height: '100%', width: w}} >
                        <div style={{height: thght}} />
                        { pnl }
                    </Flex>
                    );

            }
        }

        let rhcol = (
                  <div style={rhMnuStyle}>
                   <Flex column style= {{justifyContent: 'space-between', width: '100%', height: '100%' }}>
                     <Flex row >
                      <Flex column style={{justifyContent: 'flex-start', xwidth: '100%' }}>
                        <div style={{height: thght}} />
                        { btns }
                       </Flex>  
                     </Flex>
                     <Flex row auto >
                       <Flex column style={{justifyContent: 'flex-end'}} >
                        <Flex row style={{ height: 40}} >
                            <Input type="checkbox" checked={this.props.autoEliminate} onChange={this.toggleAutoElim} label="AutoEliminate"/>
                        </Flex>
                        <Flex row style={{ height: 30}}>Completed: {pccomp}%</Flex>
                        { tmr }
                        { prog }
                       </Flex>                 
                      </Flex>
                   </Flex>
                  </div>
            );

                        /*
                        <Flex row style={{ height: 40, backgroundColor: this.props.colorTag}} >
                            <Input type="checkbox" style={{backgroundColor: this.props.colorTag}} checked={this.props.colorTag !== "Transparent"} onChange={this.cycleColorTagging} label="Tagging"/>
                        </Flex>
                        */
        let midcol = (
              <div>
                {h2}
                <Flex row style={{width: dim, position: 'relative'}}>
                    <div className="brd" style={divStyle} >
                      {cells}
                    </div>
                    { pkrpanels }
                </Flex>
              </div>
            );

        return (
            <div>  
              {h1}
              <Flex row style={{justifyContent: 'flex-start', height: dim + thght}} >
                    { lhcol }
                    { rowlbls }
                    { midcol }
                    { rhcol }
              </Flex>
              { hpnl }
              { commentInput }
              <p/>
              { solutionTable }
              { helptext }
              { this.props.children }

            </div>
        );
    }

};



