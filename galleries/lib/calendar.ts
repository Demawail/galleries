const escapeText=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=(ms:number)=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line:string){let result='',bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){result+='\r\n ';bytes=1}result+=char;bytes+=n}return result}
export function closingCalendar(g:{id:string;title:string;expires:string;status:string},url:string,now=Date.now()){
 const end=Date.parse(g.expires);
 if(g.status!=='live'||!Number.isFinite(end)||end-now<=86400000)throw Error('A one-day reminder needs a live gallery closing more than 24 hours from now.');
 const description=`Review your photographs and download your choices before this gallery closes.\n${url}\nIf the closing date changes, update this event in your calendar.`;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Your Studio//Gallery reminders//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:closing-${encodeURIComponent(g.id)}@galleries.example.invalid`,`DTSTAMP:${utc(now)}`,`DTSTART:${utc(end)}`,`SUMMARY:${escapeText(g.title+' — gallery closes')}`,`DESCRIPTION:${escapeText(description)}`,`URL:${url}`,'TRANSP:TRANSPARENT','CLASS:PRIVATE','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-P1D',`DESCRIPTION:${escapeText(g.title+' closes in one day. Review and download your photographs.')}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
