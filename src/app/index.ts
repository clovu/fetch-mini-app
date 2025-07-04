import { koConvert } from './ko'
import { noBossConvert } from './no-boss'
import { xiaotieConvert } from './xiaotie'

export const appList = [
  // {
  //   excutor: (c: any) => xiaotieConvert(c, ['广州市', '佛山市', '湛江市']),
  //   name: 'xiaotie',
  //   brand: 1,
  //   duration: 0.5
  // },
  {
    excutor: koConvert,
    name: 'ko',
    brand: 2,
    duration: 0.5
  },
  {
    excutor: (c: any) =>
      noBossConvert(
        'wx9be62f8bb91b02c7',
        '3.114.3',
        12393,
        8674,
        c,
        [20, 757],
        (area, it) =>
          String(area.title).indexOf('台') > -1 ? '台球' : '棋牌'
        ,),
    name: 'maliyou',
    brand: 3,
    duration: 1
  },
  // {
  //   excutor: (c: any) => noBossConvert('wxe1ac0b5394d398d9', '3.114.3', 20548, 34412, c,[20], (area) => area.title),
  //   name: 'xiaoye',
  //   brand: 4,
  //   duration: 1
  // },
  {
    excutor: (c: any) => noBossConvert('wx339eb82b0169f549', '3.114.3', 18776, 20692, c,[20], (area) => '棋牌'),
    name: 'PangPangHero',
    brand: 5,
    duration: 1
  },
] as const
