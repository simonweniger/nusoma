export enum Provider {
  Credentials = 'credentials',
  TotpCode = 'totp',
  RecoveryCode = 'recovery_code',
  Google = 'google',
  MicrosoftEntraId = 'microsoft'
}

export const OAuthProviders = ['google', 'microsoft'] as const;
export type OAuthProviderType = (typeof OAuthProviders)[number];

export type ConnectedAccountDto = {
  id: OAuthProviderType;
  name: string;
  type: string;
  linked: boolean;
};
