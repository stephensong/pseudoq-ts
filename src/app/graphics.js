"use strict";

let cellFromLabel = function(l) {
    var col = l.charCodeAt(0) - 65;
    var row = parseInt( l.slice(1) ) - 1;
    return [col,row];
};

let cellsFromLabel = function(lbl) {
    var a = lbl.split(":");
    return a.map( function (l) { return cellFromLabel(l); });
};

let labelFromCell = function(pr) {
    return String.fromCharCode(65 + pr[0]) + (pr[1] + 1).toString();
};

let labelFromCells = function(prs) {
    let a = prs.map( function (pr) { return labelFromCell(pr); });
    return a.join(":");
};

let transformer = function(brd) {

    let boardSize = brd.size;

    let _rotate = function (pt) {  // 90 deg around centre
        var orig = Math.floor(boardSize / 2);
        var x = pt[0];
        var y = pt[1];
        var radians = (Math.PI / 2);
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var nx = (cos * (x - orig)) - (sin * (y - orig)) + orig;
        var ny = (sin * (x - orig)) + (cos * (y - orig)) + orig;
        return [Math.round(nx), Math.round(ny)];
    };

    let _mirror = function(pt) {
        return [pt[1],pt[0]];
    }

    let _flipVertical = function(pt) {
        return [pt[0],boardSize-1-pt[1]];
    };

    let _flipHorizontal = function(pt) {
        return [boardSize-1-pt[0],pt[1]];
    };

    let transformRegion = function(reg,f) {
        let r = cellsFromLabel(reg);
        let ta = r.map( function (pt) { return f(pt); });
        ta.sort( function (a,b) { 
            if (a[1] < b[1]) return -1; 
            if (a[1] > b[1]) return 1; 
            if (a[0] < b[0]) return -1; 
            if (a[0] > b[0]) return 1; 
            return 0; 
        });
        let r2 = labelFromCells(ta);
        return r2;
    };

    let transformCell = function(lbl,f) {
        let pr = f(cellFromLabel(lbl));
        return labelFromCell(pr);
    };

    let transform = function(f,b) {
        var rslt = {...b};
        rslt.regions = Object.create(null);
        let tr = function (r) { return transformRegion(r,f); }
        let regs = b.regions;
        Object.keys(regs).map( r => { 
            let k = tr(r);
            rslt.regions[k] = regs[r]; 
        });
        rslt.solution = Object.create(null);
        Object.keys(b.solution).map( e => { rslt.solution[transformCell(e,f)] = b.solution[e]; });
        if (b.lessThans) rslt.lessThans = b.lessThans.map(a => { return [tr(a[0]),tr(a[1])] });
        if (b.equalTos) rslt.equalTos = b.equalTos.map(a => { return [tr(a[0]),tr(a[1])] });
        return rslt;
    }

    let mirror = function() {
        return transform(_mirror,brd);
    };

    let rotate = function() {
        return transform(_rotate,brd);
    };

    let flipHorizontal = function() {
        return transform(_flipHorizontal,brd);
    };

    let flipVertical = function() {
        return transform(_flipVertical,brd);
    };

    let that = {};

    that.testTransforms = function() {
        let chk = b2 => {
            let ok = Object.keys(brd.regions).every( r => { return brd.regions[r] === b2.regions[r]; });
            let ok2 = Object.keys(brd.solution).every( r => { return brd.solution[r] === b2.solution[r]});
            if (ok && ok2 ) return true;
            console.log("whoops");
            return false;
        };
        chk(transform(mirror,transform(mirror,brd)));
        chk(transform(flipHorizontal,transform(flipHorizontal,brd)));
        chk(transform(flipVertical,transform(flipVertical,brd)));
        chk(transform(rotate,transform(rotate,transform(rotate,transform(rotate,brd)))));
    };

    that.randomTransform = function() {
        console.log("random transform called");
        //that.testTransforms();
        let j = Math.floor(Math.random() * 4);
        let rslt = (j === 3) ? transform(_mirror,brd)
                 : (j === 2) ? transform(_rotate,brd)
                 : (j === 1) ? transform(_flipHorizontal,brd)
                 : transform(_flipVertical,brd);
        return rslt;
    };

    return that;
};


var _pen = function(spec) {
    var that = {};
    that.color = spec.color || 'black';
    that.width = spec.width || 1;
    that.dashSize = spec.dashSize || 0;
    return that;
};

var _graphics = function(canvas) {
    var that = {};
    var cxt = canvas.getContext('2d');


    that.drawLine = function(pen,p1,p2)  {
        cxt.save();
        cxt.translate(0.5, 0.5);
        if (pen.dashSize > 0) {
            cxt.setLineDash([10,5,5,2,12,4]);
            cxt.lineDashOffset = Math.random() * 5;
        };
        cxt.beginPath();
        cxt.moveTo(p1[0],p1[1]);
        cxt.lineTo(p2[0],p2[1]);
        cxt.strokeStyle = pen.color;
        cxt.stroke();
        cxt.closePath();
        cxt.restore();
    };

    that.drawString = function(str,font,color,pt) {
        cxt.save();
        cxt.font = font;
        cxt.fillStyle =color;
        cxt.fillText(str,pt[0],pt[1]);
        cxt.restore();
    };

    that.drawVerticalString = function(str,font,color,pt) {
        cxt.save();
        cxt.translate(pt[0],pt[1]);
        cxt.rotate(0.5*Math.PI);
        cxt.font = font;
        cxt.fillStyle =color;
        cxt.fillText(str,0,0);
        cxt.restore();
    };

    that.fillRect = function(l,t,w,h,color) {
        cxt.fillStyle = color;
        cxt.fillRect(l,t,w,h);
    };

    that.measureText = function(str,font) {
        cxt.save();
        cxt.font = font;
        var w = cxt.measureText(str).width;
        cxt.restore()
        return w;
    };

    return that;
};


var _drawer = function(board) {
    var that = {};
        
    var unitsize = board.unitsize || 36;
    var totFontHeight = board.totFontHeight || Math.ceil(unitsize / 5) + 1;
    if (totFontHeight < 8) totFontHeight = 8;
    var boardSize  = board.cols.length;
    var backColor = board.clrBackGround || 'White';
    var foreColor = board.clrForeGround || 'Black';
    var lineColor = board.lineColor || 'DarkBlue';
    var regtotFont = board.regtotFont || totFontHeight.toString() + 'px Verdana Bold';


    let smfontpx = 20 + (unitsize - 36); 
    var symFont = board.symFont || smfontpx.toString() + 'px Arial';
    var symFontHeight = board.symFontHeight || (smfontpx * 2 / 3 );
    var bsz = boardSize - 1;

    var showTots = board.showTotals;

    var findCommonBorders = function(r1, r2) { //: list<(int * int) * (int * int)> =
        var rslt = [];
        r1.forEach( function (a1) {
            var x1 = a1[0], y1 = a1[1];
            r2.forEach( function (a2) {
                var x2 = a2[0], y2 = a2[1];
                if (y1 === y2) {
                    if (x2 === x1 + 1 || x1 === x2 + 1) { rslt.push([ [x1,y1],[x2,y2] ]); };
                };
            });
        });

        r1.forEach( function (a1) {
            var x1 = a1[0], y1 = a1[1];
            r2.forEach( function (a2) {
                var x2 = a2[0], y2 = a2[1];
                if (x1 === x2) {
                    if (y2 === y1 + 1 || y1 === y2 + 1) { rslt.push([ [x1,y1],[x2,y2] ]); };
                };
            });
        });

        return rslt;
    };


    that.drawLayout = function ()  {
        var w = unitsize * boardSize;
        var canvas = document.createElement("canvas") ;
        canvas.setAttribute('width', w + 1);
        canvas.setAttribute('height', w + 1);
        var g = _graphics(canvas);
        g.fillRect(0,0,w,w,backColor);

        var w2 = (unitsize / 2) ;
        var pen = _pen({color: 'LightGray', width: 1});
        for (var n = 1; n <= bsz; n++ ) {
            var x = unitsize * n;
            g.drawLine(pen, [1, x], [1 + w, x]);
            g.drawLine(pen, [x, 1], [x, 1 + w]);
        };

        pen = _pen({width: 3});
        var bsz2 = bsz / 3;
        for (var n = 0; n <= bsz2 + 1; n++) {
            var x = unitsize * n * 3;
            g.drawLine(pen, [1, x], [1 + w, x]);
            g.drawLine(pen, [x, 1], [x, 1 + w]);
        };  
         
        if (boardSize === 21) { 
            var left = unitsize * 9;
            g.fillRect(1 + left, 0, (unitsize * 3) - 1, (unitsize * 6), "White");
            g.fillRect(1 + left, (unitsize * 15) + 1, (unitsize * 3) - 1, (unitsize * 6),  'White');

            var top = unitsize * 9;
            g.fillRect(0, top + 1, (unitsize * 6), (unitsize * 3) - 1, "White");
            g.fillRect((unitsize * 15) + 1, top + 1,  (unitsize * 6), (unitsize * 3) -1, 'White');
        }

        for (var r in board.regions) {
            var cs = cellsFromLabel(r);
            var tot = board.regions[r];
            that.drawRegionBorders(g, {cells: cs, total: tot})            
        }

        if (board.lessThans) {
            board.lessThans.forEach( function(a) {
                var r1 = cellsFromLabel(a[0]), r2 = cellsFromLabel(a[1]);
                var x1,x2,x3,y1,y2,y3,a2;
                var brdrs = findCommonBorders(r1,r2);

                if (brdrs.length === 0) { 
                    console.Log( "No common border found for lessthan" );
                } else {
                    a2 = brdrs[0];
                    x1 = a2[0][0];
                    y1 = a2[0][1];
                    x2 = a2[1][0];
                    y2 = a2[1][1];

                    if (x1 === x2) {
                        x3 = ( x1 * unitsize ) + w2;
                        if (y2 > y1) {
                            y3 = ( y2 * unitsize ); 
                            that.drawVerticalLessThanSign(g,x3,y3);
                        } else {
                            y3 = ( y1 * unitsize );
                            that.drawVerticalGreaterThanSign(g,x3,y3);
                        };
                    } else {
                        y3 = ( y1 * unitsize ) + w2;
                        if (x2 > x1) { 
                            x3 = x2 * unitsize; 
                            that.drawLessThanSign(g,x3,y3);
                        } else { 
                            x3 = x1 * unitsize; 
                            that.drawGreaterThanSign(g,x3,y3);
                        };
                    };
                };
            });
        };

        if (board.equalTos) {
            board.equalTos.forEach( function(a) {
                var r1 = cellsFromLabel(a[0]), r2 = cellsFromLabel(a[1]);
                var x1,x2,x3,y1,y2,y3,a2;
                var brdrs = findCommonBorders(r1,r2);

                if (brdrs.length === 0) { 
                    console.Log( "No common border found for equalTo" );
                } else {
                    a2 = brdrs[0];
                    x1 = a2[0][0];
                    y1 = a2[0][1];
                    x2 = a2[1][0];
                    y2 = a2[1][1];

                    if (x1 === x2) {
                        x3 = ( x1 * unitsize ) + w2;
                        if (y2 > y1) {
                            y3 = ( y2 * unitsize ) - 6; 
                            that.drawVerticalEqualToSign(g,x3,y3);
                        } else {
                            y3 = ( y1 * unitsize ) - 6;
                            that.drawVerticalEqualToSign(g,x3,y3);
                        };
                    } else {
                        y3 = ( y1 * unitsize ) + w2;
                        if (x2 > x1) { 
                            x3 = ( x2 * unitsize ) - 6; 
                            that.drawEqualToSign(g,x3,y3);
                        } else { 
                            x3 = ( x1 * unitsize ) - 6 
                            that.drawEqualToSign(g,x3,y3)
                        };
                    };
                };
            });
        };

        return canvas;
    };

    var contains = function(r,x,y) {
        var rslt = false;
        var a = r.cells;
        for (var i = 0; i < a.length; i++) {
            if (a[i][0] === x && a[i][1] === y ) {
                rslt = true;
                break;
            };
        };
        return rslt;
    };

    that.drawRegionBorders = function(g, reg) {

        var nb = 2;
        var drawBorders = function(nb, side, drawer) {
            reg.cells.forEach( function (a) {
                var nX = a[0], nY = a[1];
                var drawLine = function(t, l, b, r) {
                    drawer(nX,nY,t,l,b,r);
                };
                
                var north = contains(reg,nX,nY-1);
                var northEast = contains(reg,nX+1,nY-1);
                var east = contains(reg,nX+1,nY);
                var southEast = contains(reg,nX+1,nY+1);
                var south = contains(reg,nX,nY+1);
                var southWest = contains(reg,nX-1,nY+1);
                var west = contains(reg,nX-1,nY);
                var northWest = contains(reg,nX-1,nY-1);


                if (!north) drawLine(nb,nb,nb,nb+side);
                if (west && !(north && northWest)) drawLine(nb,0,nb,nb);
                if (east && !(north && northEast)) drawLine(nb,nb+side,nb,nb+side+nb);
                    
                if (!east) drawLine(nb,nb+side,nb+side,nb+side);
                if (north && !(east && northEast)) drawLine(0,nb+side,nb,nb+side);
                if (south && !(east && southEast)) drawLine(nb+side,nb+side,nb+side+nb,nb+side);
                    
                if (!south) drawLine(nb+side,nb,nb+side,nb+side);
                if (west && !(south && southWest)) drawLine(nb+side,0,nb+side,nb);
                if (east && !(south && southEast)) drawLine(nb+side,nb+side,nb+side,nb+side+nb);
                    
                if (!west) drawLine(nb,nb,nb+side,nb);
                if (north && !(west && northWest)) drawLine(0,nb,nb,nb);
                if (south && !(west && southWest)) drawLine(nb+side,nb,nb+side+nb,nb);
                
            });  
        };

        if (reg.cells.length > 1) {
            var bp = _pen({color: lineColor,dashSize: 10});
            var side =  unitsize - (nb * 3); 
            var drawLine = function(nX, nY, t, l, b, r) {
                var top = nY * unitsize + 1;
                var left = nX * unitsize + 1;
                g.drawLine(bp,[l + left, t + top],[r + left, b + top]);    
            };
            
            drawBorders(nb,side,drawLine);

            if (showTots && reg.total > 0) {
                var nX = reg.cells[0][0];
                var nY = reg.cells[0][1];
                reg.cells.forEach (function (a) {
                    if (a[1] < nY) nY = a[1];
                });            
                reg.cells.forEach (function (a) {
                    if (a[1] === nY && a[0] < nX) nX = a[0];            
                });            
                var top = nY * unitsize + 1;
                var left = nX * unitsize + 4; 
                var s = reg.total.toString();

                var w = g.measureText(s, regtotFont);
                g.fillRect(left - 2,top, w + 6, totFontHeight + 2, backColor);
                g.drawString(s, regtotFont, lineColor, [left,top+totFontHeight - 1]);

            };
            
        };  
    };  


    that.drawEqualToSign = function( g, nX, nY) {
        g.drawString("=",symFont,foreColor,[nX-1,nY+10]);
    };
        
    that.drawVerticalEqualToSign = function( g, nX, nY) {
        g.drawVerticalString("=",symFont,foreColor,[nX-8,nY-1]);
    };
    
    that.drawLessThanSign = function( g, nX, nY) {
        g.drawString("<",symFont,foreColor,[nX-8,nY+10]);
    };

    that.drawVerticalLessThanSign = function( g, nX, nY) {
        g.drawVerticalString("<",symFont,foreColor,[nX-8,nY-8]);
    };
    
    that.drawGreaterThanSign = function( g, nX, nY) {
        g.drawString(">",symFont,foreColor, [nX-8,nY+10]);
    };

    that.drawVerticalGreaterThanSign = function( g, nX, nY) {
        g.drawVerticalString(">",symFont,foreColor, [nX-8,nY-8]);
    };


    return that;


};

module.exports = {Drawer: _drawer, Transformer: transformer};

