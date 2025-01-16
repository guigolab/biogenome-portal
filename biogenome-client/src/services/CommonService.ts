import { DataModels } from '../data/types'
import { base, download } from '../http-axios'


class CommonService {
  getItems(model: DataModels, params: Record<string, any>) {
    return base.get(`/${model}`, { params: params })
  }
  getItem(model: DataModels, id: string) {
    return base.get(`/${model}/${id}`)
  }
  getTsv(model: DataModels, params: Record<string, any>) {
    return download.get(`/${model}`, { params: params })
  }
}

export default new CommonService()
