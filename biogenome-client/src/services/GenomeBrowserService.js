import http from "../http-axios"

const base = http.base

const submission = http.submission

class GenomeBrowserService {

    getGenomeBrowserData(params){
        return base.get('/genome_browser', {params:params})
    }

    getGenomeBrowserDatum(accession){
        return base.get(`/genome_browser/${accession}`)
    }

    createGenomeBrowserData(formData){
        return submission.post('/genome_browser',formData)
    }

    updateGenomeBrowserData(accession, formData){
        return submission.put(`/genome_browser/${accession}`,formData)
    }
    
    deleteGenomeBrowserData(accession){
        return submission.delete(`/genome_browser/${accession}`)
    }
}

export default new GenomeBrowserService();


  