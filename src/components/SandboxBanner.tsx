import { SANDBOX_BANNERS } from '@/lib/nav';

const TAGS: Record<(typeof SANDBOX_BANNERS)[number], string> = {
  SANDBOX: 'banner__tag--sandbox',
  MOCK: 'banner__tag--mock',
  'REPETICIÓN': 'banner__tag--replay',
};

export function SandboxBanner() {
  return (
    <div className="banner" role="status" aria-label="Estado de la demo">
      {SANDBOX_BANNERS.map((tag) => (
        <span key={tag} className={`banner__tag ${TAGS[tag]}`}>
          {tag}
        </span>
      ))}
      <span className="banner__spacer" />
      <span className="banner__note">
        Entorno de demostración. Ninguna compra ni pago es real.
      </span>
    </div>
  );
}
