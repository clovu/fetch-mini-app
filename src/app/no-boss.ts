import CryptoJS from 'crypto-js'
import { isEmptyArr, mergeDetail, sleep } from '../util'
// import fetch from 'node-fetch'
import dayjs from 'dayjs'
import { env } from 'node:process'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import ora from 'ora'

env.TZ = 'Asia/Shanghai'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Shanghai')
dayjs.tz()

const baseURL = 'https://www.5laoban.com/'

export async function noBossConvert(
  appId: string,
  appVersion: string,
  store: number,
  mid: number,
  cache: Record<string, StoreDetail> = {},
  cityList: number[],
  callback: (area: any, item: any) => string
) {
  const spinner = ora('Begin handle API of No BOSS').start()
  type Params = { path: string, timestamp: number }

  function genAppletToken({ path, timestamp }: Params) {
    // 拼接必要信息
    const tokenString = `${baseURL}${appId}${appVersion}${path}${timestamp}${baseURL}`;

    // 使用 MD5 加密生成 token
    return CryptoJS.MD5(tokenString).toString();
  }

  const BASE_URL = 'https://api.5laoban.com'


  async function getStoreList() {
    spinner.start('Fetch: No BOSS store list API')

    const URI = '/store/list'
    const timestamp = new Date().getTime()

    const appletToken = genAppletToken({ path: URI, timestamp })

    const records: Store[] = []

    for (const citycode of cityList) {
      let pageNum = 1

      const cityName = Reflect.get(cityMap, citycode + '') ?? '🤷'

      for (; ;) {
        spinner.info(`Fetch: Page ${pageNum}`)

        const formData = new FormData()

        formData.set('timestamp_private', timestamp)
        formData.set('store', store)
        formData.set('mid', mid)
        formData.set('citycode', citycode)
        formData.set('page', pageNum)
        formData.set('limit', 20)

        // 服务器喘口气
        await sleep(200)
        const resp = await fetch(BASE_URL + URI, {
          method: 'POST',
          headers: {
            'applet-token': appletToken,
            'wxappid': appId,
            'version': appVersion
          },
          body: formData,
          verbose: true
        })



        const json: any = await resp.json()
        const list = json.result.list ?? []
        if (isEmptyArr(list))
          break

        list.forEach((it: any) => {
          if (it.name.indexOf('筹备中') === -1)
            records.push({
              id: it.sid + '',
              name: it.name,
              address: it.address,
              city: cityName
            })
        })

        pageNum++
      }
    }

    spinner.info(`Fetch: Store data retrieval completed, a total of ${records.length} piece of data`)
    spinner.succeed('Sotre fetch successful...')

    return records
  }

  async function getArea(store: string, ssid?: number) {

    const URI = '/area/getplace4scene'
    const timestamp = new Date().getTime()

    const appletToken = genAppletToken({ path: URI, timestamp })

    const formData = new FormData()

    formData.set('timestamp_private', timestamp)
    formData.set('store', store)
    if (ssid)
      formData.set('ssid', ssid)

    // 服务器喘口气
    await sleep(200)
    return await fetch(BASE_URL + URI, {
      method: 'POST',
      headers: {
        'applet-token': appletToken,
        'wxappid': appId,
        'version': appVersion
      },
      body: formData,
      verbose: true
    })

  }

  async function getAreaList(store: string) {
    spinner.start(`Fetch: Get store table by ${store}}`)

    spinner.succeed(`Fetch: Successfully obtained Table by ${store}`)
    spinner.start(`Sotre fetch successful...`)
    const resp = await getArea(store)
    const json: any = await resp.json()
    const list = json.result.area ?? []
    const records: Table[] = []


    // 如果没有 ssid 并且 checkout_model 大于1，需要循环继续获取，可能分不同模式
    /**
     * "checkout_model": [
            {
                "id": xxx,
                "title": "台球"
            }
        ],
     */
    const checkout_model = json.result.checkout_model ?? []
    if (checkout_model.length > 1) {
      for (let i = 1; i < checkout_model.length; i++) {
        const { id, title } = checkout_model[i];
        const resp = await getArea(store, id)
        const json: any = await resp.json()
        const area = json.result.area ?? []
        list.push(...area)
      }
    }

    list.forEach((area: any) => {
      const p = area.place ?? []

      p.forEach((place: any) => {
        spinner.start(`Process: ${place.title}`)
        const appointRecords: Record<string, Record<string, boolean>> = {}
        let today = dayjs().format('YYYY-MM-DD')

        place.timeline.forEach((timeline: any) => {
          const time = getTimeAndState(timeline)
          if (time === '次') {
            today = dayjs().add(1, 'days').format('YYYY-MM-DD')
            return
          }

          if (!time) return
          appointRecords[today] ??= {}
          appointRecords[today][time] = true
        })

        records.push({
          id: place.pid + '',
          address: place.title,
          type: callback(area, place),
          appointRecords
        })
      })
    })


    return records
  }

  const result = await mergeDetail(cache, getStoreList, getAreaList)

  spinner.info('No BOSS Processing completed')
  spinner.stop()

  return result
}

function getTimeAndState(timeline: any) {
  if (typeof timeline === 'object') {
    if (timeline.key === '次') return '次'
    if (!timeline.val) return

    return timeline.key + ':00'
  }

  if (timeline === '次') return '次'
  return timeline + ':00'
}


const cityMap = {
  "20": "广州市",
  "23": "重庆市",
  "25": "南京市",
  "27": "武汉市",
  "28": "成都市",
  "312": "保定市",
  "316": "廊坊市",
  "319": "邢台市",
  "349": "朔州市",
  "359": "运城市",
  "370": "商丘市",
  "512": "苏州市",
  "536": "潍坊市",
  "570": "衢州市",
  "571": "杭州市",
  "574": "宁波市",
  "577": "温州市",
  "591": "福州市",
  "592": "厦门市",
  "593": "宁德市",
  "594": "莆田市",
  "595": "泉州市",
  "598": "三明市",
  "599": "南平市",
  "663": "揭阳市",
  "668": "茂名市",
  "712": "孝感市",
  "716": "荆州市",
  "733": "株洲市",
  "734": "衡阳市",
  "737": "益阳市",
  "739": "邵阳市",
  "750": "江门市",
  "751": "韶关市",
  "752": "惠州市",
  "753": "梅州市",
  "755": "深圳市",
  "756": "珠海市",
  "757": "佛山市",
  "758": "肇庆市",
  "759": "湛江市",
  "760": "中山市",
  "762": "河源市",
  "763": "清远市",
  "769": "东莞市",
  "771": "南宁市",
  "774": "梧州市",
  "775": "玉林市",
  "777": "钦州市",
  "779": "北海市",
  "790": "新余市",
  "791": "南昌市",
  "793": "上饶市",
  "795": "宜春市",
  "851": "贵阳市",
  "855": "黔东南苗族侗族自治州",
  "859": "黔西南布依族苗族自治州",
  "871": "昆明市",
  "1755": "贵港市",
  "1771": "崇左市",
  "1772": "来宾市",
  "1774": "贺州市",
  "2728": "潜江市"
}
