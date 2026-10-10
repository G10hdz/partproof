import assert from 'node:assert/strict';
import { SCREENS, VARIANTS, renderScreen } from '../public/wireframe/wireframe.mjs';

assert.equal(SCREENS.length,9);
assert.equal(VARIANTS.length,3);
for(const [screen] of SCREENS){
  const outputs=VARIANTS.map(v=>renderScreen(screen,v));
  assert.equal(new Set(outputs).size,3,`${screen}: tres composiciones distintas`);
  for(const output of outputs){
    assert.ok(output.includes('SANDBOX')&&output.includes('MOCK'),screen);
    assert.ok(!output.includes('undefined'),screen);
  }
}
for(const machine of ['P2','P4']){
  for(const variant of VARIANTS){
    const html=renderScreen('aprobacion',variant,{machine,payment:'paid'});
    assert.match(html,/data-go="resultado" disabled/,'bloqueo también en aprobación');
    const result=renderScreen('resultado',variant,{machine,payment:'paid'});
    assert.ok(result.includes('Solicitud bloqueada'));
    assert.ok(!result.includes('Pago confirmado'),'no simular pago de solicitud bloqueada');
  }
}
const p3=renderScreen('maquina','a',{machine:'P3',payment:'paid'});
assert.ok(p3.includes('Original Prusa MK3S+'));
const p3Result=renderScreen('resultado','a',{machine:'P3',payment:'paid'});
assert.ok(p3Result.includes('38.87 MXN')&&p3Result.includes('Prusa Hotend PTFE Tube'));
for(const payment of ['failed','pending']){
  const html=renderScreen('resultado','a',{machine:'P1',payment});
  assert.ok(!html.includes('>Ver en libro</button>'),'sin CTA de compra confirmada');
  assert.ok(html.includes('Sin referencia confirmada'));
}
assert.throws(()=>renderScreen('unknown','a'));
assert.throws(()=>renderScreen('flota','d'));
assert.throws(()=>renderScreen('propuesta','a',{machine:'<script>',payment:'paid'}));
console.log('PASS: 27 vistas, bloqueos P2/P4, estados de pago y escenarios inválidos');
