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
    getCoordinatesBySampleIds(ids,){
        return base.post('/coordinates',ids)
    }
    getCoordinates(coordinates) {
        return base.post('coordinates', coordinates)
    }
    getAllCoordinates(params) {
        if(params){
        return base.get('/coordinates',{
            params: params
            })
        }
        return base.get('/coordinates')
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
    getTaxonomyTree(taxid){
        return base.get(`/taxonomy_tree/${taxid}`)
    }
    getStats(){
        return base.get('/stats')
    }
    getTaxonCoordinates(taxid){
        return base.get(`/coordinates/taxons/${taxid}`)
    }
    getOrganismCoordinates(taxid){
        return base.get(`/coordinates/organisms/${taxid}`)
    }
    getProjectCoordinates(accession){
        return base.get(`/coordinates/bioprojects/${accession}`)
    }
    generateTree(taxids){
        return base.post('/tree', taxids)
    }
    getLevels(taxid){
        if(taxid){
            return base.get(`/tree_levels/${taxid}`)
        }else{
            return base.get('/tree_levels')
        }
    }

}

export default new DataPortalService();


  