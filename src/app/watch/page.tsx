import { PendingNotice } from '@/components/PendingNotice';

export default function WatchPage() {
  return (
    <>
      <h1 className="page__title">Reloj</h1>
      <p className="page__lede">
        Pantalla tamaño reloj para aprobar una propuesta con un toque.
      </p>

      <div className="card">
        <h2 className="card__title">Tarjeta mínima de aprobación</h2>
        <p className="card__body">
          Propuesta pendiente con botón de aprobación. Reutiliza la tarjeta de Propuestas.
        </p>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}