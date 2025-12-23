import { OAuthProviderType } from '~/types/auth';

export type ConnectedAccountDto = {
  id: OAuthProviderType;
  name: string;
  type: string;
  linked: boolean;
};
