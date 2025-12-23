ALTER TABLE "account" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "createdAt" timestamp (3) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "updatedAt" timestamp (3) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "activeOrganizationId" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_activeOrganizationId_organization_id_fk" FOREIGN KEY ("activeOrganizationId") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;