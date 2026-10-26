import GalleryApp from '@/components/gallery-app';
export default async function GalleryPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <GalleryApp initialView="gallery" initialGalleryId={id}/>}
