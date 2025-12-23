export enum AuthErrorCode {
  NewEmailConflict = 'new_email_conflict',
  UnverifiedEmail = 'unverified_email',
  IncorrectEmailOrPassword = 'incorrect_email_or_password',
  TotpCodeRequired = 'totp_code_required',
  IncorrectTotpCode = 'incorrect_totp_code',
  MissingRecoveryCodes = 'missing_recovery_codes',
  IncorrectRecoveryCode = 'incorrect_recovery_code',
  RequestExpired = 'request_expired',
  RateLimitExceeded = 'rate_limit_exceeded',
  IllegalOAuthProvider = 'illegal_oauth_provider',
  InternalServerError = 'internal_server_error',
  MissingOAuthEmail = 'missing_oauth_email',
  AlreadyLinked = 'already_linked',
  RequiresExplicitLinking = 'requires_explicit_linking',
  UnknownError = 'unknown_error'
}
