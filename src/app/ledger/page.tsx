import { PendingNotice } from '@/components/PendingNotice';

export default function LedgerPage() {
  return (
    <>
      <h1 className="page__title">Libro</h1>
      <p className="page__lede">
        Gasto por máquina y por hora de uso, y total del mes contra presupuesto.
      </p>

      <div className="card-grid">
        <div className="card">
          <h2 className="card__title">Insignia de proveedor</h2>
          <p className="card__body">
            Cada compra mostrará MOCK o REAP SANDBOX, sin mezclar monedas ni ocultar el modo.
          </p>
        </div>
        <div className="card">
          <h2 className="card__title">Totales</h2>
          <p className="card__body">
            Total mensual en MXN contra el presupuesto de Forja3D MX y costo por hora de uso.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}