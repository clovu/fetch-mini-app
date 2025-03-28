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


const STORE_APPINT_DURATION = `
SELECT
    strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) dt,
    -- duration 表示这个数据多久更新一次，1 表示一个小时
    COUNT(*) * duration AS record_count  FROM appoint_record
LEFT JOIN store ON appoint_record.store_id = store.id
WHERE store_id = ?
GROUP BY dt
ORDER BY dt
`

function getStoreAppintDurations(store_id: string) {
  return new Promise<{ dt: string, record_count: number }[]>((resolve, reject) => {
    const stmt = db.prepare(STORE_APPINT_DURATION)
    stmt.all<{ dt: string, record_count: number }>([store_id], (err, list) => {
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
    const datasource: string[][] = []
    // 查询有哪些品牌
    const list = await getBrandList()
    for (const brand of list) {
      const columns = await getBrandDate(brand.brand_id)
      const stores = await getStoreByBrand(brand.brand_id)
      // 查看品牌日期列
      datasource.push([brand.brand, '店铺位置', ...columns])
      for (const store of stores) {
        const list = await getStoreAppintDurations(store.id)
        datasource.push([store.name, store.address, ...list.map(it => it.record_count + '')])
      }

      datasource.push([])
      datasource.push([])
    } 

    const jsonWorkSheet = XLSX.utils.aoa_to_sheet(datasource);
    // 构造workBook
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, jsonWorkSheet)
    const buffer = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });


    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer)
  })
}
