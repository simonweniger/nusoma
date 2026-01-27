// Global App Configuration

export const appConfig = {
  /**
   * Billing Configuration
   */
  billing: {
    /**
     * Margin percentage added on top of FAL costs
     * Example: 0.20 = 20% margin
     */
    marginPercentage: 0.2,

    /**
     * Minimum charge per generation (in credits/cents)
     * Prevents very small charges that are impractical
     */
    minimumCharge: 1,

    /**
     * Credit to USD conversion rate
     * 1 credit = $0.01 (1 cent)
     */
    creditToUsdRate: 0.01,

    /**
     * Polar Meter Slug for recording usage
     */
    meterSlug: "₦ credit usage ",
  },

  /**
   * FAL API Configuration
   */
  fal: {
    /**
     * Default estimate type for pricing calculations
     * "unit_price" - Calculate based on billing units (images, videos)
     * "historical_api_price" - Use past usage patterns
     */
    estimateType: "unit_price" as const,
  },
} as const;

// Type exports for external use
export type AppConfig = typeof appConfig;
export type BillingConfig = typeof appConfig.billing;
