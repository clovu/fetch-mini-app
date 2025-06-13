import sqlite3 from 'sqlite3'
import { cwd } from 'node:process'
import { join } from 'node:path'
import * as mathjs from 'mathjs'

import XLSX from 'xlsx'

const root = cwd()
const databasePath = join(root, '.sqlite')
export const db = new sqlite3.Database(databasePath)

// db.on('trace', (sql) => {
//   console.debug('Executing SQL:', sql)
// })

interface Brand {
  brand_id: number
  brand: string
}

interface StoreByBrand {
  name: string
  id: string
  address: string
}

interface AppointmentDuration {
  dt: string
  record_count: number
  table_type: string
  store_id: string
}

// SQL 查询集中管理
const SQL = {
  BRAND_LIST: `
    SELECT 
      brand AS brand_id,
      CASE
        WHEN store.brand = 1 THEN '小铁'
        WHEN store.brand = 2 THEN 'KO'
        WHEN store.brand = 3 THEN '麻利友'
        WHEN store.brand = 4 THEN '小野'
        WHEN store.brand = 5 THEN '碰碰侠'
        ELSE '未知品牌'
      END AS brand
    FROM (SELECT distinct brand FROM store) store
  `,

  BRAND_DATES: (start?: string, end?: string) => `
    SELECT DISTINCT strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) use_time
    FROM appoint_record
    LEFT JOIN store ON appoint_record.store_id = store.id
    WHERE store.brand = ? 
    ${start && end ? 'AND use_time BETWEEN ? AND ?' : ''}
    ORDER BY use_time
  `,

  STORES_BY_BRAND: 'SELECT name, id, address FROM store WHERE brand = ?',

  APPOINTMENT_DURATION: (ids: string[], type: number[], start?: string, end?: string) => `
    SELECT
      strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) dt,
      COUNT(1) * duration AS record_count,
      appoint_record.store_id,
      store_table.type AS table_type
    FROM appoint_record
    JOIN store ON appoint_record.store_id = store.id
    LEFT JOIN store_table ON store.id = store_table.store_id 
      AND store_table.id = appoint_record.table_id
    WHERE appoint_record.store_id in (${ids.map(() => '?').join(',')})
      AND store_table.type in (${type.map(() => '?').join(',')})
      ${start && end ? 'AND use_time BETWEEN ? AND ?' : ''}
    GROUP BY dt, appoint_record.store_id, store_table.type
    ORDER BY dt
  `,

  TABLE_COUNT: (ids: string[], type: number[]) => `
    SELECT COUNT(1) as count, store_id, type
    FROM store_table
    WHERE store_id in (${ids.map(() => '?').join(',')}) AND type in (${type.map(() => '?').join(',')})
    GROUP BY store_id, store_id, type
  `
}

// 数据库操作封装
class DatabaseService {
  static async getBrandList(): Promise<Brand[]> {
    return this.query<Brand>(SQL.BRAND_LIST)
  }

  static async getBrandDates(id: number, start?: string, end?: string): Promise<string[]> {
    const results = await this.query<{ use_time: string }>(
      SQL.BRAND_DATES(start, end),
      [id, ...(start && end ? [start, end] : [])]
    )
    return results.map(it => it.use_time)
  }

  static async getStoresByBrand(brand: number): Promise<StoreByBrand[]> {
    return this.query<StoreByBrand>(SQL.STORES_BY_BRAND, [brand])
  }

  static async getAppointmentDurations(
    ids: string[],
    tps: number[],
    start?: string,
    end?: string
  ): Promise<AppointmentDuration[]> {
    return this.query<AppointmentDuration>(
      SQL.APPOINTMENT_DURATION(ids, tps, start, end),
      [...ids, ...tps, ...(start && end ? [start, end] : [])]
    )
  }

  static async getTableCount(ids: string[], tps: number[]): Promise<Record<string, number>> {
    const result = await this.query<{ count: number, store_id: string, type: number }>(SQL.TABLE_COUNT(ids, tps), [...ids, ...tps])
    return result.reduce((acc, it) => {
      acc[it.store_id + '-' + it.type] = it.count
      return acc
    }, {} as Record<string, number>)
  }

  private static query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.all<T>(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }
}

// Excel 生成封装
class ExcelExporter {
  private workBook = XLSX.utils.book_new();

  addBrandSheet(brand: Brand, data: string[][]) {
    const sheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(this.workBook, sheet, brand.brand)
  }

  getBuffer(): Buffer {
    return XLSX.write(this.workBook, { type: 'buffer', bookType: 'xlsx' })
  }
}

function getTextByType(type: number): string {
  switch (type) {
    case 1:
      return '台球'
    case 2:
      return '棋牌'
    default:
      return '未知类型'
  }
}

function group<T extends object>(list: T[], key: string) {
  return list.reduce((acc, it) => {
    const keyVal = Reflect.get(it, key) as PropertyKey
    if (!Reflect.has(acc, keyVal))
      Reflect.set(acc, keyVal, [])
    const list = Reflect.get(acc, keyVal)
    list.push(it)
    return acc
  }, {} as Record<string, T[]>)
}

// 业务逻辑处理
export class ReportService {
  static async generateReport(startDate?: string, endDate?: string) {
    const exporter = new ExcelExporter()
    const brands = await DatabaseService.getBrandList()

    for (const brand of brands) {
      const data = await this.processBrand(brand, startDate, endDate)
      exporter.addBrandSheet(brand, data)
    }

    return exporter.getBuffer()
  }

  static async generateOpeningRateReport(startDate?: string, endDate?: string) {
    const exporter = new ExcelExporter()
    const brands = await DatabaseService.getBrandList()

    for (const brand of brands) {
      const data = await this.processBrandOpeningRate(brand, startDate, endDate)
      exporter.addBrandSheet(brand, data)
    }

    return exporter.getBuffer()
  }

  private static async processBrandOpeningRate(
    brand: Brand,
    startDate?: string,
    endDate?: string
  ): Promise<string[][]> {
    const datasource: string[][] = []
    const columns = await DatabaseService.getBrandDates(brand.brand_id, startDate, endDate)
    const stores = await DatabaseService.getStoresByBrand(brand.brand_id)

    datasource.push([brand.brand, '店铺位置', '类型', '桌数', ...columns])

    // await Promise.all(stores.map(store => this.processStore(store, datasource, startDate, endDate)) )
    // for (const store of stores) {
    // }
    await this.processStoreOpeningRate(stores, datasource, startDate, endDate)

    return datasource
  }

  private static async processBrand(
    brand: Brand,
    startDate?: string,
    endDate?: string
  ): Promise<string[][]> {
    const datasource: string[][] = []
    const columns = await DatabaseService.getBrandDates(brand.brand_id, startDate, endDate)
    const stores = await DatabaseService.getStoresByBrand(brand.brand_id)

    datasource.push([brand.brand, '店铺位置', '类型', '桌数', ...columns])

    // for (const store of stores) {
    // }
    await this.processStore(stores, datasource, startDate, endDate)

    return datasource
  }

  private static async processStoreOpeningRate(
    stores: StoreByBrand[],
    datasource: string[][],
    startDate?: string,
    endDate?: string
  ) {
    const tps = [1, 2]
    const ids = stores.map(it => it.id)
    const durations = await DatabaseService.getAppointmentDurations(
      ids,
      tps,
      startDate,
      endDate
    )


    if (durations.length > 0) {
      const groupById = group(durations, 'store_id')
      const counts = await DatabaseService.getTableCount(ids, tps)

      // 根据类型进行分组

      for (const storeId in groupById) {
        const durations = Reflect.get(groupById, storeId)
        const store = stores.find(it => it.id === storeId)
        if (!store) continue

        const groupBytype = group(durations, 'table_type')
        for (const type in groupBytype) {
            const list = Reflect.get(groupBytype, type)
            const count = counts[storeId + '-' + type] || 0

            datasource.push([
              store.name,
              store.address,
              getTextByType(Number(type)),
              `${count}`,
              ...list.map(it => {
                if (count === 0) return ''
                return mathjs.round(
                  mathjs.bignumber(it.record_count).div(count),
                  2
                ).toString()
              })
            ])
        }
      }
    }
  }

  private static async processStore(
    stores: StoreByBrand[],
    datasource: string[][],
    startDate?: string,
    endDate?: string
  ) {
    const tps = [1, 2]
    const ids = stores.map(it => it.id)
    const durations = await DatabaseService.getAppointmentDurations(
      ids,
      tps,
      startDate,
      endDate
    )


    if (durations.length > 0) {
      const groupById = group(durations, 'store_id')
      const counts = await DatabaseService.getTableCount(ids, tps)

      // 根据类型进行分组
      for (const storeId in groupById) {
        const durations = Reflect.get(groupById, storeId)
        const store = stores.find(it => it.id === storeId)
        if (!store) continue

        const groupBytype = group(durations, 'table_type')
        for (const type in groupBytype) {
            const list = Reflect.get(groupBytype, type)
            const count = counts[storeId + '-' + type] || 0

            datasource.push([
              store.name,
              store.address,
              getTextByType(Number(type)),
              `${count}`,
              ...list.map(it => `${it.record_count}`)
            ])
        }
      }
    }
    // const processType = async (type: number) => {
    //   const durations = await DatabaseService.getAppointmentDurations(
    //     store.id,
    //     type,
    //     startDate,
    //     endDate
    //   )

    //   if (durations.length > 0) {
    //     const count = await DatabaseService.getTableCount(store.id, type)
    //     datasource.push([
    //       store.name,
    //       store.address,
    //       getTextByType(type),
    //       `${count}`,
    //       ...durations.map(it => `${it.record_count}`)
    //     ])
    //   }
    // }

    // await Promise.all([processType(1), processType(2)])
  }
}

