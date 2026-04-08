/**
 * Vendored from GMOD jbrowse-components (missing from some npm packs of @jbrowse/react-linear-genome-view2):
 * https://github.com/GMOD/jbrowse-components/blob/main/products/jbrowse-react-linear-genome-view/src/workerPolyfill.js
 */
// eslint-disable-next-line no-undef -- Web Worker global
self.window = {
   addEventListener() {},
   fetch: self.fetch.bind(self),
   location: self.location,
   Date: self.Date,
   removeEventListener() {},
   requestIdleCallback: (cb) => {
      cb()
   },
   cancelIdleCallback: () => {},
   requestAnimationFrame: (cb) => {
      cb()
   },
   cancelAnimationFrame: () => {},
   navigator: {},
}
// eslint-disable-next-line no-undef
self.document = {
   createTextNode() {},
   addEventListener() {},
   querySelector() {
      return { appendChild() {} }
   },
   documentElement: {},
   querySelectorAll: () => [],
   createElement() {
      return {
         style: {},
         setAttribute() {},
         removeAttribute() {},
         appendChild() {},
      }
   },
}
