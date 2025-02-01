import { ncbi } from '../http-axios';

/// ENA portal API client service
/// See https://www.ebi.ac.uk/ena/portal/api/#/
class NCBIService {
    getTaxon(taxonId: string) {
        return ncbi.get(
            `taxonomy/taxon_suggest/${taxonId}`
        );
    }
}

export default new NCBIService();
