import * as fs from "fs"
import json from '../lib/model.js'

export interface IScalarType {
  name: string,
  tsType: string,
  sqlType: string,
  max?: number,
  min?: number,
  maxLen?: number,
  enum?: string[]
}

export interface IColumn {
  name: string,
  type: IScalarType,
  multiValued?: boolean,
  notNull?: boolean
}

export interface TupleType {
  name: string, 
  heading: IColumn[]
}

export interface IForeignKey {
  ref: string,
  columns: string[]
}

export interface IUniqueColumnSet {
  columns: string[]
}

export interface ITable {
  name: string,
  rowType: TupleType,
  primaryKey: string[],
  autoIncrement?: string,
  foreignKeys: IForeignKey[],
  uniques: IUniqueColumnSet[]
}

export interface IDbSchema {
  tables: Map<string, ITable>,
  dataTypes: Map<string, IScalarType>,
}

export function loadModel(model): IDbSchema {

  let dataTypes = new Map<string, IScalarType>();
  let tables = new Map<string, ITable>()
  let tupleTypes = new Map<string, TupleType>()
  

  let typs = model.scalarTypes;
  Object.keys(typs).forEach((k: string) => {
    let v: IScalarType = {name: k, tsType: "string", ...typs[k]};
    dataTypes.set(k, v);
  })

  let tups = model.tupleTypes;
  Object.keys(tups).forEach((k: string) => {
    let a: Array<any> = tups[k];
    let cols: IColumn[] = a.map(v => {
      if (typeof v === "string") {
        let typ = dataTypes.get(v);
        return { name: v, type: typ };
      }
      else {
        let t: string = v.type;
        let typ = dataTypes.get(t);
        if (!typ) {
          if (t.startsWith("varchar(")) {
            let nm = t.replace("(","_").replace(")","");
            let maxLen = parseInt(nm.substring(8))
            typ = {name: nm, sqlType: t, tsType: "string", maxLen };
            dataTypes.set(t, typ);
          } 
          else throw("unable to locate type for "+v.type);
        }
        return { ...v, type: typ };
      }
    });
    tupleTypes.set(k, {name: k, heading: cols});
  });

  let tbls = model.tables;
  Object.keys(tbls).forEach((k: string) => {
    let v = tbls[k];
    let tup = tupleTypes.get(v.rowType);
    let primaryKey: string[] = v.primaryKey;
    tables.set(k, { ...v, name: k, rowType: tup});
  });

  return { tables, dataTypes };
}

function filterCols(tbl: ITable, data: Object = null): IColumn[] {
  let cols = tbl.rowType.heading;
  if (data) cols = cols.filter(c => (data.hasOwnProperty(c.name) && data[c.name] !== undefined) );
  return cols;
}

export function columnNames(tbl: ITable, data: Object = null): string[] {
  return filterCols(tbl, data).map( c => '"'+c.name+'"' );
}

export function columnRefs(tbl: ITable, data: Object = null): string[] {
  return filterCols(tbl, data).map( c => '${'+c.name+'}' );
}

export function columnSets(tbl: ITable, data: Object = null): string[] {
  return filterCols(tbl, data).filter(c => tbl.primaryKey.indexOf(c.name) < 0).map( c => ' "'+c.name+'" = ${'+c.name+'}' );
}

export function genInsertColumns(tbl: ITable, data: Object = null): string {
  let cols = filterCols(tbl, data);
  if (tbl.autoIncrement) {
    let i = cols.findIndex(c => c.name === tbl.autoIncrement);
    if (i < 0 && !data) throw new Error("invalid valid value for autoIncrement field: "+tbl.autoIncrement);
    if (i >= 0) cols.splice(i, 1);
  }
  return '('+ cols.map( c => '"'+c.name+'"' ).join() +')';
}

export function genInsertValues(tbl: ITable, data: Object = null): string {
  let cols = filterCols(tbl, data)
  if (tbl.autoIncrement) {
    let i = cols.findIndex(c => c.name === tbl.autoIncrement);
    if (i >= 0) cols.splice(i,1);
  }
  let refs = cols.map( c => '${'+c.name+'}' );
  return '('+ refs.join() +')';
}

export function genInsertStatement(tbl: ITable, data: Object = null): string {
  let stmt = "INSERT INTO "+tbl.name + genInsertColumns(tbl, data) + " VALUES " + genInsertValues(tbl, data);
  if (tbl.autoIncrement) stmt += ' RETURNING "'+tbl.autoIncrement+'"';
  return stmt;
}

export function genUpdateStatement(tbl: ITable, data: Object = null): string {
  if (data) {
    tbl.primaryKey.forEach(s => {if (data[s] == null || data[s] == undefined) throw new Error("Primary Key value(s) missing"); } );
  }
  let where = tbl.primaryKey.map( c => '"'+c+'" = ${'+c+'}' ).join(' AND ');
  return "UPDATE "+ tbl.name + " SET" + columnSets(tbl, data).join() + " WHERE " + where ;
}

export function genUpsertStatement(tbl: ITable, data: Object = null): string {
  if (tbl.autoIncrement)  throw new Error("Cannot use upsert: "+tbl.name+ "table has autoIncrement column");
  let istmt = genInsertStatement(tbl, data);
  let ustmt = "UPDATE SET" + columnSets(tbl, data).join();
  let pk = tbl.primaryKey.map( c => '"'+c+'"' ).join();
  return istmt + " on conflict(" + pk + ") do " + ustmt;
}

export function genTypescriptType(tbl: ITable): string {
  let lns = tbl.rowType.heading.map( c => {
    if (c.name === "groups") 
        console.log(c.name + "is []");
    return "\n  readonly "+ c.name + (c.notNull ? '' : '?') + ": "+ c.type.name + (c.multiValued ? '[]' : '') 
  });
  return "export interface "+tbl.rowType.name+" {" +  lns.join() + "\n};";
}

export function writeTypescriptTypesToFile(db: IDbSchema, fname: string): void {
  let strm = fs.createWriteStream(fname, {flags: 'w', encoding: 'utf8'});
  strm.write("// This file is generated - it should not be edited\n\n");
  strm.on('finish', () => strm.close() );
  db.dataTypes.forEach(t => {
    let typ = t.enum ?  t.enum.map(s => '"'+s+'"').join(" | ")
                     : ( t.tsType || "string" )
    if (t.name !== typ) strm.write("\nexport type " + t.name + " = " + typ + ";");                     
  })
  strm.write("\n\n");

  db.tables.forEach(t => {
    let ts = genTypescriptType(t);
    strm.write(ts + "\n\n");
  })
  strm.end("// end of generated types");
}

export function defaultValue(typ: IScalarType): any {
  if (typ.enum) return [];
  switch (typ.name) {
    case "string" : return "";
    case "number" : return typ.max ? typ.min : 0;
    case "date" : return new Date();
    case "boolean": return false;
  }
}

export function emptyRec<T>(tbl: ITable):  T {
  let rslt = Object.create(null);
  tbl.rowType.heading.forEach( c => rslt[c.name] = undefined );
  return rslt;
} 

export const dbSchema =  loadModel(json)

