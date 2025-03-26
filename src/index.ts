import fs from 'fs/promises'

import { appList } from './app'
import { AppointRecord, db, Store, StoreTable } from './db'

(async () => {

  const records: [string, Record<string, StoreDetail>][] = []

  const tasks = appList.map(async ({ excutor, name, brand }) => {
    const list = await excutor({})
    const values = Object.values(list)
    const tableList: StoreTable[] = []
    const appointList: AppointRecord[] = []

    const storeList = values.map(
      ({ store, tables }) => {
        tableList.push(...Object.values(tables).map(table => {

          for (const dt in table.appointRecords) {
            const list = table.appointRecords[dt]
            for (const time in list) {
              appointList.push(new AppointRecord(table.id, store.id, new Date(dt + ' ' + time).getTime() / 1e3))
            }
          }
          Object.values(table.appointRecords).forEach(it => {
          })
          return new StoreTable(table.id, store.id, table.address, 0)
        }))
        return new Store(store.id, brand, store.city, store.name, store.address)
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
      for (const it of tables)
        insertTable.run({
          $id: it.id,
          $store_id: it.store_id,
          $address: it.address,
          $type: it.type,
        });
    })

    insertTables(tableList)

    const insertAppoint = db.prepare(`
      INSERT OR REPLACE INTO appoint_record (table_id, store_id, use_time)
      VALUES ${tableList.map(it => '($table_id, $store_id, $use_time)').join(',')}
    `)

    const insertAppoints = db.transaction((appoints) => {
      for (const it of appoints)
        insertAppoint.run({
          $table_id: it.tableId,
          $store_id: it.storeId,
          $use_time: it.useTime
        });
    })

    insertAppoints(appointList)
    // INSERT OR REPLACE INTO users (name, email)
    // VALUES ($name, $email);
    // console.log(list);

    // records.push([name, await excutor(cache)] as const)
  })

  Promise.all(tasks)

  // for (const { excutor, name, brand } of appList) {
  //   // const importResult = await import(`../data/${name}.json`)
  //   // const cache: Record<string, StoreDetail> = importResult.default ?? name

  //   const list = await excutor({})
  //   const values = Object.values(list)
  //   const tableList: StoreTable[] = []
  //   const appointList: AppointRecord[] = []

  //   const storeList = values.map(
  //     ({ store, tables }) => {
  //       tableList.push(...Object.values(tables).map(table => {

  //         for (const dt in table.appointRecords) {
  //           const list = table.appointRecords[dt]
  //           for (const time in list) {
  //             console.log(dt + ' ' + time);

  //             appointList.push(new AppointRecord(table.id, store.id, new Date(dt + ' ' + time).getTime() / 1e3))
  //           }
  //         }
  //         Object.values(table.appointRecords).forEach(it => {
  //         })
  //         return new StoreTable(table.id, store.id, table.address, 0)
  //       }))
  //       return new Store(store.id, brand, store.city, store.name, store.address)
  //     }
  //   )

  //   const insertSotre = db.prepare(`
  //     INSERT OR REPLACE INTO store (id, brand, city, name, address)
  //     VALUES ${storeList.map(it => '($id, $brand, $city, $name, $address)').join(',')}
  //   `)
  //   // 创建事务
  //   const insertStores = db.transaction((stores) => {
  //     for (const it of stores)
  //       insertSotre.run({
  //         $id: it.id,
  //         $brand: it.brand,
  //         $city: it.city,
  //         $name: it.name,
  //         $address: it.address
  //       });
  //   });

  //   insertStores(storeList)

  //   const insertTable = db.prepare(`
  //     INSERT OR REPLACE INTO store_table (id, store_id, address, type)
  //     VALUES ${tableList.map(it => '($id, $store_id, $address, $type)').join(',')}
  //   `)

  //   const insertTables = db.transaction((tables) => {
  //     for (const it of tables)
  //       insertTable.run({
  //         $id: it.id,
  //         $store_id: it.store_id,
  //         $address: it.address,
  //         $type: it.type,
  //       });
  //   })

  //   insertTables(tableList)

  //   const insertAppoint = db.prepare(`
  //     INSERT OR REPLACE INTO appoint_record (table_id, store_id, use_time)
  //     VALUES ${tableList.map(it => '($table_id, $store_id, $use_time)').join(',')}
  //   `)

  //   const insertAppoints = db.transaction((appoints) => {
  //     for (const it of appoints)
  //       insertAppoint.run({
  //         $table_id: it.tableId,
  //         $store_id: it.storeId,
  //         $use_time: it.useTime
  //       });
  //   })

  //   insertAppoints(appointList)
  //   // INSERT OR REPLACE INTO users (name, email)
  //   // VALUES ($name, $email);
  //   // console.log(list);

  //   // records.push([name, await excutor(cache)] as const)
  // }

  // for (const [name, data] of records) {
  //   fs.writeFile(`data/${name}.json`, JSON.stringify(data, null, 2))
  // }
})()
