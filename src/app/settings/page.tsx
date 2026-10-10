import { PendingNotice } from '@/components/PendingNotice';

export default function SettingsPage() {
  return (
    <>
      <h1 className="page__title">Ajustes</h1>
      <p className="page__lede">
        Configuración de la demo: país, presupuesto mensual y tope por compra.
      </p>

      <div className="card">
        <h2 className="card__title">Parámetros</h2>
        <p className="card__body">
          México · Moneda MXN · Presupuesto mensual $6,000 · Tope por compra $1,500.
        </p>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}
