"use strict";

import '../../css/bootstrap-flatly.css';
import '../../css/psq.css';
import './bootstrap';

import * as utils from '../lib/utils';

import {TimeSpan} from '../lib/timeSpan';

import * as grph from './graphics';
import * as React from 'react';
import * as ReactBootStrap from 'react-bootstrap';
import Flex from './flex';

let vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];  // nqr - copied from pseudoqboard

let glyphSpanStyle = {fontFamily: 'entypo', fontSize: '200%', lineHeight: 0} ;
let tglPt = '\uD83D\uDD04';
let goPt = '\u25B6';
let tglSpan = <span style={ glyphSpanStyle} >{tglPt}</span>;
let goSpan = <span style={ glyphSpanStyle } >{goPt}</span>;

function defaultStyle(): any {
    return {  
      display: 'block',  
      float: 'left',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '150%',
      width: '100%',
      height: '100%',
      lineHeight: 1.2,
      padding: 6,
      margin: 'auto',
      borderStyle: 'solid',
      borderWidth: 1
    };
};

interface PickerProps {key: any, clickable?: boolean, handleClick: any, handleRightClick: any, val: number, board: any,
                       width?: number, height?: number, pickable: boolean, lineHeight?: number, picked: boolean };
export class Picker extends React.Component<PickerProps, {}> {

    handleClick() {
        if (!this.props.pickable) return;
        this.props.handleClick(this.props.val)
    }

    handleRightClick(e) {
        this.props.handleRightClick(this.props.val);
        e.preventDefault();
    }
    
    render() {
        let styl = defaultStyle();
        let {board} = this.props;
        if (this.props.width) styl.width = this.props.width;
        if (this.props.height) styl.height = this.props.height;
        styl.color = board.clrForeGround;
        let h = styl.height || board.unitsize;
        styl.fontSize = Math.floor( board.unitsize * 3 ).toString() + "%";

        styl.lineHeight = this.props.lineHeight || 0.3 * (h / 9);
        styl.backgroundColor = !this.props.pickable ? board.clrBackGround : this.props.picked ? board.clrRed : board.clrGreen;
        return (
            <div className='pkr-cell' onClick={this.handleClick}  onContextMenu={this.handleRightClick} style={styl} >
              {this.props.val}
            </div>
        );
    }

};

interface PickerPanelProps {pickers: boolean[], avail: any[], unitsize: number, parent: any };
export class Horizontal extends React.Component<PickerPanelProps, {}> {
    displayName: 'HorizontalPickerPanel'

    render() {
        let {pickers, avail, unitsize, parent} = this.props;
        let board = {...parent.props, unitsize};
        let height = 45;
        let pkrStyle = defaultStyle();
        pkrStyle.height = height;
        pkrStyle.lineHeight = 1.5;
        let pkrnodes = []; 
        pkrnodes.push( <div key={0} className='pkr-cell' style={ pkrStyle } onClick={parent.toggleAllPickers} >{ tglSpan }</div> );
        vals.forEach( function(i) {
            pkrnodes.push( <Picker key={i} val={i} board={board} height={height} picked={avail[i] && pickers[i]} pickable={avail[i]} handleClick={parent.togglePicker} handleRightClick={parent.selectThisOne} /> );
        }, this);
        pkrnodes.push( <div key={10} className='pkr-cell' style={ pkrStyle } onClick={parent.applySelections} >{ goSpan }</div> );

        return (
            <Flex row className='pkr' style= {{ width: '100%', height: height }}>
                {pkrnodes}
            </Flex>
        );
    }
};

export class Vertical extends React.Component<PickerPanelProps, {}> {
    displayName: 'VerticalPickerPanel'

    render() {
        let {pickers, avail, unitsize, parent} = this.props;
        let board = {...parent.props, unitsize};
        let dim = unitsize - 1;
        let width = 45;
        let pkrStyle = defaultStyle();
        pkrStyle.width = width;
        let gStyle = defaultStyle();
        gStyle.width = width;
        gStyle.lineHeight = 1.5;
        let pkrnodes = [];
        pkrnodes.push( <div key={0} className='pkr-cell' style={ gStyle } onClick={parent.toggleAllPickers} >{ tglSpan }</div> );
        vals.forEach( function(i) {
            pkrnodes.push( <Picker key={i} val={i} board={board} width={width} lineHeight={pkrStyle.lineHeight} picked={avail[i] && pickers[i]} pickable={avail[i]} handleClick={parent.togglePicker} handleRightClick={parent.selectThisOne} /> );
        }, this);
        pkrnodes.push( <div key={10} className='pkr-cell' style={ gStyle } onClick={parent.applySelections} >{ goSpan }</div> );

        return (
            <Flex column className='pkr' style= {{width: width, height: dim }}>
                {pkrnodes}
            </Flex>
        );
    }
};

export class Colwise extends React.Component<PickerPanelProps, {}> {
    displayName: 'ColwisePickerPanel'

    render() {
        let {pickers, avail, unitsize, parent} = this.props;
        let board = {...parent.props, unitsize};
        let dim = unitsize - 1;
        let pkrStyle = defaultStyle();
        pkrStyle.height = dim;
        pkrStyle.width = dim * 3;
        pkrStyle.lineHeight = 1.8;
        let f = function(i) {
            return ( <Picker key={i} val={i} board={board} height={dim} width={dim} picked={avail[i] && pickers[i]} pickable={avail[i]} handleClick={parent.togglePicker} handleRightClick={parent.selectThisOne} /> );
        }.bind(this);
        let r1 = [1,2,3].map(f);
        let r2 = [4,5,6].map(f);
        let r3 = [7,8,9].map(f);

        return (
            <div style={{width: (dim * 3), height: (dim * 5), padding: 2}} >
              <Flex column>
                <Flex row className='pkr' style= {{ width: '100%', height: dim }} onClick={parent.toggleAllPickers}>
                    <div key={0} className='pkr-cell' style={ pkrStyle } >{ tglSpan }</div> 
                </Flex>
                <Flex row style= {{ width: '100%', height: dim }}>
                    {r1}
                </Flex>
                <Flex row style= {{ width: '100%', height: dim }}>
                    {r2}
                </Flex>
                <Flex row style= {{ width: '100%', height: dim }}>
                    {r3}
                </Flex>
                <Flex row className='pkr' style= {{ width: '100%', height: dim }} onClick={parent.applySelections} >
                   <div key={10} className='pkr-cell' style={ pkrStyle } >{ goSpan }</div> 
                </Flex>
              </Flex>
            </div> 
        );
    }
};

export class Rowwise extends React.Component<PickerPanelProps, {}> {
    displayName: 'RowwisePickerPanel'

    render() {
        let {pickers, avail, unitsize, parent} = this.props;
        let board = {...parent.props, unitsize};
        let dim = unitsize - 1;
        let pkrStyle = defaultStyle();
        pkrStyle.height = dim;
        pkrStyle.width = dim;
        pkrStyle.borderStyle = 'none';
        pkrStyle.lineHeight = 0.3 * (dim / 9);
        let f = function(i) {
            return ( <Picker key={i} val={i} board={board} height={dim} width={dim} picked={avail[i] && pickers[i]} pickable={avail[i]} handleClick={parent.togglePicker} handleRightClick={parent.selectThisOne} /> );
        }.bind(this);
        let c1 = [1,4,7].map(f);
        let c2 = [2,5,8].map(f);
        let c3 = [3,6,9].map(f);

        return (
            <div style={{width: (dim * 5), height: (dim * 3), padding: 2}} >
              <Flex row>
                <Flex column className='pkr' style= {{ height: (dim * 3), width: dim, justifyContent: 'center', borderStyle: 'solid', borderWidth: 1 }} onClick={parent.toggleAllPickers} >
                    <div key={0} className='pkr-cell' style={ pkrStyle } >{ tglSpan }</div> 
                </Flex>
                <Flex column style= {{ height: '100%', width: dim }}>
                    {c1}
                </Flex>
                <Flex column style= {{ height: '100%', width: dim }}>
                    {c2}
                </Flex>
                <Flex column style= {{ height: '100%', width: dim }}>
                    {c3}
                </Flex>
                <Flex column className='pkr' style= {{ height: (dim * 3), width: dim, justifyContent: 'center', borderStyle: 'solid', borderWidth: 1  }} onClick={parent.applySelections} >
                   <div key={10} className='pkr-cell' style={ pkrStyle }>{ goSpan }</div> 
                </Flex>
              </Flex>
            </div> 
        );
    }
};

