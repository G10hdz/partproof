import type { GateResult } from '@/contracts';
import { GATE_GROUPS, RULE_LABELS, gateCheck } from './format';

export default function GateChecklist({ v }: { v: GateResult }) {
  return <section className="panel"><h2>Verificaciones <span className="muted small">/ 7 reglas</span></h2>
    {GATE_GROUPS.map((g) => <div key={g.phase}><p className="group-title">{g.title}</p><ul className="gate-checklist">{g.rules.map((rule) => {
      const c = gateCheck(v.checks, rule);
      return <li key={rule} className={c ? (c.passed ? 'ok' : 'bad') : 'pending'}><span className="check-mark" aria-hidden="true">{c ? (c.passed ? '✔' : '✘') : '—'}</span>
        <div><strong>{RULE_LABELS[rule]}</strong><p>{c ? `${c.passed ? 'Correcta' : 'Bloqueada'}: ${c.reason}` : 'No evaluada: una regla anterior falló.'}</p></div></li>;
    })}</ul></div>)}</section>;
}
