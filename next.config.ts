import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts');

const nextConfig: NextConfig = {
   reactStrictMode: true,
   webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          net: false,
          tls: false,
          dns: false,
        }
      }
      return config
    },
 };

export default withNextIntl(nextConfig);
