import { PendingNotice } from '@/components/PendingNotice';

export default function McpLogPage() {
  return (
    <>
      <h1 className="page__title">Registro MCP</h1>
      <p className="page__lede">
        Solicitudes recibidas por el servidor MCP y su resultado, sin token ni secretos.
      </p>

      <div className="card">
        <h2 className="card__title">Entradas</h2>
        <p className="card__body">
          Aquí aparecerán la máquina que solicita, su evidencia, la nota y el resultado.
        </p>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <PendingNotice />
      </div>
    </>
  );
}
