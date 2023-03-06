import http from '../../http-axios'

const ncbi = http.ncbi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/

class NCBIClientService {
  getAssembly(accession) {
    return ncbi.get(`/genome/accession/${accession}`)
  }

  getAssembliesByBioProject(accession) {
    return ncbi.post('/genome', { bioprojects: { accessions: [accession] }, page_size: 1000 })
  }
}

export default new NCBIClientService()
