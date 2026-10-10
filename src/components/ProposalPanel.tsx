'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import type { ActionResult } from '@/app/actions';
import { approveProposal, refreshProposal, rejectProposal, requoteProposal } from '@/app/actions';
import type { ProposalView } from '@/contracts';
import { Badge, Fact, statusTone } from './Ui';
import { approvalToken } from '@/lib/approval-token';
import { pollDelay } from '@/lib/poll-backoff';
import { STATUS_LABELS, dateTime, isExpired, money } from './format';

function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setSrc, () => setSrc('')); }, [url]);
  return src ? <img className="qr" src={src} alt="Código QR para aprobar el pago en Reap" /> : null;
}

export default function ProposalPanel({ initial, telegram = null }: { initial: ProposalView; telegram?: string | null }) {
  const [p, setP] = useState(initial);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const [pending, start] = useTransition();
  const apply = (r: ActionResult<ProposalView>) => { if (r.ok) { setP(r.data); setError(''); } else setError(r.error); };
  const run = (fn: (id: string) => Promise<ActionResult<ProposalView>>) => start(async () => { try { apply(await fn(p.id)); } catch { setError('No se pudo confirmar el resultado. Revisa el estado antes de reintentar.'); } });

  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Mientras el pago siga 'approved' se consulta con backoff (2, 5, 10, 30 s); si el proveedor
  // manda Retry-After se espera eso. Un rate limit no es un error para la persona que lee la página.
  useEffect(() => {
    if (p.status !== 'approved') return;
    let cancelled = false;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      let wait: number | undefined;
      try {
        const r = await refreshProposal(p.id);
        if (cancelled) return;
        if (r.ok) apply(r);
        else {
          wait = r.retryAfterMs;
          if (wait === undefined) setError('No se pudo consultar el pago; se reintentará.');
        }
      } catch {
        if (cancelled) return;
        setError('No se pudo consultar el pago; se reintentará.');
      }
      step += 1;
      if (!cancelled) timer = setTimeout(tick, pollDelay(step, wait));
    };
    timer = setTimeout(tick, pollDelay(0));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [p.id, p.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const quoteExpired = p.status === 'proposed' && !!p.quote && isExpired(p.quote.expiresAt, now);
  const canApprove = p.status === 'proposed' && p.verification.passed && !!p.quote && !quoteExpired;
  const co = p.checkout;
  const symbol = p.status === 'paid' ? '✓' : p.status === 'failed' ? '×' : p.status === 'approved' ? '…' : null;
  return <section className="panel">
    <h2>{p.status === 'paid' ? 'Pago confirmado' : p.status === 'failed' ? 'El pago falló' : p.status === 'approved' ? 'Pendiente de conciliación' : 'Cotización de reposición'}</h2>
    {symbol && <div className="status-symbol" aria-hidden="true">{symbol}</div>}
    <Badge tone={statusTone(p.status)}>{STATUS_LABELS[p.status]}</Badge>
    {p.provider && <> <Badge>{p.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Badge></>}
    {p.product ? <dl>
      <Fact label="Producto">{p.product.title}</Fact><Fact label="Comercio">{p.product.merchant}</Fact>
      <Fact label="Entrega estimada">{p.product.lead_time_days} días</Fact></dl> : <p className="muted">Sin producto seleccionado.</p>}
    {p.quote && <dl>
      <Fact label="Artículos">{money(p.quote.itemsSubtotal)}</Fact><Fact label="Envío">{money(p.quote.shipping)}</Fact>
      <Fact label="Impuestos">{money(p.quote.tax)}</Fact><Fact label="Total">{money(p.quote.finalAmount)}</Fact>
      {p.quote_amount_company !== null && <Fact label="Total en MXN">{money(p.quote_amount_company)}</Fact>}
      <Fact label="Cotización vence">{dateTime(p.quote.expiresAt)}</Fact></dl>}
    {p.reason && <p className="notice-text">{p.reason}</p>}

    {p.status === 'proposed' && <div className="actions">
      {quoteExpired ? <button className="primary" disabled={pending} onClick={() => run(requoteProposal)}>La cotización venció · Cotizar de nuevo</button>
        : <button className="primary" disabled={!canApprove || pending} onClick={() => run((id) => approveProposal(id, approvalToken(p) ?? ''))}>{pending ? 'Procesando…' : 'Aprobar'}</button>}
      <button className="secondary" disabled={pending} onClick={() => run(rejectProposal)}>Rechazar</button></div>}
    {canApprove && telegram && <p className="muted small">También puedes aprobar desde <a href={telegram} target="_blank" rel="noreferrer">Telegram</a>.</p>}
    {p.status === 'proposed' && !p.verification.passed && <p className="notice-text">Aprobar está bloqueado: una verificación falló.</p>}
    {p.status === 'rejected' && <p className="notice-text">Rechazada. Revisa la regla que falló a la izquierda.</p>}

    {p.status === 'approved' && co?.status === 'REQUIRES_ACTION' && co.approvalUrl && <div>
      <p><strong>Aprueba en Reap desde tu teléfono.</strong></p><Qr url={co.approvalUrl} />
      <p className="small"><a className="link" href={co.approvalUrl} target="_blank" rel="noreferrer noopener">Abrir página de aprobación</a>{co.approvalExpiresAt && <> · vence {dateTime(co.approvalExpiresAt)}</>}</p></div>}
    {p.status === 'approved' && co?.status === 'PROCESSING' && <p>Orden colocada, en confirmación{co.orderId ? ` · ${co.orderId}` : ''}.</p>}
    {p.status === 'approved' && !co && <p className="notice-text">Pendiente de conciliación. Se sigue consultando el pago; no compres otra vez.</p>}
    {p.status === 'paid' && <p>Orden <strong>{co?.orderId}</strong> · {money(co?.finalAmount ?? null)} · <Link className="link" href="/ledger">Ver en el libro</Link></p>}
    {p.status === 'failed' && <div className="actions"><button className="primary" disabled={pending} onClick={() => run(requoteProposal)}>Cotizar de nuevo</button></div>}
    {error && <p role="alert" className="notice-text">{error}</p>}
  </section>;
}
