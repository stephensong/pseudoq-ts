"use strict";

import '../../css/bootstrap-flatly.css';
import './bootstrap';

import * as React from 'react';
import {Button, Table} from 'react-bootstrap';
import * as oxidate from '../lib/oxidate';
import {TimeSpan} from '../lib/timeSpan';
import * as utils from '../lib/utils';

interface ChallengesProps {board: any, results: any[]}
export default class ChallengesTable extends React.Component<ChallengesProps, {}> {

    render() {
        var rows = []
        var j = 0;
        let board = this.props.board;
        let rslts = this.props.results;

        if (rslts.length === 0) return null;

        rslts.forEach(function (rslt) {
            var mvs = rslt.doc.moves;
            var lp = rslt.lastPlay;
            var dt = new Date(lp);
            var lastplay = oxidate.toFormat(dt, "DDDD, MMMM D @ HH:MI");
            //console.log(lp + " : " + lastplay);

            //var elapsed = '';
            //if (rslt.secondsElapsed) elapsed = timeSpan.FromSeconds(rslt.secondsElapsed).toString();
            //         <td>{ elapsed }</td>
            //      <th>Time Taken</th>

            ++j;
            rows.push( 
                <tr key={ rslt.rsltId } >
                     <td>{ rslt.userName }</td>
                     <td>{ lastplay }</td>
                     <td>{ rslt.points }</td>
                </tr>
            );

        });

        return(
          <div>
            <h2>Leaderboard : </h2>
            <Table striped bordered condensed hover>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>At</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </Table>
          </div>
        );
    }

};

