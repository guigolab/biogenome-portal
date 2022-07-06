import http from "../http-axios"

const base = http.base

class TaxonomyService {

    getTree(node, maxLeaves){
        return base.get(`/tree/${node}`,{
            params: {maxLeaves:maxLeaves}
        });    
    }
    getTaxonChildren(name) {
        return base.get(`/taxons/${name}`)
    }

}

export default new TaxonomyService();


  