import type { NextApiRequest, NextApiResponse } from 'next'
import { db, Store } from '@/lib/db'

type ResponseData = {
  message: string
  list: Store[]
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const list = db.query('select * from store').as(Store)
  res.status(200).json({ message: '', list: list.all() })
}
