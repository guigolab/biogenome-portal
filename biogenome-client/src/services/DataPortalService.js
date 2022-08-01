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
    searchBioprojects(params){
        return base.get('/bioprojects',{params:params})
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
    searchTaxons(params){
        return base.get('/taxons',{params:params})
    }
    getAssemblies(params){
        return base.get('/assemblies', {params:params})
    }
    getAssembly(accession){
        return base.get(`/assemblies/${accession}`)
    }
    getAnnotations(params){
        return base.get('/annotations', {params:params})
    }
    getBioSamples(params){
        return base.get('/biosamples', {params:params})
    }
    getBioSample(accession){
        return base.get(`/biosamples/${accession}`)
    }
    getLocalSamples(params){
        return base.get('/local_samples', {params:params})
    }
    getReads(params){
        return base.get('/reads', {params:params})
    }
    getRead(accession){
        return base.get(`/reads/${accession}`)
    }
    getData(model,taxid){
        return base.get(`/data/${model}`, {params:{taxid:taxid}})
    }
    getLastCreated(model){
        return base.get(`/data/${model}`)
    }
}

export default new DataPortalService();


  