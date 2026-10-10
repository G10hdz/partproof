'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveAction, rejectAction } from '@/app/actions';
export default function ApproveButtons({id,disabled,rejectDisabled=false,reason,compact=false}:{id:string;disabled:boolean;rejectDisabled?:boolean;reason?:string|null;compact?:boolean}){
  const [pending,start]=useTransition();const [message,setMessage]=useState('');const router=useRouter();
  function perform(approve:boolean){start(async()=>{setMessage('');try{const result=await(approve?approveAction(id):rejectAction(id));setMessage(result.message);router.refresh();}catch{setMessage('No se pudo confirmar el resultado. Revisa la propuesta antes de reintentar.');}});}
  return <div className="approval-controls">{reason&&<p className="notice-text">{reason}</p>}<div className="actions"><button className={compact?'accent':'primary'} disabled={disabled||pending} onClick={()=>perform(true)}>{pending?'Procesando…':compact?'Aprobar':'Aprobar y pagar'}</button><button className="secondary" disabled={rejectDisabled||pending} onClick={()=>perform(false)}>Rechazar</button></div>{message&&<p role="status" className="notice-text">{message}</p>}</div>;
}
