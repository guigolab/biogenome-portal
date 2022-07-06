import http from "../../http-axios"


const ena = http.ena.enaApi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/
class ENAClientService {
  
  getTaxon(taxonId) {
    return ena.get(`/ena/portal/api/links/taxon?accession=${taxonId}&format=JSON&result=taxon`)
  }
  getBioSample(accession){
    return ena.get(`/biosamples/samples?size=1000&filter=acc:${accession}`)
  }
  getAssembly(accession){
    return ena.get(`/biosamples/samples?size=1000&filter=acc:${accession}`)
  }
}

export default new ENAClientService();
