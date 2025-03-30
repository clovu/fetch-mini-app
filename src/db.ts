import { Database } from "bun:sqlite";
import { cwd } from 'node:process'
import { join } from 'node:path'

const root = cwd()
const databasePath = join(root, 'data/.sqlite')

export const db = new Database(databasePath, { create: true });

const CREATE_STORE = `
CREATE TABLE IF NOT EXISTS store(
  id NVARCHAR PRIMARY KEY NOT NULL,
  brand SMALLINT NOT NULL, -- 品牌 1 小铁、2 KO 台球、3 麻利友
  city NVARCHAR NOT NULL, -- 城市
  name NVARCHAR NOT NULL, -- 店名
  address NVARCHAR NOT NULL -- 商铺详细位置
);
`

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS store_table (
  id NVARCHAR NOT NULL,
  store_id NVARCHAR NOT NULL,
  address NVARCHAR NOT NULL, -- 桌位，通常指几号桌
  type SMALLINT NOT NULL, -- 1 表示台球 2 表示棋牌
  PRIMARY KEY (id, store_id)
);
`

const CREATE_RECORD = `
CREATE TABLE IF NOT EXISTS appoint_record (
  table_id NVARCHAR NOT NULL, -- 台桌ID
  store_id NVARCHAR NOT NULL, -- 商铺ID
  use_time INTEGER NOT NULL, -- 使用时间
  duration FLOAT NOT NULL default 0.5,
  PRIMARY KEY (table_id, store_id, use_time)
);
`

db.run(CREATE_STORE)
db.run(CREATE_TABLE)
db.run(CREATE_RECORD)

export class Store {
  constructor(public id = '', public brand = 0, public city = '', public name = '', public address = '') { }
}

export class StoreTable {
  constructor(
    public id = '',
    public store_id = '',
    public address = '',
    public type = 0,
  ) { }
}

export class AppointRecord {
  constructor(
    public tableId = '',
    public storeId = '',
    public useTime = 0,
    public duration = 0.5
  ) { }
}
