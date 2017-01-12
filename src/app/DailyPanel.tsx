"use strict";

import * as React from 'react';
import * as oxiDate from '../lib/oxidate';

import {PseudoqBoard} from './PseudoqBoard';
import { Hidato } from './Hidato';

const Daily = React.createClass({displayName: 'Daily',

    render() {
        let {dayName, date, boards, dispatch} = this.props;
        if (dayName !== this.props.params.dayName) console.log("Something farked");
        if (!boards) return null;
        let rslt = [];
        let dt = oxiDate.parse(date, 'yyyyMMdd');
        let cdt = oxiDate.toFormat(dt, "DDDD, MMMM D");

        Object.keys(boards).forEach( cpos => {
            let brd = boards[cpos];
            let pos = parseInt(cpos);
            if (brd) {
                let pzl = dayName + "/" + pos;
                if (brd.gameType === 'Hidato') {
                    rslt.push( <Hidato       key={ pzl+':view' } dayName={ dayName } pos={ pos } dispatch={ dispatch } {...brd} mode='view' /> );
                }
                else {
                    rslt.push( <PseudoqBoard key={ pzl+':view' } dayName={ dayName } pos={ pos } dispatch={ dispatch } {...brd} mode='view'  /> );
                }
            }
        });

        return ( 
          <div>
            <h2>Puzzles for  { cdt } </h2>
            <div>{ rslt }</div>
          </div>
        );

    }    
});

export default Daily;

