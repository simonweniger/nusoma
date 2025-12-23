ALTER TABLE "invitation" ADD COLUMN "inviterId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "expiresAt" timestamp (3) NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;