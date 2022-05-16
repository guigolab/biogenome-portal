import http from "../utils/http-axios"

const base = http.base

class DataPortalService {

    getOrganisms(params) {
        return base.get("/root_organisms", {
        params: params
        })
    }
    getOrganism(name) {
        return base.get(`/root_organisms/${name}`)
    }
    getSamples(accession) {
        if(accession){
            return base.get(`/organisms/${accession}`)
        }
    }
    getRootProjectChildren(){
        return base.get('/bioprojects')
    }
    getCoordinatesBySampleIds(ids,){
        return base.post('/coordinates',ids)
    }
    getAllCoordinates(params) {
        return base.get('/coordinates',{
            params: params
            })
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
    getLastCreated(model){
        return base.get(`/data/${model}`)
    }
}

export default new DataPortalService();


  