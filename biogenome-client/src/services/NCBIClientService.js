import http from "../http-axios"


const ncbi = http.ncbi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/

class NCBIClientService {
  
  getAssembly(accession){
    return ncbi.get(`/genome/accession/${accession}`)
  }

}

export default new NCBIClientService();