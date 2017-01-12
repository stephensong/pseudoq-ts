"use strict";

import {isDev} from "../lib/utils.js";
import * as Url from 'url';                    

const curl = isDev() ? process.env.DEV_DATABASE_URL
                    : process.env.DATABASE_URL;

import * as OxiDate from '../lib/oxidate';

import { IMain, IDatabase } from 'pg-promise';
import * as pgPromise from 'pg-promise';
import * as Dbt from '../lib/datatypes'
import * as OxiGen from '../lib/oxigen';

// your protocol extensions:
//interface IExtensions {
//    findUser(userId: number): Promise<any>;
//}

// pg-promise initialization options:
// var options = {
//     extend: obj => {
//         obj.findUser = userId => {
//             return obj.one('SELECT * FROM Users WHERE id=$1', userId);
//         }
//     }
// };


// initializing the library:
//var pgp: IMain = pgPromise(options);

// database object with extensions:
//var db = <IDatabase<IExtensions>&IExtensions>pgp(cn);

// now you can use the extensions everywhere (including tasks and transactions):
//db.findUser(123).then(...);

const pgp: IMain = pgPromise({
  // Initialization Options
});

const oxb: OxiGen.IDbSchema = OxiGen.dbSchema;

//pgp.pg.types.setTypeParser(1114, str => moment.utc(str).format());

export const db: IDatabase<any> = pgp('postgres:'+curl);
export const users = new Map<Dbt.userId, Dbt.User>();
export const auths = new Map<Dbt.authId, Dbt.Auth>();

export async function init() {
  let userRows: Array<Dbt.User> = await db.any("select * from users;");
  userRows.forEach(r => users.set(r.userId, r ));

  let authRows: Array<Dbt.Auth> = await db.any("select * from auths");
  authRows.forEach(r => auths.set(r.authId, r));
}

export function query(cqry) {
  return db.any;
}

export function emptyUser(): Dbt.User {
  return OxiGen.emptyRec<Dbt.User>(oxb.tables.get("users"));
}

const upsert_user_sql = OxiGen.genUpsertStatement(oxb.tables.get("users"));
export async function upsert_user(usr: Dbt.User) {
  //console.log('Inserting user : ' + userName ) ;
  let updated = new Date();
  let created = usr.created || updated
  let newusr = {...usr, created, updated };
  await db.none(upsert_user_sql, newusr)
  users.set(usr.userId, newusr);
  return newusr;
};

export function emptyAuth(): Dbt.Auth {
  return OxiGen.emptyRec<Dbt.Auth>(oxb.tables.get("auths"));
}

const insert_blog_sql = OxiGen.genInsertStatement(oxb.tables.get("blog"))
export async function insert_blog(blog: Dbt.Blog) {
  return await db.one(insert_blog_sql, blog);
};

const update_blog_sql = OxiGen.genUpdateStatement(oxb.tables.get("blog"))
export async function update_blog(blog: Dbt.Blog) {
  await db.none(update_blog_sql, blog);
};

const upsert_auth_sql = OxiGen.genUpsertStatement(oxb.tables.get("auths"))
export async function upsert_auth(auth: Dbt.Auth) {
  let updated = new Date();
  let created = auth.created || updated
  let newauth = {...auth, created, updated };
  await db.none(upsert_auth_sql, newauth);
  auths.set(auth.authId, newauth);
};

export function get_user_from_auth(prov, authId) {
  let rslt = auths[prov + ':' + authId];
  if (rslt) rslt = users[rslt];
  return rslt;
};

export async function touch_user(userId) {
  let usr = users.get(userId);
  let dt = new Date();
  await db.none('update users set updated = $2 where "userId" = $1', [userId, dt])
  usr = {...usr, updated: dt};
  users.set(usr.userId, usr);
};

export async function touch_auth(prov, authId) {
  let key = prov + ':' + authId;
  let auth = auths.get(key);
  let dt = new Date();
  await db.none('update auths set updated = $2 where "authId" = $1', [key, dt]);
  auth = {...auth, updated: dt};
  auths.set(auth.authId, auth);
};

const insert_solution_sql = OxiGen.genInsertStatement(oxb.tables.get("solutions"))
export async function insert_solution(soln: Dbt.Solution) {
  console.log('solution submitted, puzzle : ' + soln.puzzle + ", user : " + soln.user);
  await db.none(insert_solution_sql, soln);
};

/*
export function upsert_challenge(chrslt) {
    console.log('challenge submitted, timeOut : ' + chrslt.timeOut + ", user : " + chrslt.user);
    if (chrslt.percentCompleted) delete chrslt.percentCompleted;
    return where(db.challenges, '"timeOut"=$1 and "user"=$2', [chrslt.timeOut, chrslt.user]).then(rslt => {
        //console.log("solutions found : "+rslt.length);
        if (rslt.length > 0) {
            rslt = rslt[0];
            let strt = oxiDate.addDays(new Date(), -7);
            console.log(chrslt.points.toString() + ", " + rslt.points);
            if (strt > rslt.lastPlay || chrslt.points > rslt.points) {
                console.log("saving challenge : " + chrslt.points);
                chrslt.rsltId = rslt.rsltId;
                return update(db.challenges, chrslt);
            } else return { ok: true };
        } else {
            return insert(db.challenges, chrslt);
        }
    });
};
*/

export async function get_solutions(pzlId) {
  //console.log("getting solutions for "+pzlId);
  return await db.any('select * from solutions where puzzle=$1 and completed=true', [pzlId]);
};

/*
export function get_challenges(tmOut) {
    //console.log("getting solutions for "+pzlId);
    let strt = oxiDate.toFormat(oxiDate.addDays(new Date(), -7), 'yyyyMMdd');
    return query('select * from challenges where "timeOut"=$1 and "lastPlay" > $2 order by points desc limit 10', [tmOut, strt]);
};
*/

export async function get_puzzle(pzlId) {
  //console.log("getting puzzle "+pzlId);
  let rslt = await db.one('select layout from puzzles where "puzzleId" = $1', pzlId)
  rslt.layout.pubID = pzlId;
  return rslt.layout;
};

export async function get_day(dt) {
  //console.log("getting day "+cdt);
  let rslt = await db.any('select * from days where "date" = $1', dt);
  let res = new Array(rslt.length);
  rslt.forEach(function (r) {
    res[r.pos] = r.puzzle;
  });
  return res;
};

export async function get_weekly_user(dt: Date, uid: Dbt.userId) {

  let csql =
    ' with pids as ('
    + '     select "date",pos,puzzle from days'
    + '     where "date" <= $1 and "date" > $2'
    + '     )'
    + ' select pids."date", pids.pos, p.*, s2.doc'
    + ' from pids '
    + ' left join puzzles p on pids.puzzle = p."puzzleId"'
    + ' left join (select puzzle, doc from solutions s where s.user = $3) s2 on p."puzzleId" = s2.puzzle'
    + ' order by pids.date desc,pids.pos '
    ;
  let dt1 = OxiDate.toFormat(OxiDate.addDays(dt, 7), 'yyyyMMdd');
  let dt2 = OxiDate.toFormat(OxiDate.addDays(dt, -8), 'yyyyMMdd');
  return await db.any(csql, [dt1, dt2, uid]);
};

/*
let killerIds = querySync('select "puzzleId" from puzzles where "gameType" = \'Killer\' and rating = \'Easy\'').rows.map(function (o) { return o.puzzleId; });

export function get_random_killer() {
    let i = Math.floor(Math.random() * killerIds.length);
    let pzl = killerIds[i];
    return get_puzzle(pzl);
};

let samuraiIds = querySync('select "puzzleId" from puzzles where "gameType" = \'Samurai\' and rating = \'Easy\'').rows.map(function (o) { return o.puzzleId; });

export function get_random_samurai() {
    let i = Math.floor(Math.random() * samuraiIds.length);
    let pzl = samuraiIds[i];
    return get_puzzle(pzl);
};

let hidatoIds = querySync('select "puzzleId" from puzzles where "gameType" = \'Hidato\' ').rows.map(function (o) { return o.puzzleId; });

export function get_random_hidato() {
    let i = Math.floor(Math.random() * hidatoIds.length);
    let pzl = hidatoIds[i];
    return get_puzzle(pzl);
};
*/

export async function get_all_user_stats() {
  let csql = '\
        with stats as ( \
          select "gameType", "user",AVG("moveCount") as avgmoves ,count(*) as gamescompleted \
          from solutions s \
          join users u on s."user" = u."userId" \
          join puzzles p on p."puzzleId" = s.puzzle \
          where s.completed \
          group by "user","gameType" \
        ) \
        select "gameType", user",avgmoves,gamescompleted, u."userName"  \
        from stats s  \
        join users u on s."user" = u."userId" '
  return await db.any(csql);
}

export async function get_gameType_stats() {
  let csql = '\
      select "gameType", AVG("moveCount") as avgmoves ,count(*) as gamescompleted \
      from solutions s \
      join puzzles p on p."puzzleId" = s.puzzle \
      where s.completed \
      group by "gameType" '
  return await db.any(csql);
}

export async function get_user_stats(uid) {
  let csql = '\
        with gamestats as ( \
          select "gameType", round( AVG("moveCount") ) as avgmoves_all, count(*) as gamescompleted_all \
          from solutions s \
          join puzzles p on p."puzzleId" = s.puzzle \
          where s.completed \
          group by "gameType" \
        ), userstats as ( \
          select "gameType", round( AVG("moveCount") ) as avgmoves ,count(*) as gamescompleted \
          from solutions s \
          join puzzles p on p."puzzleId" = s.puzzle \
          where s.completed and "user" = $1 \
          group by "gameType" \
        ) \
        select g."gameType",avgmoves,gamescompleted,avgmoves_all,gamescompleted_all  \
        from userstats u \
        join gamestats g on u."gameType" = g."gameType" \
        '
  return await db.any(csql, [uid]);
}



//console.log = function(msg) { console.trace(msg) }

//rslt.import_new_puzzles();
//rslt.import_new_days();


