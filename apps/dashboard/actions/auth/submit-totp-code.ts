'use server';

import { returnValidationErrors } from 'next-safe-action';

// import { signIn } from '@workspace/auth';
// import { CredentialsSignin } from '@workspace/auth/errors';
// import { Provider } from '~/types/auth'; // unused for now
// import { getRedirectAfterSignIn } from '@workspace/auth/redirect';

import { actionClient } from '~/actions/safe-action';
import { submitTotpCodeSchema } from '~/schemas/auth/submit-totp-code-schema';

export const submitTotpCode = actionClient
  .metadata({ actionName: 'submitTotpCode' })
  .inputSchema(submitTotpCodeSchema)
  .action(async ({ parsedInput: _parsedInput }) => {
    // const redirectTo = await getRedirectAfterSignIn();

    try {
      // TODO: Implement TOTP verification using Better Auth
      // await signIn(Provider.TotpCode, {
      //   ...parsedInput,
      //   redirectTo,
      //   redirect: true
      // });
      return { serverError: 'TOTP verification not implemented' };
    } catch (e) {
      if (e instanceof Error) {
        return returnValidationErrors(submitTotpCodeSchema, {
          _errors: [e.message]
        });
      }
      throw e;
    }
  });
