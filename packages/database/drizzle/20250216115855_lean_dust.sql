CREATE TYPE "public"."actiontype" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."actortype" AS ENUM('system', 'member', 'api');--> statement-breakpoint
CREATE TYPE "public"."documentrecord" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TYPE "public"."documentstage" AS ENUM('lead', 'qualified', 'opportunity', 'proposal', 'inNegotiation', 'lost', 'won');--> statement-breakpoint
CREATE TYPE "public"."documenttaskstatus" AS ENUM('open', 'completed');--> statement-breakpoint
CREATE TYPE "public"."dayofweek" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');--> statement-breakpoint
CREATE TYPE "public"."feedbackcategory" AS ENUM('suggestion', 'problem', 'question');--> statement-breakpoint
CREATE TYPE "public"."invitationstatus" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."webhooktrigger" AS ENUM('documentCreated', 'documentUpdated', 'documentDeleted');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apiKey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"description" varchar(70) NOT NULL,
	"hashedKey" text NOT NULL,
	"expiresAt" timestamp (3),
	"lastUsedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authenticatorApp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountName" varchar(255) NOT NULL,
	"issuer" varchar(255) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"recoveryCodes" varchar(1024) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changeEmailRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"email" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	"valid" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentActivity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"actionType" "actiontype" NOT NULL,
	"actorId" varchar(255) NOT NULL,
	"actorType" "actortype" NOT NULL,
	"metadata" jsonb,
	"occurredAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentComment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"text" varchar(2000) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentImage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"data" "bytea",
	"contentType" varchar(255),
	"hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "documentNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"text" varchar(8000),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentPageVisit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"timestamp" timestamp (3) DEFAULT now() NOT NULL,
	"userId" uuid
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"address" varchar(255),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"image" varchar(2048),
	"stage" "documentstage" DEFAULT 'lead' NOT NULL,
	"phone" varchar(32),
	"record" "documentrecord" DEFAULT 'person' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentTag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentTask" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(8000),
	"status" "documenttaskstatus" DEFAULT 'open' NOT NULL,
	"dueDate" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentToDocumentTag" (
	"documentId" uuid NOT NULL,
	"documentTagId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"documentId" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"userId" uuid,
	"category" "feedbackcategory" DEFAULT 'suggestion' NOT NULL,
	"message" varchar(4000) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "Role" DEFAULT 'member' NOT NULL,
	"status" "invitationstatus" DEFAULT 'pending' NOT NULL,
	"lastSentAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "Role" DEFAULT 'member' NOT NULL,
	"isOwner" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"subject" varchar(128),
	"content" varchar(8000) NOT NULL,
	"link" varchar(2000),
	"seenAt" timestamp (3),
	"dismissed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizationLogo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"data" "bytea",
	"contentType" varchar(255),
	"hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255),
	"email" varchar(255),
	"website" varchar(2000),
	"stripeCustomerId" text NOT NULL,
	"phone" varchar(32),
	"tier" varchar(255) DEFAULT 'free' NOT NULL,
	"facebookPage" varchar(2000),
	"instagramProfile" varchar(2000),
	"linkedInProfile" varchar(2000),
	"tikTokProfile" varchar(2000),
	"xProfile" varchar(2000),
	"youTubeChannel" varchar(2000),
	"logo" varchar(2048),
	"slug" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resetPasswordRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userImage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"data" "bytea",
	"contentType" varchar(255),
	"hash" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"emailVerified" timestamp (3),
	"password" varchar(60),
	"lastLogin" timestamp (3),
	"locale" varchar(8) DEFAULT 'en-US' NOT NULL,
	"completedOnboarding" boolean DEFAULT false NOT NULL,
	"enabledDocumentsNotifications" boolean DEFAULT false NOT NULL,
	"enabledInboxNotifications" boolean DEFAULT false NOT NULL,
	"enabledNewsletter" boolean DEFAULT false NOT NULL,
	"enabledProductUpdates" boolean DEFAULT false NOT NULL,
	"enabledWeeklySummary" boolean DEFAULT false NOT NULL,
	"image" varchar(2048),
	"name" varchar(64) NOT NULL,
	"phone" varchar(32),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"secret" varchar(1024),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"triggers" "webhooktrigger"[] NOT NULL,
	"url" varchar(2000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workHours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"dayOfWeek" "dayofweek" DEFAULT 'sunday' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workTimeSlot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workHoursId" uuid NOT NULL,
	"start" timestamp (2) NOT NULL,
	"end" timestamp (2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apiKey" ADD CONSTRAINT "apiKey_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "authenticatorApp" ADD CONSTRAINT "authenticatorApp_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "changeEmailRequest" ADD CONSTRAINT "changeEmailRequest_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentActivity" ADD CONSTRAINT "documentActivity_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentComment" ADD CONSTRAINT "documentComment_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentComment" ADD CONSTRAINT "documentComment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentImage" ADD CONSTRAINT "documentImage_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentNote" ADD CONSTRAINT "documentNote_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentNote" ADD CONSTRAINT "documentNote_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentPageVisit" ADD CONSTRAINT "documentPageVisit_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentPageVisit" ADD CONSTRAINT "documentPageVisit_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentTask" ADD CONSTRAINT "documentTask_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentToDocumentTag" ADD CONSTRAINT "documentToDocumentTag_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentToDocumentTag" ADD CONSTRAINT "documentToDocumentTag_documentTagId_documentTag_id_fk" FOREIGN KEY ("documentTagId") REFERENCES "public"."documentTag"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organizationLogo" ADD CONSTRAINT "organizationLogo_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userImage" ADD CONSTRAINT "userImage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workHours" ADD CONSTRAINT "workHours_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workTimeSlot" ADD CONSTRAINT "workTimeSlot_workHoursId_workHours_id_fk" FOREIGN KEY ("workHoursId") REFERENCES "public"."workHours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "IX_account_provider_providerAccountId_unique" ON "account" USING btree ("provider" text_ops,"providerAccountId" text_ops);--> statement-breakpoint
CREATE INDEX "IX_account_userId" ON "account" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_apiKey_hashedKey_unique" ON "apiKey" USING btree ("hashedKey" text_ops);--> statement-breakpoint
CREATE INDEX "IX_apiKey_organizationId" ON "apiKey" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_authenticatorApp_userId_unique" ON "authenticatorApp" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_changeEmailRequest_userId" ON "changeEmailRequest" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentActivity_documentId" ON "documentActivity" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentActivity_occurredAt" ON "documentActivity" USING btree ("occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "IX_documentComment_documentId" ON "documentComment" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentComment_userId" ON "documentComment" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentImage_documentId" ON "documentImage" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentNote_documentId" ON "documentNote" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentNote_userId" ON "documentNote" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentPageVisit_documentId" ON "documentPageVisit" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_documentPageVisit_userId" ON "documentPageVisit" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_document_organizationId" ON "document" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_documentTag_text_unique" ON "documentTag" USING btree ("text" text_ops);--> statement-breakpoint
CREATE INDEX "IX_documentTask_documentId" ON "documentTask" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_favorite_documentId" ON "favorite" USING btree ("documentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_favorite_userId" ON "favorite" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_feedback_organizationId" ON "feedback" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_feedback_userId" ON "feedback" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_invitation_organizationId" ON "invitation" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_invitation_token" ON "invitation" USING btree ("token" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_membership_organizationId_userId_unique" ON "membership" USING btree ("organizationId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_membership_userId" ON "membership" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_membership_organizationId" ON "membership" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_notification_userId" ON "notification" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_organizationLogo_organizationId" ON "organizationLogo" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_organization_stripeCustomerId" ON "organization" USING btree ("stripeCustomerId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_organization_slug_unique" ON "organization" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "IX_resetPasswordRequest_email" ON "resetPasswordRequest" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "IX_session_userId" ON "session" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_userImage_userId" ON "userImage" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_user_email_unique" ON "user" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "IX_user_name" ON "user" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IX_verificationToken_identifier_unique" ON "verificationToken" USING btree ("identifier" text_ops,"token" text_ops);--> statement-breakpoint
CREATE INDEX "IX_workHours_organizationId" ON "workHours" USING btree ("organizationId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_workTimeSlot_workHoursId" ON "workTimeSlot" USING btree ("workHoursId" uuid_ops);