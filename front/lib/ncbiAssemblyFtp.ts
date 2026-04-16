/**
 * Mirror of `server/clients/ncbi_assembly_http._ncbi_ftp_path_from_accession` — directory path under /genomes/all.
 */

const NCBI_HTTP_BASE = 'https://ftp.ncbi.nlm.nih.gov'
const NCBI_GENOMES_ALL = '/genomes/all'

export function ncbiGenomesAllPathFromAccession(accession: string): string | null {
   const s = accession.trim()
   const m = /^(GCA|GCF)_(\d+)(?:\.(\d+))?$/i.exec(s)
   if (!m) return null
   const prefix = m[1].toUpperCase()
   const rest = m[2].padStart(9, '0').slice(0, 9)
   if (rest.length !== 9 || !/^\d{9}$/.test(rest)) return null
   const d1 = rest.slice(0, 3)
   const d2 = rest.slice(3, 6)
   const d3 = rest.slice(6, 9)
   return `${NCBI_GENOMES_ALL}/${prefix}/${d1}/${d2}/${d3}`
}

/** HTTPS URL to the parent directory on NCBI FTP (listing HTML); user picks the assembly subfolder. */
export function ncbiGenomesAllDirectoryUrl(accession: string): string | null {
   const path = ncbiGenomesAllPathFromAccession(accession)
   if (!path) return null
   return `${NCBI_HTTP_BASE}${path}/`
}

/** NCBI Datasets genome page — download options and metadata. */
export function ncbiDatasetsGenomeUrl(accession: string): string {
   return `https://www.ncbi.nlm.nih.gov/datasets/genome/${encodeURIComponent(accession.trim())}/`
}
