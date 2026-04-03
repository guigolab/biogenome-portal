const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim()
const basePath =
  rawBase === '' || rawBase === '/'
    ? undefined
    : rawBase.startsWith('/')
      ? rawBase.replace(/\/$/, '')
      : `/${rawBase.replace(/\/$/, '')}`

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
