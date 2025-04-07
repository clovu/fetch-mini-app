import type { NextApiRequest, NextApiResponse } from 'next';

import { parseQueryParam } from "@/lib/utils";
import { ReportService } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Buffer>
) {
  const startDate = parseQueryParam(req.query.startDate)
  const endDate = parseQueryParam(req.query.endDate)

  const buffer = await ReportService.generateOpeningRateReport(startDate, endDate)
  res.setHeader('Content-Disposition', 'attachment; filename="opening-rate.xlsx"')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buffer)
}
