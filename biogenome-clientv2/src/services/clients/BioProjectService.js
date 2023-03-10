import http from '../../http-axios'

const base = http.base

class BioProjectService {
  getBioProject(accession) {
    return base.get(`/bioprojects/${accession}`)
  }
  getBioProjectCoordinates(accession) {
    return base.get(`/bioprojects/${accession}/coordinates`)
  }
  getBioprojects(params) {
    return base.get('/bioprojects', { params: params })
  }
  searchBioproject(params) {
    return base.get('/bioprojects', { params: params })
  }
  getBioprojectChildren(accession) {
    return base.get(`/bioprojects/${accession}/children`)
  }
  getBioprojectCountries(accession) {
    return base.get(`/bioprojects/${accession}/countries`)
  }
  getBioprojectINSDCStats(accession) {
    return base.get(`/bioprojects/${accession}/insdc`)
  }
}

export default new BioProjectService()
