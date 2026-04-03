import Link from 'next/link'
import { Dna } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UnauthorizedPage() {
   return (
      <div className="flex min-h-screen flex-col bg-background">
         <header className="border-b border-border bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center px-4">
               <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                     <Dna className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Portal
               </Link>
            </div>
         </header>
         <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-md text-center shadow-md">
               <CardHeader>
                  <CardTitle>Not authorized</CardTitle>
                  <CardDescription>You do not have permission to view this page.</CardDescription>
               </CardHeader>
               <CardContent>
                  <Button asChild variant="default">
                     <Link href="/">Back to home</Link>
                  </Button>
               </CardContent>
            </Card>
         </div>
      </div>
   )
}
