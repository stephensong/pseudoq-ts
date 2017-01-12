import {promisify} from '../lib/promisify';

import * as fs from "fs"

//const readFileAsync = promisify(fs.readFile);

import * as pg from './pgsql';
pg.init();

import * as Koa from "koa";
import * as bodyParser from 'koa-bodyparser';
import * as session from 'koa-session';
import * as Router from 'koa-router';

import * as OxiDate from '../lib/oxidate.js';

import {solutionSorter} from '../lib/utils.js';
import * as uuid from '../lib/uuid.js';
import * as jwt from '../lib/jwt';

import passport from './auth';

const jwt_secret = process.env.JWT_SECRET_KEY;

//import koaws from './ws-koa/middleware.js';
import koastatic from './koa-static';
import clientIP from './clientIP.js';

const app = new Koa();
const router = new Router();

function isMember(grp: string, ctx: Koa.Context): boolean {
    let grps = ctx.user.groups;
    return grps && grps.indexOf(grp+',') >= 0;
}

let strToDate = function (cdt: string): Date {
    return OxiDate.parse(cdt, 'yyyyMMdd');
};

let pzlCache = {};

let getPuzzle = function(j) {
    if (!pzlCache[j]) {
        //console.log("getting puzzle " + j);
        pzlCache[j] = pg.get_puzzle(j);
    }
    return pzlCache[j];
};

let getUser = function (id) {
    return pg.users[id];
};

let getUserCount = function () {
    return pg.users.size;
};

let checkMonikerUsed = function (newName) {
    return Object.keys(pg.users).some( function(id) {
            return pg.users[id].userName === newName; 
    });
};

function readFileAsync(src: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    fs.readFile(src, {'encoding': 'utf8'}, function (err, data) {
      if(err) return reject(err);
      resolve(data);
    });
  });
}


let solnsCache = {};

let getSolutions = function (j) {
    if (!solnsCache[j]) {
        let solns = pg.get_solutions(j)
                    .then( function(a ) { 
                        //console.log(a.length.toString() + " solutions found");
                        a.forEach(o => { o.moves = o.doc.moves; delete o.doc});
                        a.sort(solutionSorter); 
                        if (a.length > 10) a.length = 10;
                        return a;
                    });
        solnsCache[j] = solns;
    }
    return solnsCache[j].then( (a) => {
        let rslt = a.map( function (e) {
            let uid = e.user;  // userId
            if (pg.users[uid]) e.userName = pg.users[uid].userName;
            return e;
        });
        return rslt;
    });
};

/*
let challengeCache = {};

let getChallenges = function (j) {
    if (!challengeCache[j]) {
        let rslts = pg.get_challenges(j)
        challengeCache[j] = rslts;
    }
    return challengeCache[j].then( (a) => {
        let rslt = a.map( function (e) {
            let uid = e.user;  // userId
            if (pg.users[uid]) e.userName = pg.users[uid].userName;
            return e;
        });
        return rslt;
    });
};
*/

let dayCache = {};

let getDay = function (cdt) {
    if (!dayCache[cdt]) {
        dayCache[cdt] = pg.get_day(OxiDate.parse(cdt,'yyyyMMdd'));
    }
    return dayCache[cdt];
};

let daysCache = {};

let getDaily = function(cdt) {
    if (!daysCache[cdt]) {
        daysCache[cdt] = (
            getDay(cdt).then(function (a) {
                let brds = [];
                a.forEach(function(j) {
                    brds.push( getPuzzle(j) );
                });
                return Promise.all(brds);
            })
        );
    } 
    return daysCache[cdt];
};

let getWeekly = function(cdt) {
    let ndays = 7;
    let wk = {};
    let dt = strToDate(cdt);
    let tom = OxiDate.addDays(dt,1);
    wk['tomorrow'] = getDaily(OxiDate.toFormat(tom, 'YYYYMMDD'));
    while (ndays > 0) {
        let tdt = OxiDate.toFormat(dt, 'YYYYMMDD');
        wk[tdt] = getDaily(tdt);
        dt = OxiDate.addDays(dt, -1);
        --ndays;
    }
    wk['tutorial'] = readFileAsync("./puzzles/tutorial.psq").then(JSON.parse).then( function (brdjson) {
        let b = "./puzzles/tutorial.moves" ;
        return readFileAsync(b).then(JSON.parse).then( function (mvs) {
            brdjson.moves = mvs;
            return brdjson;
        });
        
    });
    return Promisify.props(wk);
};

let getWeeklyUser = function(dt,uid) {

    let p =
        pg.get_weekly_user(dt,uid).then( function (rows) {
            let wk = {};
            rows.forEach( function (r) {
                let tdt = OxiDate.toFormat(r.date, 'yyyyMMdd');
                let pzl = r.layout;
                if (r.doc) pzl.moves = r.doc.moves;
                pzl.pubID = r.puzzleId;  
                pzl.gameType = r.gameType;        
                if (!wk[tdt]) wk[tdt] = {};
                wk[tdt][r.pos] = pzl;
            });
            return readFileAsync("./puzzles/tutorial.psq").then(JSON.parse).then( function (brdjson) {
                return readFileAsync("./puzzles/tutorial.moves").then(JSON.parse).then( function (doc) {
                    brdjson.moves = doc.moves;
                    wk['tutorial'] =  brdjson;
                    return wk;
                });
            })
        });
    return p;
};

let createUser = async function (ctx) {
    let o = pg.users;
    //console.log("user count : "+o.count);
    //console.log(JSON.stringify(userId));
    let i = o.size;
    let userName = ''
    while (true) {
        userName = "anonymous_" + i ;
        if (!checkMonikerUsed(userName)) break;
        ++i;
    }
    let userId = uuid.generate();
    let usr = {...pg.emptyUser(), userId, userName };
    let user = await pg.upsert_user(usr);
        console.log("created user : " + JSON.stringify(user));
        let rslt =  {id: userId};
        ctx.userId = rslt;
        ctx.user = user;
        let tok = jwt.sign(rslt, jwt_secret); //{expiresInMinutes: 60*24*14});
        ctx.cookies.set('psq_user', tok);
        return rslt;
};

let authent =  async function(ctx, prov, authId) {
    console.log("authId : "+authId);
    if (!authId) {
        ctx.status = 401
    } else {
        console.log("callback authenticated "+prov);
        let user = pg.get_user_from_auth(prov, authId);
        if (user) {
            ctx.user = user;
            ctx.userId = {id: user.userId};
            if (prov !== 'ip') {
                let ip = clientIP(ctx.req);
                console.log("uuid : "+ctx.userId.id);
                let auth = {...pg.emptyAuth(), authId: 'ip:'+ ip, userId: ctx.userId.id };
                await pg.upsert_auth(auth);
            }
            else pg.touch_auth(prov, authId)
        } else {
            if (!ctx.user) {
                if (prov !== 'ip') console.log("authentication problem - no previous user"); // return;  // ???
                await createUser(ctx);
            }
            user = ctx.user;
            console.log("create auth for : " + user.userName);
            let auth = {...pg.emptyAuth(), authId: prov + ':'+ authId, userId: ctx.userId.id}
            await pg.upsert_auth(auth);
        }
        if (prov === 'ip') delete ctx.userId.auth;
        else ctx.userId.auth = prov + ':' + authId;

        let tok = jwt.sign(ctx.userId, jwt_secret); //{expiresInMinutes: 60*24*14});
        ctx.cookies.set('psq_user', tok);
        await ctx.login(user);
        //ctx.body = {ok: true};
        //ctx.redirect('/');

    }
};
 
app.keys = ['foo'];

let serve = koastatic("./assets",{defer: true});
app.use(serve); ///public"));

app.use(bodyParser());
app.use(session(app));

app.use(passport.initialize());
app.use(passport.session());
//app.use(flash());

app.use(jwt.jwt({secret: jwt_secret, cookie: 'psq_user', ignoreExpiration: true, passthrough: true, key: 'userId'}));

app.use(async function (ctxt, next) {
    //console.log(ctx.path + " requested");

    let userId = ctxt['userId'];
    if (!userId) {
        let ip = clientIP(ctxt.req);
        await authent(ctxt,'ip', ip);
        userId = ctxt['userId'];
    } 
    else ctxt['user'] = getUser(userId.id) ;

    await next();
    //console.log("setting moniker : "+ ctx.user.userName);
    ctxt.set('X-psq-moniker', ctxt.user ? ctxt.user.userName : 'anonymous');
    if (userId.auth)
    {
        let auth = userId.auth;
        let prov = auth.slice(0,auth.indexOf(':'));
        let grps = ctxt.user.groups || '';
        //console.log("setting provider : "+ prov);
        ctxt.set('X-psq-authprov', prov);
        //console.log("setting groups : "+ grps);
        ctxt.set('X-psq-groups', grps);
        pg.touch_user(userId.id);
    }
});



router.get('/solutions/:id', function(ctx, next) {
    let cid = ctx.params.id;
    console.log('solutions requested : '+cid);
    let id = parseInt(cid);
    return getSolutions(id).then( (solns) => { 
        //console.log('solutions found : '+solns.length);
        //solns.forEach(function (s) {console.log(s.lastPlay);});
       
        ctx.body = {ok: true, pubID: id, solutions: solns } 
    } );
});

/*
router.get('/challenges/:id', function (ctx, next) {
    let cid = ctx.params.id;
    console.log('challenges requested : '+cid);
    let id = parseInt(cid);
    return getChallenges(id).then( (rslts) => { 
        ctx.body = {ok: true, results: rslts } 
    } );
});
*/

router.get('/puzzles/:cdt', function (ctx, next) { 
    let cdt = ctx.params.cdt;
    console.log("/puzzles called for : " + cdt);
    let dt = OxiDate.parse(cdt,'yyyyMMdd');
    let userId = ctx['userId'].id;
    return getWeeklyUser(dt,userId).then(function (brds) { 
        //console.log(brds);
        ctx.body = {date: cdt, boards: brds}; 
    }); 
});

/*
router.get('/challenge5min', async function (ctx, next) { 
    console.log("/challenge5min called ");
    ctx.body = await pg.get_random_killer(); 
});

router.get('/challenge15min', async function (ctx, next) { 
    console.log("/challenge15min called ");
    ctx.body = await pg.get_random_samurai(); 
});

router.get('/hidato', async function (ctx, next) { 
    //console.log("/hidato called ");
    ctx.body = await pg.get_random_hidato(); 
});
*/

router.post('/solutions', async function (ctx, next) {
    let body = ctx.request.body;  // from bodyparser 
    body.user = ctx['userId'].id;
    body.doc = {moves: body.moves};
    delete body.moves;
    let id = body.puzzle;

    console.log('solution received : '+ id); // JSON.stringify(body));

    await pg.insert_solution(body);
    solnsCache[id] = null;
    let solns = await getSolutions(id); 
    ctx.body = {ok: true, pubID: id, solutions: solns}; 
});

/*
router.post('/challenges', function (ctx, next) {
    let body = ctx.request.body;  // from bodyparser 
    body.user = ctx['userId'].id;
    body.doc = {moves: body.moves};
    delete body.moves;
    let id = body.timeOut;
    console.log('challenge result received : '+ id); // JSON.stringify(body));

    await upsert_challenge(body)
                challengeCache[id] = null;
                let rslts = await getChallenges(id)
                ctx.body = {ok: true, results: rslts}; 
});
*/

router.post('/newMoniker', async function (ctx, next) {
    let newName = ctx.request.body.userName;  // from bodyparser 
    console.log("setting new Moniker : " + newName);
    console.log("for user " + JSON.stringify(ctx.user));
    let id = ctx['userId'].id;
    if (checkMonikerUsed(newName)) ctx.body = {ok: false, msg: "taken"};
        else {
            let prv = pg.users[id];
            let usr = {...prv, userName: newName };
            console.log("updating user : "+JSON.stringify(usr));    
            let updt = await pg.upsert_user(usr);
                console.log("user updated : "+ JSON.stringify(updt));
                pg.users.set(id, usr);
            ctx.body = {ok: true};
        }
});

router.get('/userstats', async function (ctx, next) {
    //console.log("getting stats for user " + JSON.stringify(ctx.user));
    let id = ctx['userId'].id;
    let rows = await  pg.get_user_stats(id)
    ctx.body = {ok: true, rows}
});

router.get('/logout', async function (ctx, next) {
    let auth = ctx['userId'].auth;
    if (auth) await authent(ctx, 'ip', clientIP(ctx.req));
    ctx.body = {ok: true};
});

router.get('/auth/facebook', function(ctx, next) {
  passport.authenticate('facebook')
});

router.get('/auth/facebook/callback', async function(ctx,next) {
    return passport.authenticate('facebook', async function(err, authId, info, status) { 
       await authent(ctx, 'facebook', authId);
       ctx.body = {ok: true};
    })(ctx, next);
});

/*
router.get('/auth/facebook', async function (ctx, next) {
    console.log("/auth/facebook called");
    yield passport.authenticate('facebook', function*(err, authId, info) {
        console.log("facebook called back");
        if (err) throw err
        if (info) console.log("info : "+info);
        yield authent(ctx, 'facebook', authId);
        ctx.redirect('/#/refresh');
    }).call(this);
});

app.use(router.get('/auth/google', function *() {
    var ctx = this
    yield passport.authenticate('google', function *(err, authId, info) {
        console.log("google called back");
        if (err) throw err
        if (info) console.log("info : "+info);
        yield authent(ctx, 'google', authId);
        ctx.redirect('/#/refresh');
    }).call(this);
}));

app.use(router.get('/auth/github', function *() {
    var ctx = this
    yield passport.authenticate('github', function*(err, authId, info) {
        if (err) throw err
        if (info) console.log("info : "+info);
        yield authent(ctx, 'github', authId);
        ctx.redirect('/#/refresh');
    }).call(this);
}));

app.use(router.get('/auth/twitter', function *() {
    var ctx = this
    yield passport.authenticate('twitter', function*(err, authId, info) {
        if (err) throw err
        if (info) console.log("info : "+info);
        yield authent(ctx, 'twitter', authId);
        ctx.redirect('/#/refresh');
    }).call(this);
}));

*/

router.get('/blog/latest', async function (ctx, next) {
    ctx.body = await pg.query('select id,published,lastedit,title,body,tags from blog order by id desc limit 100')
});

router.get('/blog/:id', async function (ctx, next) {
    let cid = ctx.params.id;
    let id = parseInt(cid);
    ctx.body = await pg.query('select id,published,lastedit,title,body,tags from blog where id = '+id.toString());
});

router.get('/blog/after/:id', async function (ctx, next) {
    let cid = ctx.params.id;
    let id = parseInt(cid);
    ctx.body = await pg.query('select id,published,lastedit,title,body,tags from blog where id > '+id.toString());
});

function getTags(url) {
    let tags = []
    while (true) {
        let i = url.indexOf('?tag=');
        if (i < 0) break;
        url = url.substring(i+5);
        let j = url.indexOf('?tag=');
        let tag = j < 0 ? url : url.substring(0,j);
        tags.push(tag); 
    }
    if (tags.length === 0) {
        console.log("no tags found")
    }
    return tags
}

router.get('/blog/tags', async function (ctx, next) {
    //console.log('path: '+ctx.path);
    console.log('url: '+ctx.url);
    let url = ctx.url;
    let tags = getTags(url);
    if (tags.length === 0) {
        ctx.body = await pg.query('select id,published,lastedit,title,body,tags from blog order by id desc limit 100');
    } else {
        ctx.body = await pg.query("select id,published,lastedit,title,body,tags from blog where ARRAY['"+ tags.join("','") +"'] && tags::text[] order by id desc");
    }
});

router.post('/blog/save', async function (ctx, next) {
    let post = ctx.request.body;
    if (!isMember('author', ctx)) {
        console.log('unauthorised attempt to save blog post: '+post.id);
        ctx.body = {ok: false, error: "unauthorised"};
        return;
    }
    console.log('saving blog post: '+post.id);
    post.lastedit = new Date();
    let rslt = {};
    if (!post.id) {
        post.published = new Date();
        post.id = undefined;
        rslt = await pg.insert_blog(post);
    }
    else await pg.update_blog(post);

    ctx.body = {ok: true, results: rslt };
});

/*
app.use(router.get('/links', function *() {
    console.log("/links called");
    ctx.body = yield pg.query('select id,published,lastedit,url,notes,tags from links order by id desc')
}));

app.use(router.get('/link/:id', function *(cid) {
    let id = parseInt(cid);
    ctx.body = yield pg.query('select id,published,lastedit,url,notes,tags from links where id = '+id.toString())
}));

app.use(router.post('/link/delete', function *() {
    if (!isMember('author', this)) {
        console.log('unauthorised attempt to delete link(s)');
        ctx.body = yield {ok: false, error: "unauthorised"};
        return;
    }

    ctx.body = yield pg.destroy(pg.db.links,ctx.request.body);
}));

app.use(router.post('/link', function *() {
    let link = ctx.request.body;
    if (!isMember('author', this)) {
        console.log('unauthorised attempt to save link');
        ctx.body = yield {ok: false, error: "unauthorised"};
        return;
    }

    console.log('saving link: '+link.id);
    if (!link.id) {
        link.published = new Date();
        delete link.id;
    }
    link.lastedit = new Date();
    ctx.body = yield pg.save(pg.db.links, ctx.request.body)
                        .then( rslts => { 
                                //console.log("result : "+ JSON.stringify(rslts));
                                return {ok: true, results: rslts };
                            })
                        .catch( e => { 
                                console.log("error : "+ JSON.stringify(e));
                                return {ok: false, error: e };
                            });
}));
*/

//app.use(router.post('/game/:gameid/move', function *(gameid) {
    // 
//}));

//import {init as gsInit} from './gameserver.js';

//app.use(koaws(app, { serveClientFile: false, heartbeat: true, heartbeatInterval: 5000 }));

//app.use(koastatic(".")); ///public"));  // last???

//gsInit(app.ws);

app.use(router.routes())
app.use(router.allowedMethods());

const port = parseInt(process.env.PORT, 10) || 8080;

console.log("Listening at http://localhost:" + port);
app.listen(port);





