import fs from 'fs/promises'

import { appList } from './app'
import { AppointRecord, db, Store, StoreTable } from './db'

function createId(name: string, id: string) {
  return name + '-' + id
}

(async () => {

  const tasks = appList.map(async ({ excutor, name, brand, duration }) => {
    const list = await excutor({})
    const values = Object.values(list)
    const tableList: StoreTable[] = []
    const appointList: AppointRecord[] = []

    const storeList = values.map(
      ({ store, tables }) => {
        const storeId = createId(name, store.id)
        tableList.push(...Object.values(tables).map(table => {

          for (const dt in table.appointRecords) {
            const list = table.appointRecords[dt]
            for (const time in list) {
              appointList.push(new AppointRecord(createId(name, table.id), storeId, new Date(dt + ' ' + time).getTime() / 1e3, duration))
            }
          }
          Object.values(table.appointRecords).forEach(it => {
          })
          return new StoreTable(createId(name, table.id), storeId, table.address,
            table.type === '台球' ? 1 : table.type === '棋牌' ? 2 : 0,
          )
        }))
        return new Store(storeId, brand, store.city, store.name, store.address)
      }
    )

    const insertSotre = db.prepare(`
      INSERT OR REPLACE INTO store (id, brand, city, name, address)
      VALUES ${storeList.map(it => '($id, $brand, $city, $name, $address)').join(',')}
    `)
    // 创建事务
    const insertStores = db.transaction((stores) => {
      for (const it of stores)
        insertSotre.run({
          $id: it.id,
          $brand: it.brand,
          $city: it.city,
          $name: it.name,
          $address: it.address
        });
    });

    insertStores(storeList)

    const insertTable = db.prepare(`
      INSERT OR REPLACE INTO store_table (id, store_id, address, type)
      VALUES ${tableList.map(it => '($id, $store_id, $address, $type)').join(',')}
    `)

    const insertTables = db.transaction((tables) => {
      for (const it of tables) {
        insertTable.run({
          $id: it.id,
          $store_id: it.store_id,
          $address: it.address,
          $type: it.type//it.type === '台球' ? 1 : it.type === '棋牌' ? 2 : 0,
        });
      }
    })

    insertTables(tableList)

    const insertAppoint = db.prepare(`
      INSERT OR REPLACE INTO appoint_record (table_id, store_id, use_time, duration)
      VALUES ${tableList.map(it => '($table_id, $store_id, $use_time, $duration)').join(',')}
    `)

    const insertAppoints = db.transaction((appoints) => {
      for (const it of appoints) {
        if (!isNaN(it.useTime))
          insertAppoint.run({
            $table_id: it.tableId,
            $store_id: it.storeId,
            $use_time: it.useTime,
            $duration: it.duration
          });
      }
    })

    insertAppoints(appointList)
  })

  Promise.all(tasks)
})()
