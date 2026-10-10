import type { Verification } from '@/lib/types';
import { RULE_LABELS } from '@/lib/queries';
import { getItem } from '@/lib/catalog';
export default function GateChecklist({v}:{v:Verification|null}){
  return <section className="panel"><h2>Verificaciones <span className="muted small">/ 7 reglas</span></h2><ul className="gate-checklist">{Object.entries(RULE_LABELS).map(([key,label])=>{const rule=v?.rules.find(r=>r.rule===key);return <li key={key} className={rule?.ok?'ok':rule?'bad':'muted'}><span className="check-mark" aria-hidden="true">{rule?.ok?'✔':rule?'✘':'—'}</span><div><strong>{label}</strong><p>{rule?`${rule.ok?'Correcta':'Bloqueada'}: ${rule.reason}`:'Pendiente de verificación.'}</p></div></li>;})}</ul>{!!v?.discarded.length&&<details className="discarded"><summary>Productos descartados ({v.discarded.length})</summary>{v.discarded.map(d=><div key={d.itemId}><strong>{getItem(d.itemId)?.title??d.itemId}</strong><p>{d.merchant} · {d.failed.map(rule=>RULE_LABELS[rule]).join(', ')}</p></div>)}</details>}</section>;
}
