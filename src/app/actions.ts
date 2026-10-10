'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { approveAndPay, rejectProposal } from '@/lib/approve';
import { approvalBlockReason, pendingIntegration, proposalById, proposalContext } from '@/lib/queries';
const idSchema=z.string().trim().min(1).max(100);
function refresh(id:string){for(const path of ['/', '/proposals','/ledger','/mcp-log','/watch',`/proposals/${id}`,`/watch/${id}`])revalidatePath(path);}
export async function approveAction(id:string){
  const parsed=idSchema.safeParse(id);
  if(!parsed.success)return {ok:false,message:'Solicitud inválida.'};
  const db=getDb();const p=proposalById(db,parsed.data);
  if(!p)return {ok:false,message:'La solicitud ya no existe.'};
  const block=approvalBlockReason(p,proposalContext(db,p).quote);
  if(block)return {ok:false,message:block};
  try{
    const result=await approveAndPay(db,p.id);
    refresh(p.id);
    return {ok:result.status==='paid',message:result.reason??(result.status==='paid'?'Pago confirmado y registrado en el libro.':'La compra no se completó.')};
  }catch(error){
    if(pendingIntegration(error))return {ok:false,message:'Integración de pagos pendiente de A3. No se realizó ninguna compra.'};
    console.error('No se pudo completar la aprobación',error instanceof Error?error.message:'error');
    return {ok:false,message:'No se pudo confirmar el resultado. Revisa el estado de la propuesta antes de volver a intentar.'};
  }
}
export async function rejectAction(id:string){
  const parsed=idSchema.safeParse(id);
  if(!parsed.success)return {ok:false,message:'Solicitud inválida.'};
  const db=getDb();const p=proposalById(db,parsed.data);
  if(!p||p.status!=='proposed')return {ok:false,message:'Solo se puede rechazar una solicitud pendiente.'};
  try{rejectProposal(db,p.id,'Rechazada por una persona.');refresh(p.id);return {ok:true,message:'Solicitud rechazada.'};}
  catch(error){if(pendingIntegration(error))return {ok:false,message:'Integración de rechazo pendiente de A3.'};throw error;}
}
