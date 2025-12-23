CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verificationToken" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "verificationToken" CASCADE;--> statement-breakpoint
DROP INDEX "IX_account_provider_providerAccountId_unique";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "password" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "accountId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "providerId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refreshToken" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "accessToken" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "accessTokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refreshTokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "idToken" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "token" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "expiresAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ipAddress" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "userAgent" text;--> statement-breakpoint
CREATE UNIQUE INDEX "IX_verification_identifier_unique" ON "verification" USING btree ("identifier" text_ops,"value" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_account_providerId_accountId_unique" ON "account" USING btree ("providerId" text_ops,"accountId" text_ops);--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "providerAccountId";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "refresh_token";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "expires_at";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "token_type";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "id_token";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "session_state";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "sessionToken";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "expires";