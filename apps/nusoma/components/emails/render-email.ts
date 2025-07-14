import { render } from '@react-email/components'
import { InvitationEmail } from './invitation-email'
import { OTPVerificationEmail } from './otp-verification-email'
import { ResetPasswordEmail } from './reset-password-email'

export async function renderOTPEmail(
  otp: string,
  email: string,
  type: 'sign-in' | 'email-verification' | 'forget-password' = 'email-verification',
  chatTitle?: string
): Promise<string> {
  return await render(OTPVerificationEmail({ otp, email, type, chatTitle }))
}

export async function renderPasswordResetEmail(
  username: string,
  resetLink: string
): Promise<string> {
  return await render(
    ResetPasswordEmail({
      username,
      resetLink: resetLink,
      updatedDate: new Date(),
    })
  )
}

export async function renderInvitationEmail(
  inviterName: string,
  organizationName: string,
  invitationUrl: string,
  email: string
): Promise<string> {
  return await render(
    InvitationEmail({
      inviterName,
      organizationName,
      inviteLink: invitationUrl,
      invitedEmail: email,
      updatedDate: new Date(),
    })
  )
}

export function getEmailSubject(
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'reset-password' | 'invitation'
): string {
  switch (type) {
    case 'sign-in':
      return 'Sign in to nusoma'
    case 'email-verification':
      return 'Verify your email for nusoma'
    case 'forget-password':
      return 'Reset your nusoma password'
    case 'reset-password':
      return 'Reset your nusoma password'
    case 'invitation':
      return "You've been invited to join a team on nusoma"
    default:
      return 'nusoma'
  }
}
