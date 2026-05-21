import type { EnvironmentId } from '@/lib/utils'
import RainyScene    from './RainyScene'
import LibraryScene  from './LibraryScene'
import CodingDenScene from './CodingDenScene'
import NatureScene   from './NatureScene'

export default function AmbientScene({ environment }: { environment: string }) {
  const id = environment as EnvironmentId
  if (id === 'rainy-cafe')  return <RainyScene />
  if (id === 'library')     return <LibraryScene />
  if (id === 'coding-den')  return <CodingDenScene />
  if (id === 'nature')      return <NatureScene />
  return <RainyScene />
}
