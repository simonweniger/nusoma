import { cn } from '@nusoma/design-system/lib/utils'
import Link from 'next/link'
import { IoMenuSharp } from 'react-icons/io5'
import { Icons } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { siteConfig } from '@/lib/config'

export function MobileDrawer() {
  return (
    <Drawer>
      <DrawerTrigger>
        <IoMenuSharp className='text-2xl' />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className='px-6'>
          <Link href='/' title='brand-logo' className='relative mr-6 flex items-center space-x-2'>
            <Icons.logo className='h-[40px] w-auto' />
            <DrawerTitle>{siteConfig.name}</DrawerTitle>
          </Link>
          <DrawerDescription>{siteConfig.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Link
            href='#'
            className={cn(buttonVariants({ variant: 'default' }), 'group rounded-full text-white')}
          >
            {siteConfig.cta}
          </Link>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
