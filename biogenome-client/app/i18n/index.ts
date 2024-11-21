import { createI18n } from 'vue-i18n'
import config from '../../configs/general.json'

const fileNameToLocaleModuleDict = import.meta.globEager('./locales/*.json')



const messages: { [P: string]: Record<string, string> } = {}
Object.entries(fileNameToLocaleModuleDict)
  .map(([fileName, localeModule]) => {
    const fileNameParts = fileName.split('/')
    const fileNameWithoutPath = fileNameParts[fileNameParts.length - 1]
    const localeName = fileNameWithoutPath.split('.json')[0]

    return [localeName, localeModule.default]
  })
  .forEach((localeNameLocaleMessagesTuple) => {
    messages[localeNameLocaleMessagesTuple[0]] = localeNameLocaleMessagesTuple[1]
  })

const browserLanguage = navigator.language || 'gb';

let locale = browserLanguage.split('-')[0]; // Default to language code, e.g., 'es'

// If the browser language is 'es-CT', use 'es-ct'
if (browserLanguage.toLowerCase() === 'es-ct' || browserLanguage.toLocaleLowerCase() === 'ca') {
  locale = 'es-ct';
}
// Check if locale is supported; if not, fall back to 'en'
const supportedLocales = config.languages.map(l => l.code)

if (!supportedLocales.includes(locale)) {
  locale = 'gb';
}
export default createI18n({
  legacy: false,
  locale: locale,
  fallbackLocale: 'gb',
  messages,
})
