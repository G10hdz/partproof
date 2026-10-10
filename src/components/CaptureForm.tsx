'use client';
import { useState } from 'react';
import { z } from 'zod';
const responseSchema=z.object({photo_id:z.string(),needs_confirmation:z.boolean(),result:z.object({nameplateModel:z.string().nullable(),confidence:z.number().min(0).max(1)})});
export default function CaptureForm({machineId,available}:{machineId:string;available:boolean}){
  const [pending,setPending]=useState(false);const [message,setMessage]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const data=new FormData(event.currentTarget);const file=data.get('file');
    if(!(file instanceof File)||!['image/jpeg','image/png'].includes(file.type)||file.size===0||file.size>5*1024*1024){setMessage('Elige una foto JPEG o PNG de hasta 5 MB.');return;}
    data.set('machine_id',machineId);setPending(true);setMessage('');
    try{const response=await fetch('/api/vision/analyze',{method:'POST',body:data});
      if(!response.ok){setMessage(response.status===404?'La integración de visión todavía no está disponible.':`No se pudo analizar la foto (${response.status}). Repite la captura.`);return;}
      const parsed=responseSchema.safeParse(await response.json());
      if(!parsed.success){setMessage('La respuesta de visión no es válida. La evidencia no se confirmó.');return;}
      const {photo_id,result,needs_confirmation}=parsed.data;
      setMessage(needs_confirmation?`Lectura insuficiente. Repite la foto o pide confirmación del modelo. Foto ${photo_id}.`:`Placa: ${result.nameplateModel??'no legible'} · confianza ${Math.round(result.confidence*100)}% · foto ${photo_id}. La foto no autoriza una compra.`);
    }catch{setMessage('No se recibió respuesta. Verifica la conexión y vuelve a subir la foto.');}finally{setPending(false);}
  }
  return <form className="capture-form" onSubmit={submit}><label htmlFor={`photo-${machineId}`}>Foto de la placa / {machineId}<input id={`photo-${machineId}`} name="file" type="file" accept="image/jpeg,image/png" capture="environment" required disabled={!available||pending}/></label><p className="muted small">Modelo completo y legible. JPEG o PNG, máximo 5 MB.</p><button className="secondary" type="submit" disabled={!available||pending}>{pending?'Analizando…':'Analizar foto'}</button>{!available&&<p className="notice-text">Captura pendiente de integrar con A4.</p>}{message&&<p role="status" className="notice-text">{message}</p>}</form>;
}
