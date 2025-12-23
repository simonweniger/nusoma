'use server';

import { revalidatePath } from 'next/cache';

// import { signIn } from '@workspace/auth';
import { replaceOrgSlug, routes } from '@workspace/routes';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { connectAccountSchema } from '~/schemas/account/connect-account-schema';

export const connectAccount = authOrganizationActionClient
  .metadata({ actionName: 'connectAccount' })
  .inputSchema(connectAccountSchema)
  .action(async ({ parsedInput, ctx }) => {
    // await signIn(
    //   parsedInput.provider,
    //   {},
    //   {
    //     prompt: 'login'
    //   }
    // );
    // TODO: Implement social account connection using Better Auth
    console.log(
      'Connect account not implemented for provider:',
      parsedInput.provider
    );

    revalidatePath(
      replaceOrgSlug(
        routes.dashboard.organizations.slug.settings.account.Security,
        ctx.organization.slug
      )
    );
  });
