import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts');

const nextConfig: NextConfig = {
   reactStrictMode: true,
};

export default withNextIntl(nextConfig);
