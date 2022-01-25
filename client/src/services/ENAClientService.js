import http from "../http-common";


const ena = http.ena.enaApi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/
class ENAClientService {

  getENADataByUrl(params) {
    return ena.get('/ena/portal/api/search', {
        params: params
      })
  }
  getEnaRecord(accession) {
    return ena.get(`/ena/browser/api/xml/${accession}?download=true`)
  }
  getTaxon(taxonId) {
    return ena.get(`/ena/browser/api/xml/${taxonId}`)
  }
}

export default new ENAClientService();
