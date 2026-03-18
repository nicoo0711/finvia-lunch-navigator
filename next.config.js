/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'puppeteer-core',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin',
    '@sparticuz/chromium-min',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)
      config.externals = [
        ...existing,
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer-extra-plugin',
        'clone-deep',
        'merge-deep',
      ]
    }
    return config
  },
}
module.exports = nextConfig
