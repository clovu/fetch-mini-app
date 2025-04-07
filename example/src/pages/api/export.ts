import type { NextApiRequest, NextApiResponse } from 'next'
import { ReportService } from '@/lib/db'
import { parseQueryParam } from '@/lib/utils'

// 类型定义集中管理
type ResponseData = {
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | Buffer>
) {
  try {
    const startDate = parseQueryParam(req.query.startDate)
    const endDate = parseQueryParam(req.query.endDate)

    const buffer = await ReportService.generateReport(startDate, endDate)

    res.setHeader('Content-Disposition', 'attachment; filename="analyze-data.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  } catch (error) {
    console.error('Error generating report:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
