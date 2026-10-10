import { PendingNotice } from '@/components/PendingNotice';

export default function ProposalsPage() {
  return (
    <>
      <h1 className="page__title">Propuestas</h1>
      <p className="page__lede">
        Solicitudes de refacción hechas por las máquinas, con evidencia y gate.
      </p>

      <div className="card-grid">
        <div className="card">
          <h2 className="card__title">Tarjeta de propuesta</h2>
          <p className="card__body">
            Mostrará la máquina que pidió, la pieza, el merchant, el precio y la vigencia de la
            cotización.
          </p>
        </div>
        <div className="card">
          <h2 className="card__title">Checklist del gate</h2>
          <p className="card__body">
            Evidencia, compatibilidad, variante, envío, precio, presupuesto y vigencia de la cotización.
          </p>
        </div>
        <div className="card">
          <h2 className="card__title">Aprobación</h2>
          <p className="card__body">
            Cada compra requiere las siete verificaciones y un toque de aprobación humana.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}
