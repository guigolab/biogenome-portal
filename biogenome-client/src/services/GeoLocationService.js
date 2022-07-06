import http from "../http-axios"

const base = http.base

class GeoLocationService {

    getCoordinatesBySampleIds(ids,){
        return base.post('/coordinates',ids)
    }
    getCoordinates(coordinates) {
        return base.get(`/coordinates/${coordinates}`)
    }
    getAllCoordinates(params) {
        if(params){
        return base.get('/coordinates',{
            params: params
            })
        }
        return base.get('/coordinates')
    }
}

export default new GeoLocationService();


  