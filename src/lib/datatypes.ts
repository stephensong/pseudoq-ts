// This file is generated - it should not be edited


export type authId = string;
export type date = Date;
export type gameType = "Killer" | "Ninja" | "Samurai" | "Assassin" | "Hidato";
export type integer = number;
export type json = string;
export type percentage = number;
export type puzzleId = number;
export type rating = number;
export type solnId = number;
export type text = string;
export type timestamp = Date;
export type userGroup = "admin" | "author" | "member";
export type userId = string;
export type userName = string;
export type uuid = string;
export type varchar_160 = string;
export type varchar_20 = string;

export interface Auth {
  readonly authId?: authId,
  readonly userId?: userId,
  readonly created?: timestamp,
  readonly updated?: timestamp
};

export interface Blog {
  readonly id?: integer,
  readonly published?: timestamp,
  readonly lastedit?: timestamp,
  readonly title?: varchar_160,
  readonly body?: text,
  readonly tags?: varchar_20[]
};

export interface PuzzlesForDay {
  readonly date?: date,
  readonly pos?: integer,
  readonly puzzle?: puzzleId,
  readonly id?: integer
};

export interface Puzzle {
  readonly puzzleId?: puzzleId,
  readonly gameType?: gameType,
  readonly pubday?: date,
  readonly rating?: rating,
  readonly layout?: json
};

export interface Solution {
  readonly solnId?: solnId,
  readonly puzzle?: puzzleId,
  readonly user?: userId,
  readonly lastPlay?: timestamp,
  readonly completed?: boolean,
  readonly moveCount?: integer,
  readonly doc?: json,
  readonly percentCompleted?: percentage,
  readonly secondsElapsed?: integer
};

export interface User {
  readonly userId?: userId,
  readonly created?: timestamp,
  readonly updated?: timestamp,
  readonly userName?: userName,
  readonly groups?: userGroup[]
};

// end of generated types