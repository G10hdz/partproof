'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { EvidencePreview, PartType, RequestPartResult } from '@/contracts';
import { previewEvidence, submitEvidence } from '@/app/actions';
import { PART_LABELS } from './format';
import EquipmentVisual from './EquipmentVisual';
import { Fact, Tag } from './Ui';

export default function CaptureForm({ machineId, parts, registeredModel }: { machineId: string; parts: PartType[]; registeredModel: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState<EvidencePreview | null>(null);
  const [part, setPart] = useState<PartType>(parts[0]);
  const [result, setResult] = useState<RequestPartResult | null>(null);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get('photo');
    if (!(file instanceof File) || !['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) { setMsg('Elige una foto JPEG o PNG de hasta 5 MB.'); return; }
    const data = new FormData(); data.set('photo', file); data.set('machine_id', machineId);
    setBusy(true); setMsg(''); setPhoto(null); setResult(null);
    try {
      const up = await fetch('/api/photos', { method: 'POST', body: data });
      const body = (await up.json().catch(() => ({}))) as { photo_id?: string; error?: string };
      if (!up.ok || !body.photo_id) { setMsg(body.error ?? `No se pudo subir la foto (${up.status}).`); return; }
      const r = await previewEvidence(machineId, body.photo_id);
      if (!r.ok) setMsg(r.error); else setPhoto(r.data);
    } catch { setMsg('No se recibió respuesta. Verifica la conexión y vuelve a intentar.'); } finally { setBusy(false); }
  }
  async function use() {
    if (!photo) return;
    setBusy(true); setMsg('');
    try { const r = await submitEvidence(machineId, part, photo.photo_id); if (r.ok) setResult(r.data); else setMsg(r.error); }
    catch { setMsg('No se pudo enviar la evidencia.'); } finally { setBusy(false); }
  }
  const ok = !!photo && photo.model_matches && photo.enough_confidence;
  return <>
    <div className="step-line"><span><i />1 Encuadrar</span><span><i />2 Revisar lectura</span><span><i />3 Usar evidencia</span></div>
    <div className="grid cols-3">
      <section className="panel"><h2>01 / Foto de la placa</h2>
        <div className="capture">{photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={`/api/photos/${photo.photo_id}`} alt="Foto de evidencia subida" /> : <EquipmentVisual />}</div>
        <p className="capture-tip">Encuadra la placa y verifica que el modelo se lea completo.</p>
        <form className="capture-form" onSubmit={upload}>
          <label htmlFor={`photo-${machineId}`}>Subir archivo · {machineId}<input id={`photo-${machineId}`} name="photo" type="file" accept="image/jpeg,image/png" capture="environment" required disabled={busy} /></label>
          <p className="muted small">JPEG o PNG, máximo 5 MB.</p>
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Procesando…' : 'Analizar foto'}</button></form></section>
      <section className="panel"><h2>02 / Comparar</h2>
        {photo ? <>
          <dl><Fact label="Registrado">{registeredModel}</Fact><Fact label="Leído">{photo.vision.nameplate_model ?? 'no legible'}</Fact><Fact label="Confianza">{Math.round(photo.vision.confidence * 100)}%</Fact><Fact label="Modo">{photo.mode === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</Fact></dl>
          <p className={ok ? 'small' : 'notice-text'}>{photo.model_matches ? 'El modelo coincide.' : 'El modelo leído no coincide con el registrado.'} {photo.enough_confidence ? '' : 'Lectura con poca confianza: repite la foto.'}</p>
          <div className="stack"><select aria-label="Refacción" value={part} onChange={(e) => setPart(e.target.value as PartType)}>{parts.map((x) => <option key={x} value={x}>{PART_LABELS[x]}</option>)}</select>
            <button className="primary block" type="button" onClick={use} disabled={busy || !photo.model_matches}>Usar esta foto como evidencia</button></div>
          <p className="muted small">La foto no autoriza una compra; el gate decide.</p></>
          : <p className="muted">Sube una foto para comparar el modelo leído con el registrado ({registeredModel}).</p>}
        {result && (result.proposal_id !== null ? <p>Solicitud creada · <Link className="link" href={`/proposals/${result.proposal_id}`}>ver propuesta</Link></p> : <p className="notice-text">{result.reason}</p>)}
        {msg && <p role="status" className="notice-text">{msg}</p>}</section>
      <section className="panel"><h2>03 / Ayuda</h2><h3>Modelo completo y legible.</h3>
        <p className="muted small">Evita reflejos. Incluye el nombre y sufijo del modelo: MK3S y MK3S+ son distintos.</p><Tag>Sandbox</Tag></section>
    </div></>;
}
