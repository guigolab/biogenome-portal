import http from "../utils/http-axios"

const base = http.base

class DataPortalService {

    getOrganisms(params) {
        return base.get("/root_organisms", {
        params: params
        })
    }
    getFilteredOrganisms(params){
        return base.get("/root_organisms/search", {
        params: params
        })
    }
    getOrganism(name) {
        return base.get(`/root_organisms/${name}`)
    }
    getSample(accession) {
        return base.get(`/organisms/${accession}`)
    }
    getGeoLocSamples(ids) {
        return base.get('/coordinates', {params:{ids:ids}})
    }
    getTree(node, maxLeaves){
        return base.get(`/tree/${node}`,{
            params: {maxLeaves:maxLeaves}
        });    
    }
    getTaxonChildren(name) {
        return base.get(`/taxons/${name}`)
    }
    getData(model,ids){
        return base.post(`/data/${model}`, ids)
    }
}

export default new DataPortalService();


  