'use client';
import {useEffect,useState} from 'react';


export function PinAllowance({allowance,disabled,onSave}:{allowance:number;disabled:boolean;onSave:(allowance:number)=>Promise<boolean>}){
 const [value,setValue]=useState(String(allowance));
 useEffect(()=>setValue(String(allowance)),[allowance]);
 const n=Number(value),valid=Number.isSafeInteger(n)&&n>=1;
 return <form className="pin-allowance" onSubmit={async e=>{e.preventDefault();if(valid&&!disabled)await onSave(n)}}>
  <label>Total client pins<input aria-label="Total shared client pins" type="number" min={1} step="1" required value={value} onChange={e=>setValue(e.target.value)} disabled={disabled}/></label>
  <button className="btn" type="submit" disabled={disabled||!valid||n===allowance}>Save</button>
 </form>;
}
