/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Deshabilitar ESLint durante el build para evitar fallos por warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Deshabilitar verificación de tipos durante el build (opcional)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
