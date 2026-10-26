import {Heart,MessageCircle,Send,Bookmark,MoreHorizontal,ThumbsUp,Repeat2,Globe,Search,Home,Users,Briefcase} from 'lucide-react';

type Props={platform:'instagram'|'linkedin';url:string;filename:string;client:string;x:number;y:number};
export function SocialContext({platform,url,filename,client,x,y}:Props){
 const instagram=platform==='instagram';
 const name=client||'Your brand';
 const initials=name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 const handle=name.toLowerCase().replace(/[^a-z0-9._]/g,'')||'yourbrand';
 return <section className={`social-context ${instagram?'instagram-feed':'linkedin-feed'}`} aria-label={instagram?'Instagram feed preview':'LinkedIn promoted post preview'}>
  <div className="social-platform-bar" aria-hidden="true">{instagram?<><strong className="instagram-wordmark">Instagram</strong><div><Heart size={21}/><Send size={21}/></div></>:<><strong className="linkedin-wordmark">in</strong><div className="linkedin-search"><Search size={15}/><span>Search</span></div><div><Home size={20}/><Users size={20}/><Briefcase size={20}/></div></>}</div>
  <div className="social-preview-label">{instagram?'SOCIAL · INSTAGRAM FEED':'AD · LINKEDIN PROMOTED POST'}<span>Preview</span></div>
  <article className="social-post">
   <header className="social-post-header"><span className="social-avatar" aria-hidden="true">{initials}</span><div><strong>{instagram?handle:name}</strong><span>{instagram?'Photo':<>Promoted · <Globe size={12}/></>}</span></div><MoreHorizontal size={22} aria-hidden="true"/></header>
   {!instagram&&<p className="social-post-copy">Your campaign message goes here.</p>}
   <img className="social-post-photo" src={url} alt={`${filename} in ${instagram?'an Instagram feed':'a LinkedIn promoted post'}`} style={{objectPosition:`${x}% ${y}%`}}/>
   {instagram?<><div className="instagram-actions" aria-hidden="true"><Heart/><MessageCircle/><Send/><Bookmark/></div><p className="social-post-copy"><strong>{handle}</strong> Your caption goes here.</p><div className="social-muted">View comments</div><div className="instagram-comment">Add a comment…</div></>:<><div className="linkedin-landing"><div><strong>Your campaign headline</strong><span>yourwebsite.com</span></div><span className="linkedin-cta">Learn more</span></div><div className="linkedin-actions" aria-hidden="true"><span><ThumbsUp size={19}/>Like</span><span><MessageCircle size={19}/>Comment</span><span><Repeat2 size={19}/>Repost</span><span><Send size={19}/>Send</span></div></>}
  </article>
 </section>
}
