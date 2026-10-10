// Bot de Telegram: avisa cada propuesta nueva y deja aprobar o rechazar desde el chat.
// Solo responde al chat de TELEGRAM_CHAT_ID; sin token ni chat configurados no hace nada.
import type { PartProofServer, ProposalView } from '@/contracts';
import { createHash } from 'node:crypto';
import { money, PART_LABELS } from '@/components/format';
import { approvalToken } from '@/lib/approval-token';

type Env = Record<string, string | undefined>;
type Button = { text: string; callback_data?: string; url?: string };

interface TelegramUpdate {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

export function proposalMessage(view: ProposalView, appUrl?: string): { text: string; buttons: Button[][] } {
  const title = `${view.machine_id} · ${PART_LABELS[view.part_type]}`;
  const link = appUrl ? [{ text: 'Ver propuesta', url: `${appUrl}/proposals/${view.id}` }] : [];
  if (view.status === 'proposed' && view.verification.passed && view.quote) {
    const total = `${money(view.quote.finalAmount)} (${money(view.quote_amount_company)})`;
    return {
      text: `${title}\nGate en verde. Total ${total} con envío e impuestos.`,
      buttons: [[{ text: 'Aprobar', callback_data: `approve:${view.id}:${tokenHash(view)}` }, { text: 'Rechazar', callback_data: `reject:${view.id}` }], ...(link.length ? [link] : [])],
    };
  }
  return { text: `${title}\nRechazada: ${view.reason ?? 'sin razón'}`, buttons: link.length ? [link] : [] };
}

async function call(env: Env, method: string, body: unknown, fetchImpl: typeof fetch) {
  const res = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram ${method} respondió ${res.status}`);
}

export async function notifyProposal(view: ProposalView, env: Env = process.env, fetchImpl: typeof fetch = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const { text, buttons } = proposalMessage(view, env.APP_URL);
  await call(env, 'sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text, reply_markup: { inline_keyboard: buttons } }, fetchImpl);
}

export async function handleUpdate(
  update: TelegramUpdate, server: Pick<PartProofServer, 'approveProposal' | 'rejectProposal' | 'getProposal'>,
  env: Env = process.env, fetchImpl: typeof fetch = fetch,
) {
  const chatId = update.callback_query?.message?.chat.id ?? update.message?.chat.id;
  if (chatId === undefined) return;
  const send = (text: string, buttons: Button[][] = []) =>
    call(env, 'sendMessage', { chat_id: chatId, text, reply_markup: { inline_keyboard: buttons } }, fetchImpl);

  // /start responde el id del chat para configurar TELEGRAM_CHAT_ID; no expone nada más.
  if (update.message?.text?.startsWith('/start')) return send(`PartProof. Id de este chat: ${chatId}`);
  if (String(chatId) !== env.TELEGRAM_CHAT_ID) return;

  const query = update.callback_query;
  const [action, id, hash] = query?.data?.split(':') ?? [];
  if (!query || !id || (action !== 'approve' && action !== 'reject')) return;
  await call(env, 'answerCallbackQuery', { callback_query_id: query.id }, fetchImpl);
  try {
    if (action === 'reject') {
      await server.rejectProposal(id);
      return send('Propuesta rechazada. No se compra nada.');
    }
    // El botón solo vale para el quote que se avisó: si cambió, no se aprueba a ciegas.
    const current = await server.getProposal(id);
    const token = current && approvalToken(current);
    if (!current || !token || tokenHash(current) !== hash) return send('La cotización cambió. Revisa la propuesta en la web.');
    const view = await server.approveProposal(id, token);
    const url = view.checkout?.approvalUrl;
    return send(
      url ? 'Checkout creado en Reap. Confirma con tu passkey.' : `Propuesta en estado ${view.status}.`,
      url ? [[{ text: 'Aprobar en Reap', url }]] : [],
    );
  } catch (err) {
    return send(`No se pudo: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Link al bot para la UI; null mientras el bot no tenga chat configurado.
export function telegramBotUrl(env: Env = process.env): string | null {
  return env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID ? `https://t.me/${env.TELEGRAM_BOT_USERNAME ?? 'partproof_bot'}` : null;
}

// Telegram limita callback_data a 64 bytes; basta un prefijo del hash del token de aprobación.
function tokenHash(view: ProposalView): string {
  return createHash('sha256').update(approvalToken(view) ?? '').digest('hex').slice(0, 8);
}
