import { base } from '../http-axios'

class TaxonService {
  getTaxon(taxid: string) {
    return base.get(`/taxons/${taxid}`)
  }
  getTaxonChildren(taxid: string) {
    return base.get(`/taxons/${taxid}/children`)
  }
  getTaxonStats(taxid: string) {
    return base.get(`/taxons/${taxid}/stats`)
  }
  getTaxonCoordinates(taxid: string) {
    return base.get(`/taxons/${taxid}/coordinates`)
  }
  getTaxons(params: Record<string, any>) {
    return base.get('/taxons', { params: params })
  }
  getTree(node: string, params: Record<string, any>) {
    return base.get(`/tree/${node}`, { params: params })
  }
  getPhylogeneticallyCloseTree(taxid: string) {
    return base.get(`/taxons/${taxid}/lookup`)
  }
  getComputedTree() {
    return base.get('/tree')
  }
  getAncestors(taxid: string) {
    return base.get(`/taxons/${taxid}/ancestors`)
  }
}

export default new TaxonService()
