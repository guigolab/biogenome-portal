import { wikipedia } from '../http-axios'

class WikipediaService {
    getContent(lang: string, name: string) {
        return wikipedia(lang).get(`/${name}`)
    }
}

export default new WikipediaService()
