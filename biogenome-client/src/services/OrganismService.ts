import { DataModels } from '../data/types'
import { base, download } from '../http-axios'


class OrganismService {
  getUnassignedOrganisms(params: Record<string, any>, downloadData?: boolean) {
    const axiosInstance = downloadData ? download : base
    return axiosInstance.get('/organisms/unassigned', {
      params: params,
    })
  }
  getOrganismsWithUsers(params: Record<string, any>, downloadData?: boolean) {
    const axiosInstance = downloadData ? download : base
    return axiosInstance.get('/organisms/with_users', {
      params: params,
    })
  }
  getOrganismRelatedData(taxid: string, model: DataModels) {
    return base.get(`/organisms/${taxid}/${model}`)
  }

}

export default new OrganismService()
