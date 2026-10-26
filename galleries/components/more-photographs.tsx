'use client';
import {useEffect,useRef} from 'react';
export function MorePhotographs({shown,total,onMore}:{shown:number;total:number;onMore:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(shown>=total||!ref.current||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))onMore()},{rootMargin:'500px'});observer.observe(ref.current);return()=>observer.disconnect()},[shown,total,onMore]);
 return <div ref={ref} className="more-photographs"><span>{Math.min(shown,total)} of {total} photographs</span>{shown<total&&<button className="btn" onClick={onMore}>Load more photographs</button>}</div>;
}
