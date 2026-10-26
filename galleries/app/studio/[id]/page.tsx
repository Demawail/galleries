import GalleryApp from '@/components/gallery-app';
export default async function StudioPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <GalleryApp initialView="studio" initialGalleryId={id}/>}
