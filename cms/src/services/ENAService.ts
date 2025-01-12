import { ena } from '../http-axios';

/// ENA portal API client service
/// See https://www.ebi.ac.uk/ena/portal/api/#/
class ENAClientService {
    getTaxon(taxonId: string) {
        return ena.get(
            `/ena/portal/api/search?result=taxon&query=tax_id%3D${taxonId}&limit=10&format=json`
        );
    }
}

export default new ENAClientService();
