import { PendingNotice } from '@/components/PendingNotice';

const FLEET: { id: string; nameplate_model: string; hotend: string; hours_total: number }[] = [
  { id: 'P1', nameplate_model: 'Original Prusa MK4S', hotend: 'Nextruder', hours_total: 820 },
  { id: 'P2', nameplate_model: 'Original Prusa MK3S', hotend: 'E3D V6', hours_total: 2310 },
  { id: 'P3', nameplate_model: 'Original Prusa MK3S+', hotend: 'E3D V6', hours_total: 1480 },
  { id: 'P4', nameplate_model: 'Creality K1', hotend: 'Micro Swiss FlowTech', hours_total: 640 },
];

export default function FleetPage() {
  return (
    <>
      <h1 className="page__title">Flota</h1>
      <p className="page__lede">
        Cuatro impresoras de la demo estática de Forja3D MX. Referencia de los datos semilla.
      </p>

      <div className="table-scroll">
      <table>
        <caption className="sr-only">Flota de máquinas de la demo</caption>
        <thead>
          <tr>
            <th scope="col">Máquina</th>
            <th scope="col">Modelo de placa</th>
            <th scope="col">Hotend</th>
            <th scope="col">Horas</th>
            <th scope="col">Stock / mínimo</th>
          </tr>
        </thead>
        <tbody>
          {FLEET.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.nameplate_model}</td>
              <td>{m.hotend}</td>
              <td>{m.hours_total}</td>
              <td>1 / 1</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}
