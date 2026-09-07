export type {
   AppConfig,
   CmsOrganismFieldWire,
   ConfigModel,
   DataModels,
   GeneralConfig,
   OrganismCustomFieldType,
   OrganismFormStepDef,
   PortalCatalogModelWire,
   PortalConfig,
   PortalFooterWire,
   PortalModelsWire,
   PortalTheme,
} from './types'
export { dataModels } from './types'
export {
   fetchPortalConfig,
   normalizePortalConfig,
   resolveOrganismCustomFields,
   resolveOrganismFormSteps,
   resolvePortalUiMode,
} from './portalConfig'
export type { PortalAppearanceMode } from './portalConfig'
export { normalizeUiColors } from './uiColors'
export { taxonNodeToPortalStats, type PortalStatRow } from './taxonNodeStats'
export {
   applyPortalThemeToDocument,
   clearPortalThemeInlineStyles,
   pickBrandHexes,
   portalThemeStyleProps,
} from './themeApply'
export {
   leafletMarkerPalettesFromRoot,
   resolveCssVarToRgb,
   type BrandCssVarName,
   type LeafletCircleMarkerStyle,
} from './brandColorsFromDocument'
export { showCmsLoginNav, showCountriesUi, showGoatStatusPage, showMap } from './portalFeatures'
export { navRouteIcons, type NavRouteIconKey } from './navRouteIcons'

import defaultPortal from './defaultPortal.json'
export const defaultPortalConfig = defaultPortal as import('./types').PortalConfig
