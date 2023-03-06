import http from '../../http-axios'

const ena = http.ena.enaApi
///ENA portal API client service
///see https://www.ebi.ac.uk/ena/portal/api/#/
class ENAClientService {
  getTaxon(taxonId) {
    return ena.get(`/ena/portal/api/links/taxon?accession=${taxonId}&format=JSON&result=taxon`)
  }

  getBioProjectXML(accession) {
    return ena.get(`ena/browser/api/xml/${accession}`)
  }

  getBioSample(accession) {
    return ena.get(`/biosamples/samples?size=10&filter=acc:${accession}`)
  }

  getRead(accession) {
    return ena.get(
      `https://www.ebi.ac.uk/ena/portal/api/filereport?result=read_run&accession=${accession}&offset=0&limit=1000&format=json&fields=study_accession,secondary_study_accession,sample_accession,secondary_sample_accession,experiment_accession,run_accession,submission_accession,tax_id,scientific_name,instrument_platform,instrument_model,library_name`,
    )
  }
}

export default new ENAClientService()
