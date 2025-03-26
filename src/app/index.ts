import { koConvert } from './ko'
import { noBossConvert } from './no-boss'
import { xiaotieConvert } from './xiaotie'

export const appList = [
  {
    excutor: xiaotieConvert,
    name: 'xiaotie',
    brand: 1
  },
  {
    excutor: koConvert,
    name: 'ko',
    brand: 2
  },
  {
    excutor: (c: any) => noBossConvert('wx9be62f8bb91b02c7', '3.112.2', c),
    name: 'maliyou',
    brand: 3
  },
] as const
