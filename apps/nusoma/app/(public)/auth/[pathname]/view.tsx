'use client'

import { AuthCard } from '@daveyplate/better-auth-ui'
import { Card, CardContent } from '@nusoma/design-system/components/ui/card'
import Image from 'next/image'

export function AuthView({ pathname }: { pathname: string }) {
  return (
    <div className={'flex flex-col gap-6'}>
      <Card className='overflow-hidden'>
        <CardContent className='grid p-0 md:grid-cols-2'>
          <AuthCard
            pathname={pathname}
            classNames={{
              base: 'border-none rounded-none px-4 py-8',
            }}
          />
          <div className='relative hidden bg-muted md:block'>
            <Image
              src='/auth-image.png'
              alt='Image'
              className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
              width={1000}
              height={1000}
            />
          </div>
        </CardContent>
      </Card>
      <div className='text-balance text-center text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary'>
        By clicking continue, you agree to our{' '}
        <a href='https://www.nusoma.app/terms-of-service'>Terms of Service</a> and{' '}
        <a href='https://www.nusoma.app/privacy-policy'>Privacy Policy</a>.
      </div>
    </div>
  )
}
