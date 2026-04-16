'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, ImageIcon } from 'lucide-react'
import type { OrganismImageSlide } from '@/lib/species-detail-from-organism'
import { cn } from '@/lib/utils'

type Props = {
  images: OrganismImageSlide[]
  title: string
  /** Species detail: fill card, cover image, attribution in bottom overlay. */
  compact?: boolean
  className?: string
}

export function OrganismImagesCarousel({ images, title, compact, className }: Props) {
  if (images.length === 0) return null

  return (
    <Card
      className={cn(
        'overflow-hidden',
        compact ? 'mb-0 flex h-full min-h-0 flex-col' : 'mb-6',
        className,
      )}
    >
      <CardHeader className={cn('shrink-0', compact ? 'pb-2' : 'pb-2')}>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" aria-hidden />
          Images
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          compact ? 'p-0 pb-0 pt-0 px-0' : 'pb-6',
          !compact && 'px-6',
        )}
      >
        <Carousel
          className={cn('relative w-full', compact && 'flex min-h-[min(22rem,50vh)] flex-1 flex-col')}
          opts={{ align: 'start', loop: images.length > 1 }}
        >
          <CarouselContent className={cn(compact && '!ml-0')}>
            {images.map((img, index) => (
              <CarouselItem key={`${img.url}-${index}`} className={cn(compact && '!pl-0')}>
                {compact ? (
                  <figure className="relative flex h-[min(22rem,50vh)] w-full flex-col overflow-hidden rounded-lg border border-border bg-muted/80">
                    <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote organism URLs; config may omit remotePatterns */}
                      <img
                        src={img.url}
                        alt={`${title} — image ${index + 1} of ${images.length}`}
                        className="max-h-full max-w-full object-contain object-center"
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                    <figcaption className="shrink-0 border-t border-border/60 bg-gradient-to-t from-black/90 via-black/75 to-black/40 px-3 py-2.5 text-xs text-white">
                      <div className="space-y-1.5">
                        {img.author ? (
                          <p>
                            <span className="font-semibold text-white/90">Credit: </span>
                            {img.author}
                          </p>
                        ) : null}
                        <p>
                          <span className="font-semibold text-white/90">License: </span>
                          {img.licenseUrl ? (
                            <a
                              href={img.licenseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                            >
                              {img.license}
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                            </a>
                          ) : (
                            img.license
                          )}
                        </p>
                        {img.sourceRecordUrl ? (
                          <p>
                            <a
                              href={img.sourceRecordUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                            >
                              Source record
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                            </a>
                          </p>
                        ) : null}
                      </div>
                    </figcaption>
                  </figure>
                ) : (
                  <figure className="space-y-4">
                    <div className="relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote organism URLs; config may omit remotePatterns */}
                      <img
                        src={img.url}
                        alt={`${title} — image ${index + 1} of ${images.length}`}
                        className="max-h-[min(32rem,60dvh)] w-auto max-w-full object-contain object-center"
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                    <figcaption className="space-y-2 text-sm text-muted-foreground">
                      {img.author ? (
                        <p>
                          <span className="font-medium text-foreground">Credit: </span>
                          {img.author}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-medium text-foreground">License: </span>
                        {img.licenseUrl ? (
                          <a
                            href={img.licenseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                          >
                            {img.license}
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          </a>
                        ) : (
                          img.license
                        )}
                      </p>
                      {img.sourceRecordUrl ? (
                        <p>
                          <a
                            href={img.sourceRecordUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                          >
                            Source record
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          </a>
                        </p>
                      ) : null}
                    </figcaption>
                  </figure>
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 ? (
            <>
              <CarouselPrevious className="left-2 top-1/2 z-10 -translate-y-1/2" />
              <CarouselNext className="right-2 top-1/2 z-10 -translate-y-1/2" />
            </>
          ) : null}
        </Carousel>
      </CardContent>
    </Card>
  )
}
