export function text(v:unknown,max=12000){if(typeof v!=='string'||v.length>max)throw Error('Please use valid text within the field limit.');return v.trim()}
export function validateReading(a:any){
 const provider=text(a.provider,50);if(!['Cloudflare','ChatGPT Sites'].includes(provider))throw Error('Choose a provider.');
 const account=text(a.account,100),period=text(a.period,7),observed=text(a.observed,10),sites=text(a.sites,1000);
 if(!account||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||!/^\d{4}-\d{2}-\d{2}$/.test(observed)||new Date(observed+'T12:00Z').toISOString().slice(0,10)!==observed)throw Error('Enter the account, billing month and observation date.');
 const cost=a.cost===''||a.cost===null?null:Number(a.cost);if(cost!==null&&(!Number.isFinite(cost)||cost<0))throw Error('Enter a non-negative USD cost.');
 if(!Array.isArray(a.metrics)||a.metrics.length>12)throw Error('Use up to 12 usage metrics.');
 const metrics=a.metrics.map((m:any)=>{const name=text(m.name,80),unit=text(m.unit,40),used=Number(m.used),limit=m.limit===''||m.limit===null?null:Number(m.limit);if(!name||!unit||m.used===''||!Number.isFinite(used)||used<0||limit!==null&&(!Number.isFinite(limit)||limit<=0))throw Error('Enter a metric name, unit, usage and a positive allowance, or leave allowance blank.');return {name,unit,used,limit}});
 return {provider,account,period,observed,sites,cost,metrics,source:text(a.source,500)};
}
export function allowance(used:number,limit:number|null){return limit===null?null:{percent:used/limit*100,remaining:Math.max(0,limit-used),over:Math.max(0,used-limit)}};
