'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { EvidencePreview, PartType, RequestPartResult } from '@/contracts';
import { previewEvidence, submitEvidence } from '@/app/actions';
import { PART_LABELS } from './format';

export default function CaptureForm({ machineId, parts }: { machineId: string; parts: PartType[] }) {
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
  return <div className="capture-form">
    <form className="capture-form" onSubmit={upload}>
      <label htmlFor={`photo-${machineId}`}>Foto de la placa / {machineId}<input id={`photo-${machineId}`} name="photo" type="file" accept="image/jpeg,image/png" capture="environment" required disabled={busy} /></label>
      <p className="muted small">Modelo completo y legible. JPEG o PNG, máximo 5 MB.</p>
      <button className="secondary" type="submit" disabled={busy}>{busy ? 'Procesando…' : 'Analizar foto'}</button></form>
    {photo && <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="photo" src={`/api/photos/${photo.photo_id}`} alt="Foto de evidencia subida" />
      <p>Placa leída: <strong>{photo.vision.nameplate_model ?? 'no legible'}</strong> · registrada: <strong>{photo.registered_model}</strong> · confianza {Math.round(photo.vision.confidence * 100)}% · {photo.mode === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</p>
      <p className={photo.model_matches && photo.enough_confidence ? 'small' : 'notice-text'}>{photo.model_matches ? 'El modelo coincide.' : 'El modelo leído no coincide con el registrado.'} {photo.enough_confidence ? '' : 'Lectura con poca confianza.'}</p>
      <div className="inline"><select aria-label="Refacción" value={part} onChange={(e) => setPart(e.target.value as PartType)}>{parts.map((x) => <option key={x} value={x}>{PART_LABELS[x]}</option>)}</select>
        <button className="primary" type="button" onClick={use} disabled={busy}>Usar esta foto como evidencia</button></div>
      <p className="muted small">La foto no autoriza una compra; el gate decide.</p></div>}
    {result && (result.proposal_id !== null ? <p>Solicitud creada · <Link className="link" href={`/proposals/${result.proposal_id}`}>ver propuesta</Link></p> : <p className="notice-text">{result.reason}</p>)}
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </div>;
}
