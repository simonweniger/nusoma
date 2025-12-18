import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

import { withAuth } from '~/lib/with-auth';

/**
 * @swagger
 * /organization:
 *   get:
 *     summary: Get organization details
 *     description: Returns the organization associated with the API key.
 *     tags:
 *       - Organization
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Organization details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Acme Corp"
 *                 address:
 *                   type: string
 *                   example: "123 Business Street"
 *                 phone:
 *                   type: string
 *                   example: "+1-234-567-890"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "contact@acme.com"
 *                 website:
 *                   type: string
 *                   format: uri
 *                   example: "https://acme.com"
 *       401:
 *         description: Unauthorized. API key is missing or invalid.
 *       404:
 *         description: Organization not found.
 */
export const GET = withAuth(async function (_req, ctx) {
  const [organization] = await db
    .select({
      name: organizationTable.name,
      address: organizationTable.address,
      phone: organizationTable.phone,
      email: organizationTable.email,
      website: organizationTable.website
    })
    .from(organizationTable)
    .where(eq(organizationTable.id, ctx.organization.id))
    .limit(1);

  if (!organization) {
    return new Response(JSON.stringify({ error: 'Organization not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  return new Response(JSON.stringify(organization), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
