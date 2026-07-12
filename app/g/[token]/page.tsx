import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { ClientGallery } from '@/components/client-gallery'
import { getSharedGallery } from '@/lib/gallery'
import { validShareSession } from '@/lib/share-auth'

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const gallery = await getSharedGallery(token).catch(() => null)
  if (!gallery) notFound()
  const cookieStore = await cookies()
  const session = cookieStore.get(`lumen_share_${token.slice(0, 12)}`)?.value
  return <ClientGallery gallery={gallery} token={token} unlocked={!gallery.passwordProtected || validShareSession(token, session)} />
}
