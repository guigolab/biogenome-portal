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

type Props = {
  images: OrganismImageSlide[]
  title: string
}

export function OrganismImagesCarousel({ images, title }: Props) {
  if (images.length === 0) return null

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" aria-hidden />
          Images
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <Carousel
          className="relative w-full"
          opts={{ align: 'start', loop: images.length > 1 }}
        >
          <CarouselContent>
            {images.map((img, index) => (
              <CarouselItem key={`${img.url}-${index}`}>
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
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 ? (
            <>
              <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2" />
              <CarouselNext className="right-2 top-1/2 -translate-y-1/2" />
            </>
          ) : null}
        </Carousel>
      </CardContent>
    </Card>
  )
}
