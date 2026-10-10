/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La visión (replay y placas) y el pago mock (fixtures del sandbox) leen estos archivos en runtime;
  // sin esto no entran en las funciones de Vercel.
  outputFileTracingIncludes: {
    '/**/*': ['./demo/**/*', './fixtures/reap/**/*'],
  },
};

export default nextConfig;
