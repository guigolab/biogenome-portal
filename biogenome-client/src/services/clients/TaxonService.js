import http from '../../http-axios'

const base = http.base

class TaxonService {
  getTaxon(taxid) {
    return base.get(`/taxons/${taxid}`)
  }
  getTaxonStats(taxid) {
    return base.get(`/taxons/${taxid}/stats`)
  }
  getTaxonCoordinates(taxid) {
    return base.get(`/taxons/${taxid}/coordinates`)
  }
  getTaxons(params) {
    return base.get('/taxons', { params: params })
  }
  getTree(node, params) {
    return base.get(`/tree/${node}`, { params: params })
  }
  getTaxonChildren(taxid) {
    return base.get(`/taxons/${taxid}/children`)
  }
  getPhylogeneticallyCloseTree(taxid){
    return base.get(`/taxons/${taxid}/lookup`)
  }
  getComputedTree(){
    return base.get('/computed_tree')
  }
}

export default new TaxonService()
