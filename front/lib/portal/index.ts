export type {
   AppConfig,
   ConfigModel,
   DataModels,
   GeneralConfig,
   OrganismFormStepDef,
   PortalConfig,
   PortalTheme,
} from './types'
export { dataModels } from './types'
export {
   DEFAULT_VUESTIC_UI_BASE,
   fetchPortalConfig,
   getPortalAppearance,
   normalizeModelsForApp,
   normalizePortalConfig,
   portalJsonUrl,
   resolveOrganismFormSteps,
} from './portalConfig'
export { normalizeUiColors } from './uiColors'
export { taxonNodeToPortalStats, type PortalStatRow } from './taxonNodeStats'
export {
   applyPortalThemeToDocument,
   clearPortalThemeInlineStyles,
   portalThemeStyleProps,
} from './themeApply'
export { showMap, showProgress } from './portalFeatures'

import defaultPortal from './defaultPortal.json'
export const defaultPortalConfig = defaultPortal as import('./types').PortalConfig
