import type { NextConfig } from 'next'
import type { Configuration, RuleSetRule } from 'webpack'

const nextConfig: NextConfig = {
  webpack(config: Configuration) {
    if (!config.module || !config.module.rules) {
      return config // Should not happen in a typical Next.js setup
    }

    const fileLoaderRule = config.module.rules.find((rule): rule is RuleSetRule => {
      // Ensure rule is an object and rule.test is a RegExp
      if (rule && typeof rule === 'object' && rule.test instanceof RegExp) {
        return rule.test.test('.svg') // Test if the RegExp matches '.svg'
      }
      return false
    })

    if (!fileLoaderRule) {
      return config
    }

    config.module.rules.push(
      // Rule for *.svg?url: uses the original file loader
      {
        ...fileLoaderRule, // Spread properties from the original file loader rule
        test: /\.svg$/i, // Apply to .svg files
        resourceQuery: /url/, // Only apply if '?url' is in the query
      },
      // Rule for other *.svg imports: uses SVGR
      {
        test: /\.svg$/i, // Apply to .svg files
        issuer: fileLoaderRule.issuer, // Maintain the same issuer condition from the original rule
        resourceQuery: { not: [/url/] }, // Apply if NOT *.svg?url
        use: ['@svgr/webpack'],
      }
    )

    // Modify the original file loader rule to exclude all SVGs,
    // as they are now handled by the two rules above.
    fileLoaderRule.exclude = /\.svg$/i

    return config
  },
  /* any other config options here */
}

export default nextConfig
