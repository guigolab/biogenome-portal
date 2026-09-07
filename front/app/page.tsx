import { HomePage } from '@/components/home-page'

/** Tab title uses root `generateMetadata` default: `portalSiteTitle` from `loadPortalConfig()` (`general.title`). */
/** Home route: hero title highlight, stats, features, and footer content come from portal config (`general.titleHighlight`, `footer`). */
export default function Page() {
   return <HomePage />
}
