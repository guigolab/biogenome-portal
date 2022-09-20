import http from "../http-axios"

const base = http.base

class DataPortalService {

    getOrganisms(params) {
        return base.get("/organisms", {
        params: params
        })
    }
    getOrganism(taxid) {
        return base.get(`/organisms/${taxid}`)
    }
    getOrganismStats(params){
        return base.get('/organisms/statistics',{params:params})
    }
    getNodeCoordinates(params){
        return base.get('/coordinates/node',{params:params}) 
    }
    getBioProjectChildren(accession){
        return base.get(`/bioprojects/${accession}`)
    }
    searchBioprojects(params){
        return base.get('/bioprojects',{params:params})
    }
    getCoordinates(coordinates) {
        return base.post('/coordinates', coordinates)
    }
    getTree(node){
        return base.get(`/tree/${node}`);    
    }
    getTaxonChildren(name) {
        return base.get(`/taxons/${name}`)
    }
    searchTaxons(params){
        return base.get('/taxons',{params:params})
    }
    getData(model,taxid){
        return base.get(`/data/${model}`, {params:{taxid:taxid}})
    }
    getStats(){
        return base.get('/stats')
    }
    generateTree(taxids){
        return base.post('/tree', taxids)
    }
}

export default new DataPortalService();


  