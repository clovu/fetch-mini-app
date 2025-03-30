import { koConvert } from './ko'
import { noBossConvert } from './no-boss'
import { xiaotieConvert } from './xiaotie'

export const appList = [
  // {
  //   excutor: xiaotieConvert,
  //   name: 'xiaotie',
  //   brand: 1,
  //   duration: 0.5
  // },
  // {
  //   excutor: koConvert,
  //   name: 'ko',
  //   brand: 2,
  //   duration: 0.5
  // },
  // {
  //   excutor: (c: any) => noBossConvert('wx9be62f8bb91b02c7', '3.114.3', 12393, 8674, c),
  //   name: 'maliyou',
  //   brand: 3,
  //   duration: 1
  // },
  {
    excutor: (c: any) => noBossConvert('wxe1ac0b5394d398d9', '3.114.3', 20548, 34412, c),
    name: 'xiaoye',
    brand: 3,
    duration: 1
  },
] as const
