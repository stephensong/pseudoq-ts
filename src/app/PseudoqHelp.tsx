"use strict";

import * as React from 'react';
import {PseudoqBoard} from './PseudoqBoard';

interface HelpProps {dispatch: (action: any) => void, mode?: string, board?: any}; 
export default class Help extends React.Component<HelpProps, {}> {

    render() {
        let board = ( <PseudoqBoard { ...this.props.board } dayName='tutorial' pos={ 0 } dispatch={ this.props.dispatch } mode='reviewSolution' initMoves={ this.props.board.moves } /> );

        return (
          <div>
            <h2>Solving Strategies</h2>
            <p>If you have played normal sudoku, then all the existing strategies you have learned about, both simple and advanced (X-wing, Y-wing, Multi-valued chains etc. etc.) apply
            equally to Killer sudoku. However, they generally turn out to be not that useful, as killer sudokus are predominantly solved using simple arithmetic techniques.  This 
            makes killer sudoku both more enjoyable to play, and more beneficial in developing and maintaining mental dexterity and numeric competence than vanilla Sudoku.  Some of the more common
            techniques specific to solving killer sudoku are described below.
            </p>

            <h4>Rule of 45</h4>
            <p>The most important solving strategy. The sum of the digits 1 to 9 is 45.  Therefore, given the rules of normal sudoku, the sum of each row, column and box (i.e. internal 3x3 square) is 45. 
            </p>
            <p>
            For brevity,
            we will henceforth refer to said rows, columns and boxes as 'primary regions', or 'primaries'.  Also, we will refer to the caged regions which (usually) have a total associated
            with them simply as 'cages', and the unit squares that they are comprised of as 'cells'.
            </p>
            <p>If we can find a combination of cages that are all fully contained within a primary row, column or box, then we can deduce that the sum of the cells that are 
            in the primary but not in any of said cages is 45 less the sum of the cages.
            </p>
            <p>Similarly, we can sometimes find a combination of cages which completely contains the primary, with only a small number of cells 'left over'.  The sum of these excess cells will then
            be (the sum of the cages) - 45.
            </p>
            <p>By extension, we can use the same approach, but with a combination of adjacent primaries.  We might find a combination of cages which completely 'tiles' two
            (or more) primaries with only a small number of cells left unconvered or in excess.  We can then sum the cage totals, and take a difference against 90 (for two primaries, 
                135 for three, or even 180 for four), to find the total of the outlier cells.
            </p>
            <h4>Maximum and minimum cage totals</h4>
            <p>If we see a cage consisting of two cells with a total of 3, we know that each cell is either 1 or 2.  Similarly, if the total was 17, we know that each cell is either 8 or 9.
            Similarly, a three-cell cage has a minimum total of 6 (1 + 2 + 3) and maximum total of 24 (7 + 8 + 9).  For four-cell cages, the minimum is 10 and the maximum 30.
            </p>
            <p>A two-cell cage of total 4 must contain 1 and 3.  A two-cell cage of total 16 must be 7 and 9. 
            </p>
            <p>If we see a three-cell cage of total 8, we know that the possibilities are either (1, 2, 5) or (1, 3, 4).  Ergo, we know that the cage must contain a 1, and therefore for
            any primaries containing the cage we can exclude 1 from the remaining cells.  Likewise a three-cell cage totalling 22 must contain a 9, a four-cell cage with a total of 12 must contain
            both a 1 and a 2, and so on.
            </p>
            <h4>Naked groups</h4>
            <p>Now say we are given a two-cell cage with total 3.  Therefore, each cell is either 1 or 2.  But this also means that for any primaries containing this cage, the remainder 
            of the cells in the primary do NOT contain 1 or 2.  
            </p>
            <p>
            Whenever we have a cage with n-cells for which we know there to be only n-values (albeit that we may not yet know exactly which cell
            contains which value), we can deduce that for any primaries completely containing the cage, the possible values inside the cage can be excluded from the remaining cells of that
            primary.
            </p>
            <p>In some circumstances, the player software automatically detects naked groups (pairs, triples, or quads), and performs the above exclusions automatically (unless auto-elimination has
                been turned off).
            </p>
            <h4>Circular groups (needs a better name!)</h4>
            <p>Say we have a three-cell cage of total 16, and one cell in the cage has the possiblities 3 and 4, and another cell has the possibilities 4 and 9.  Together the two cells have
            three possibilities (3, 4 and 9) which total exactly to the cage total (16).  Therefore, we can conclude that the possibilites in the third cell must also be limited to
            3, 4 and 9, and any other possibilities may be excluded.  This may not be immediately evident, but if you work through the separate possible combinations you will see it soon enough. 
            </p>
            <p>The general rule is that for a cage of n cells, if all but one of the cells together have a set of n possibilities totalling to the cage total, the the last cell is also constrained
            to that same set.
            </p>
            <h4>Value distributions</h4>
            <p>Say we have a two-cell cage of total 8, one cell with possibilities (3, 5 and 7), the other with (1, 3 and 5).  We know then that the solution will be either 3 and 5, or 1 and 7.  If
            we then find a primary that contains this cage, and another cell with possibilities 3 and 7,  we can conclude that the 3 and the 7 have been 'used up' within this primary and can be 
            excluded from the remaining cells thereof.  If the single cell is 3, then the cage is 1 and 7.  If the single cell is 7, then cage is 3 and 5.  Either way, both 3 and 7 have
            been used.
            </p>
            <h2>Worked example.</h2>
            <p>The following board demonstrates a solved puzzle in review mode, with enhanced comments attempting to explain the reasoning behind the next move when it is not immediately obvious.
            </p>
            { board }
            <p>
            </p>
            <p>
            </p>
          </div>
        );
    }

};

