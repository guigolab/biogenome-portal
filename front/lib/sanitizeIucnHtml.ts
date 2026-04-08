/** Minimal mitigation before rendering IUCN HTML fragments (trusted-ish API, but strip active content). */
export function sanitizeIucnHtmlFragment(html: string): string {
   let s = html
   s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '')
   s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '')
   s = s.replace(/\s(on\w+|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
   return s
}
