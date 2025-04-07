import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import XLSX from 'xlsx'

// 类型定义集中管理
type ResponseData = {
  message: string
}

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

  APPOINTMENT_DURATION: (start?: string, end?: string) => `
    SELECT
      strftime('%Y-%m-%d', datetime(use_time, 'unixepoch')) dt,
      COUNT(*) * duration AS record_count
    FROM appoint_record
    JOIN store ON appoint_record.store_id = store.id
    LEFT JOIN store_table ON store.id = store_table.store_id 
      AND store_table.id = appoint_record.table_id
    WHERE appoint_record.store_id = ? 
      AND store_table.type = ?
      ${start && end ? 'AND use_time BETWEEN ? AND ?' : ''}
    GROUP BY dt
    ORDER BY dt
  `,

  TABLE_COUNT: `
    SELECT COUNT(*) as count
    FROM store_table
    WHERE store_id = ? AND type = ?
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
    storeId: string, 
    type: number, 
    start?: string, 
    end?: string
  ): Promise<AppointmentDuration[]> {
    return this.query<AppointmentDuration>(
      SQL.APPOINTMENT_DURATION(start, end),
      [storeId, type, ...(start && end ? [start, end] : [])]
    )
  }

  static async getTableCount(storeId: string, type: number): Promise<number> {
    const result = await this.query<{ count: number }>(SQL.TABLE_COUNT, [storeId, type])
    return result[0]?.count || 0
  }

  private static query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows as T[])
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

// 业务逻辑处理
class ReportService {
  static async generateReport(startDate?: string, endDate?: string) {
    const exporter = new ExcelExporter()
    const brands = await DatabaseService.getBrandList()

    for (const brand of brands) {
      const data = await this.processBrand(brand, startDate, endDate)
      exporter.addBrandSheet(brand, data)
    }

    return exporter.getBuffer()
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

    for (const store of stores) {
      await this.processStore(store, datasource, startDate, endDate)
    }

    return datasource
  }

  private static async processStore(
    store: StoreByBrand,
    datasource: string[][],
    startDate?: string,
    endDate?: string
  ) {
    const processType = async (type: number) => {
      const durations = await DatabaseService.getAppointmentDurations(
        store.id, 
        type, 
        startDate, 
        endDate
      )

      if (durations.length > 0) {
        const count = await DatabaseService.getTableCount(store.id, type)
        datasource.push([
          store.name,
          store.address,
          getTextByType(type),
          `${count}`,
          ...durations.map(it => `${it.record_count}`)
        ])
      }
    }

    await Promise.all([processType(1), processType(2)])
  }
}

// 请求处理
function parseQueryParam(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | Buffer>
) {
  try {
    const startDate = parseQueryParam(req.query.startDate)
    const endDate = parseQueryParam(req.query.endDate)

    const buffer = await ReportService.generateReport(startDate, endDate)

    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    console.error('Error generating report:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
