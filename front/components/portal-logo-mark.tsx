import { cn } from '@/lib/utils'

/** Inline mark so theme `text-primary` applies (external `<img src="…svg">` does not load Tailwind classes from the file). */
export function PortalLogoMark({ className }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 40 40"
         fill="none"
         xmlns="http://www.w3.org/2000/svg"
         aria-hidden
         className={cn('shrink-0', className)}
      >
         <rect width="40" height="40" rx="10" className="fill-primary/20" />
         <path
            fill="currentColor"
            className="text-primary"
            d="M20 10c-3.5 0-6.5 2.2-7.6 5.3-.4 1.2-.6 2.5-.6 3.7 0 2.8 1.2 5.3 3 7.1-1.8 1.8-3 4.3-3 7.1 0 1.2.2 2.5.6 3.7 1.1 3.1 4.1 5.3 7.6 5.3s6.5-2.2 7.6-5.3c.4-1.2.6-2.5.6-3.7 0-2.8-1.2-5.3-3-7.1 1.8-1.8 3-4.3 3-7.1 0-1.2-.2-2.5-.6-3.7-1.1-3.1-4.1-5.3-7.6-5.3zm0 3.2c1.9 0 3.5 1.1 4.2 2.7-.7.3-1.4.5-2.2.5-2.4 0-4.3-1.9-4.3-4.3 0-.3 0-.6.1-.9.7-.6 1.6-1 2.2-1zm-4.5 2.5c0 3.9 3.2 7.1 7.1 7.1.8 0 1.5-.1 2.2-.4.7 1.6.4 3.6-1 5-1.4 1.4-3.4 1.7-5 1-1.6-2.2-2.5-4.9-2.5-7.7 0-1.7.3-3.4.7-5zm9.4 8.6c.3 2.8-.5 5.5-2.2 7.7-1.6.7-3.6.4-5-1-1.4-1.4-1.7-3.4-1-5 .7-.3 1.4-.4 2.2-.4 2.1 0 4 1.1 5 2.7z"
         />
      </svg>
   )
}
