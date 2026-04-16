import { HomePage } from '@/components/home-page'

/** Tab title uses root `generateMetadata` default: `portalSiteTitle` from baked `portal.json` (`general.title`). */
/** Home route: hero title highlight, stats, features, and footer content come from `portal.json` (`general.titleHighlight`, `footer`). */
export default function Page() {
   return <HomePage />
}
