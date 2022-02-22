import http from "../utils/http-axios";


const ena = http.ena.enaApi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/
class ENAClientService {
  
  getTaxon(taxonId) {
    return ena.get(`/ena/portal/api/links/taxon?accession=${taxonId}&format=JSON&result=taxon`)
  }
}

export default new ENAClientService();
