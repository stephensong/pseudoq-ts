"use strict";

import '../../css/bootstrap-flatly.css';
import './bootstrap';

import * as React from 'react';
import * as ReactBootStrap from 'react-bootstrap';
import * as oxidate from '../lib/oxidate';
import * as utils from '../lib/utils';

const {Button, Table} = ReactBootStrap;

interface SolutionsTableProps {board: any, solutions: any[] }
export default class SolutionsTable extends React.Component<SolutionsTableProps,{}> {

    render() {
        var rows = []
        var j = 0;
        let board = this.props.board;
        let solns = this.props.solutions || [];

        if (solns.length === 0) return null;

        solns.forEach(function (soln) {
            var mvs = soln.moves;
            var lp = soln.lastPlay;
            var dt = new Date(lp);
            var lastplay = oxidate.toFormat(dt, "DDDD, MMMM D @ HH:MI");
            //console.log(lp + " : " + lastplay);
            var compl = soln.completed ? "yes" : "no";
            if (compl === "no" && soln.percentCompleted) {
              compl = soln.percentCompleted.toString() + "%";
            }
            var cnt = mvs ? mvs[mvs.length-1].moveCount : 0; 
            let reviewSolution = function() {
                board.reviewSolution(mvs);
            }

            ++j;
            rows.push( 
                <tr key={ soln.solnId } >
                     <td><Button onClick={ reviewSolution }>{ j }</Button></td>
                     <td>{ soln.userName }</td>
                     <td>{ lastplay }</td>
                     <td>{ cnt }</td>
                </tr>
            );

        });

        return(
          <div>
            <h2>Leaderboard : </h2>
            <Table striped bordered condensed hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>At</th>
                  <th># Moves</th>
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

