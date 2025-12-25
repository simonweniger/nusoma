import { AuthErrorCode } from '@workspace/auth/errors';
import {
  DocumentRecord,
  DocumentStage,
  FeedbackCategory,
  Role,
  WebhookTrigger
} from '@workspace/database/schema';

import { Provider } from '~/types/auth';

export const documentStageLabel: Record<DocumentStage, string> = {
  [DocumentStage.LEAD]: 'Lead',
  [DocumentStage.QUALIFIED]: 'Qualified',
  [DocumentStage.OPPORTUNITY]: 'Opportunity',
  [DocumentStage.PROPOSAL]: 'Proposal',
  [DocumentStage.IN_NEGOTIATION]: 'In negotiation',
  [DocumentStage.LOST]: 'Lost',
  [DocumentStage.WON]: 'Won'
};

export const documentRecordLabel: Record<DocumentRecord, string> = {
  [DocumentRecord.PERSON]: 'Person',
  [DocumentRecord.COMPANY]: 'Company'
};

export const roleLabels: Record<Role, string> = {
  [Role.MEMBER]: 'Member',
  [Role.ADMIN]: 'Admin'
};

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  [FeedbackCategory.SUGGESTION]: 'Suggestion',
  [FeedbackCategory.PROBLEM]: 'Problem',
  [FeedbackCategory.QUESTION]: 'Question'
};

export const webhookTriggerLabels: Record<WebhookTrigger, string> = {
  [WebhookTrigger.document_CREATED]: 'Document created',
  [WebhookTrigger.document_UPDATED]: 'Document updated',
  [WebhookTrigger.document_DELETED]: 'Document deleted'
};

export const identityProviderLabels: Record<Provider, string> = {
  [Provider.Credentials]: 'Credentials',
  [Provider.TotpCode]: 'TOTP code',
  [Provider.RecoveryCode]: 'Recovery code',
  [Provider.Google]: 'Google',
  [Provider.MicrosoftEntraId]: 'Microsoft'
};

export const authErrorLabels: Record<AuthErrorCode, string> = {
  [AuthErrorCode.NewEmailConflict]: 'Email already exists.',
  [AuthErrorCode.UnverifiedEmail]: 'Email is not verified.',
  [AuthErrorCode.IncorrectEmailOrPassword]: 'Email or password is not correct.',
  [AuthErrorCode.TotpCodeRequired]: 'TOTP code is required.',
  [AuthErrorCode.IncorrectTotpCode]: 'The TOTP code is not correct.',
  [AuthErrorCode.MissingRecoveryCodes]: 'Missing recovery codes.',
  [AuthErrorCode.IncorrectRecoveryCode]: 'The recovery code is not correct.',
  [AuthErrorCode.RequestExpired]: 'Request has expired.',
  [AuthErrorCode.RateLimitExceeded]: 'Rate limit exceeded.',
  [AuthErrorCode.IllegalOAuthProvider]: 'Illegal OAuth provider.',
  [AuthErrorCode.InternalServerError]:
    'Something went wrong. Please try again later.',
  [AuthErrorCode.MissingOAuthEmail]: 'Missing OAuth email.',
  [AuthErrorCode.AlreadyLinked]: 'OAuth account has been already linked.',
  [AuthErrorCode.RequiresExplicitLinking]:
    'Please sign in first to link this account',
  [AuthErrorCode.UnknownError]: 'Unknown error.'
};
