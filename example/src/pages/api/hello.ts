import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import XLSX from 'xlsx'

type ResponseData = {
  message: string
}

const SELECT_BRAND_SQL = `
SELECT
    brand AS brand_id,
    CASE
        WHEN store.brand = 1 THEN '小铁'
        WHEN store.brand = 2 THEN 'KO'
        WHEN store.brand = 3 THEN '麻利友'
        WHEN store.brand = 4 THEN '小野'
        ELSE '未知品牌'
    END AS brand
FROM (SELECT distinct brand FROM store) store
`

interface Brand {
  brand_id: number
  brand: string
}

function getBrandList() {
  return new Promise<Brand[]>((resolve, reject) => {
    db.all<Brand>(SELECT_BRAND_SQL, [], (err, list) => {
      if (err) reject(err)
      else resolve(list)
    })
  })
}


const COLUMNS_SQL = `
SELECT DISTINCT strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) use_time
FROM appoint_record
LEFT JOIN store ON appoint_record.store_id = store.id
WHERE store.brand = ?
ORDER BY use_time
`
function getBrandDate(id: number) {
  return new Promise<string[]>((resolve, reject) => {
    const stmt = db.prepare(COLUMNS_SQL)
    stmt.run(id)
    stmt.all<{ use_time: string }>([id], (err, list) => {
      if (err) reject(err)
      else resolve(list.map(it => it.use_time))
    })
  })
}

interface StoreByBrand {
  name: string
  id: string
  address: string
}

function getStoreByBrand(brand: number) {
  return new Promise<StoreByBrand[]>((resolve, reject) => {
    const stmt = db.prepare('SELECT name, id, address FROM store WHERE brand = ?')
    stmt.all<StoreByBrand>([brand], (err, list) => {
      if (err) reject(err)
      else resolve(list)
    })
  })
}

// const STORE_APPINT_DURATION = `
// SELECT
//     strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) dt,
//     -- duration 表示这个数据多久更新一次，1 表示一个小时
//     COUNT(*) * duration AS record_count  FROM appoint_record
// LEFT JOIN store ON appoint_record.store_id = store.id
// WHERE store_id = ?
// GROUP BY dt
// ORDER BY dt
// `
const STORE_APPINT_DURATION = `
SELECT
    strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) dt,
    -- duration 表示这个数据多久更新一次，1 表示一个小时
    COUNT(*) * duration AS record_count
FROM appoint_record
JOIN store ON appoint_record.store_id = store.id
LEFT JOIN store_table on store.id = store_table.store_id and store_table.id = appoint_record.table_id
WHERE appoint_record.store_id = ? AND store_table.type = ?
GROUP BY dt
ORDER BY dt
`

function getStoreAppintDurations(store_id: string, type: number) {
  return new Promise<{ dt: string, record_count: number, table_type: string }[]>((resolve, reject) => {
    const stmt = db.prepare(STORE_APPINT_DURATION)
    stmt.all<{ dt: string, record_count: number, table_type: string }>([store_id, type], (err, list) => {
      if (err) reject(err)
      else resolve(list)
    })
  })
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  db.serialize(async () => {
    // 查询有哪些品牌
    const list = await getBrandList()
    // 构造workBook
    const workBook = XLSX.utils.book_new();

    for (const brand of list) {
      const datasource: string[][] = []
      const columns = await getBrandDate(brand.brand_id)
      const stores = await getStoreByBrand(brand.brand_id)
      // 查看品牌日期列
      datasource.push([brand.brand, '店铺位置', '类型', ...columns])
      for (const store of stores) {
        const list = await getStoreAppintDurations(store.id, 1)
        const list2 = await getStoreAppintDurations(store.id, 2)
        if (list.length > 0)
          datasource.push([store.name, store.address, '台球', ...list.map(it => it.record_count + '')])
        if (list2.length > 0)
          datasource.push([store.name, store.address, '棋牌', ...list2.map(it => it.record_count + '')])
      }

      datasource.push([])
      datasource.push([])

      const jsonWorkSheet = XLSX.utils.aoa_to_sheet(datasource);
      XLSX.utils.book_append_sheet(workBook, jsonWorkSheet, brand.brand)
    }
    const buffer = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer)
  })
}
