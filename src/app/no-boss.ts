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

export async function noBossConvert(appId: string, appVersion: string, store: number, mid: number, cache: Record<string, StoreDetail> = {}) {
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

    let pageNum = 1

    const records: Store[] = []

    for (; ;) {
      spinner.info(`Fetch: Page ${pageNum}`)

      const formData = new FormData()

      formData.set('timestamp_private', timestamp)
      formData.set('store', store)
      formData.set('mid', mid)
      formData.set('citycode', 20)
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
            city: '广州市'
          })
      })

      pageNum++
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

    list.forEach((it: any) => {
      const p = it.place ?? []

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
          type: it.title,
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
