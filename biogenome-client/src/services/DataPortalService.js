import http from "../http-axios"

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
    getStats(){
        return base.get('/statistics')
    }
    getBioProjectChildren(accession){
        return base.get(`/bioprojects/${accession}`)
    }
    getCoordinatesBySampleIds(ids,){
        return base.post('/coordinates',ids)
    }
    getCoordinates(coordinates) {
        return base.get(`/coordinates/${coordinates}`)
    }
    getAllCoordinates(params) {
        if(params){
        return base.get('/coordinates',{
            params: params
            })
        }
        return base.get('/coordinates')
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


  