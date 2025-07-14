CREATE TYPE "public"."action_type" AS ENUM('create', 'update', 'edit', 'taskInQueue', 'taskRemovedFromQueue', 'assignWorker', 'unassignWorker', 'taskExecuted', 'taskCompleted', 'taskCancelled', 'taskFailed', 'taskSkipped', 'taskPaused', 'blockExecuted', 'delete');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('system', 'member', 'api');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'friday', 'saturday');--> statement-breakpoint
CREATE TYPE "public"."permission_type" AS ENUM('admin', 'write', 'read');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('todo', 'inProgress', 'inReview', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_task_status" AS ENUM('todo', 'inProgress', 'workComplete', 'humanNeeded', 'reviewed', 'error');--> statement-breakpoint
CREATE TYPE "public"."webhook_trigger" AS ENUM('workerCreated', 'workerUpdated', 'workerDeleted', 'taskCreated', 'taskUpdated', 'taskDeleted', 'projectCreated', 'projectUpdated', 'projectDeleted', 'memberCreated', 'memberUpdated', 'memberDeleted', 'chatCreated', 'chatUpdated', 'chatDeleted');--> statement-breakpoint
CREATE TYPE "public"."worker_record" AS ENUM('single', 'team');--> statement-breakpoint
CREATE TYPE "public"."worker_stage" AS ENUM('draft', 'paused', 'live');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "api_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "artifact_document" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"text" varchar DEFAULT 'text' NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "artifact_document_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"customizations" json DEFAULT '{}',
	"output_configs" json DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"schema" json NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"processing_error" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_hash" text NOT NULL,
	"content" text NOT NULL,
	"content_length" integer NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector(1536),
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"content_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embedding_not_null_check" CHECK ("embedding" IS NOT NULL),
	CONSTRAINT "embedding_content_length_valid" CHECK ("embedding"."content_length" = length("embedding"."content")),
	CONSTRAINT "embedding_chunk_index_positive" CHECK ("embedding"."chunk_index" >= 0),
	CONSTRAINT "embedding_token_count_positive" CHECK ("embedding"."token_count" >= 0),
	CONSTRAINT "embedding_offsets_valid" CHECK ("embedding"."start_offset" >= 0 AND "embedding"."end_offset" > "embedding"."start_offset")
);
--> statement-breakpoint
CREATE TABLE "environment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"variables" json NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "environment_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"workerId" uuid NOT NULL,
	"projectId" uuid,
	"taskId" uuid,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"inviter_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"embedding_dimension" integer DEFAULT 1536 NOT NULL,
	"chunking_config" json DEFAULT '{"maxSize": 1024, "minSize": 100, "overlap": 200}' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"state" json NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid,
	"key" text NOT NULL,
	"type" text NOT NULL,
	"data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"permission_type" "permission_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(2048),
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"stage" "project_stage" DEFAULT 'todo' NOT NULL,
	"priority" "priority" DEFAULT 'low' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"action_type" "action_type" NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" varchar(8000),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" varchar(128) NOT NULL,
	"color" varchar(128) DEFAULT '#3972F6' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_to_project_tag" (
	"project_id" uuid NOT NULL,
	"project_tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization_id" uuid,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"debug_mode" boolean DEFAULT false NOT NULL,
	"auto_connect" boolean DEFAULT true NOT NULL,
	"auto_fill_env_vars" boolean DEFAULT true NOT NULL,
	"telemetry_enabled" boolean DEFAULT true NOT NULL,
	"general" json DEFAULT '{}' NOT NULL,
	"email_preferences" json DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "stream" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean,
	"seats" integer,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "suggestion" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"artifact_document_id" uuid NOT NULL,
	"artifact_document_created_at" timestamp NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "suggestion_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" varchar(8000),
	"assignee_id" uuid,
	"tags" text[],
	"raw_result" jsonb NOT NULL,
	"result_report" text NOT NULL,
	"approved_by" uuid,
	"rejected_by" uuid,
	"priority" "priority" DEFAULT 'low' NOT NULL,
	"status" "project_task_status" DEFAULT 'todo' NOT NULL,
	"schedule_date" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"action_type" "action_type" NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_block_output" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_activity_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"block_name" text,
	"block_type" text NOT NULL,
	"execution_id" text NOT NULL,
	"output" jsonb NOT NULL,
	"input" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp (3) with time zone NOT NULL,
	"ended_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" varchar(2000) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" varchar(128) NOT NULL,
	"color" varchar(128) DEFAULT '#3972F6' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_to_task_tag" (
	"task_id" uuid NOT NULL,
	"task_tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"stripe_customer_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_manual_executions" bigint DEFAULT 0 NOT NULL,
	"total_api_calls" bigint DEFAULT 0 NOT NULL,
	"total_webhook_triggers" bigint DEFAULT 0 NOT NULL,
	"total_scheduled_executions" bigint DEFAULT 0 NOT NULL,
	"total_chat_executions" bigint DEFAULT 0 NOT NULL,
	"total_tokens_used" bigint DEFAULT 0 NOT NULL,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_stats_total_cost_positive" CHECK ("user_stats"."total_cost" >= 0),
	CONSTRAINT "user_stats_total_tokens_positive" CHECK ("user_stats"."total_tokens_used" >= 0),
	CONSTRAINT "user_stats_execution_counts_positive" CHECK ("user_stats"."total_manual_executions" >= 0 AND "user_stats"."total_api_calls" >= 0 AND "user_stats"."total_webhook_triggers" >= 0 AND "user_stats"."total_scheduled_executions" >= 0 AND "user_stats"."total_chat_executions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"chat_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"is_upvoted" boolean NOT NULL,
	CONSTRAINT "vote_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"path" text NOT NULL,
	"provider" text,
	"provider_config" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"day_of_week" "day_of_week" DEFAULT 'sunday' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_time_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_hours_id" uuid NOT NULL,
	"start" timestamp (2) NOT NULL,
	"end" timestamp (2) NOT NULL,
	CONSTRAINT "work_time_slot_time_range_valid" CHECK ("work_time_slot"."end" > "work_time_slot"."start")
);
--> statement-breakpoint
CREATE TABLE "worker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"email" varchar(255),
	"phone" varchar(32),
	"color" text DEFAULT '#3972F6' NOT NULL,
	"folder_id" text,
	"created_by" uuid NOT NULL,
	"last_synced" timestamp NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"is_deployed" boolean DEFAULT false NOT NULL,
	"deployed_state" jsonb,
	"deployed_at" timestamp,
	"collaborators" jsonb DEFAULT '[]' NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp,
	"variables" jsonb DEFAULT '{}',
	"marketplace_data" jsonb,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worker" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "worker_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"action_type" "action_type" NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"position_x" numeric NOT NULL,
	"position_y" numeric NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"horizontal_handles" boolean DEFAULT false NOT NULL,
	"is_wide" boolean DEFAULT false NOT NULL,
	"height" numeric DEFAULT '0' NOT NULL,
	"sub_blocks" jsonb DEFAULT '{}' NOT NULL,
	"outputs" jsonb DEFAULT '{}' NOT NULL,
	"data" jsonb DEFAULT '{}',
	"parent_id" text,
	"extent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" varchar(2000) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" uuid NOT NULL,
	"source_block_id" text NOT NULL,
	"target_block_id" text NOT NULL,
	"source_handle" text,
	"target_handle" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_execution_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"block_name" text,
	"block_type" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_ms" integer,
	"status" text NOT NULL,
	"error_message" text,
	"error_stack_trace" text,
	"input_data" jsonb,
	"output_data" jsonb,
	"cost_input" numeric(10, 6),
	"cost_output" numeric(10, 6),
	"cost_total" numeric(10, 6),
	"tokens_prompt" integer,
	"tokens_completion" integer,
	"tokens_total" integer,
	"model_used" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"execution_id" text NOT NULL,
	"state_snapshot_id" uuid NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"total_duration_ms" integer,
	"block_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(10, 6),
	"total_input_cost" numeric(10, 6),
	"total_output_cost" numeric(10, 6),
	"total_tokens" integer,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_execution_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"state_hash" text NOT NULL,
	"state_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" text,
	"color" text DEFAULT '#6B7280',
	"is_expanded" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"execution_id" text,
	"execution_result" jsonb,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"duration" text,
	"trigger" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "worker_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" varchar(8000),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"cron_expression" text,
	"next_run_at" timestamp,
	"last_ran_at" timestamp,
	"trigger_type" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "worker_schedule_worker_id_unique" UNIQUE("worker_id")
);
--> statement-breakpoint
CREATE TABLE "worker_subflows" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" uuid NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"color" text DEFAULT '#3972F6' NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"inviter_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"permissions" "permission_type" DEFAULT 'admin' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_document" ADD CONSTRAINT "artifact_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_tools" ADD CONSTRAINT "custom_tools_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_knowledge_base_id_knowledge_base_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_knowledge_base_id_knowledge_base_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment" ADD CONSTRAINT "environment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_workerId_worker_id_fk" FOREIGN KEY ("workerId") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_taskId_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace" ADD CONSTRAINT "marketplace_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace" ADD CONSTRAINT "marketplace_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_note" ADD CONSTRAINT "project_note_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_note" ADD CONSTRAINT "project_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_to_project_tag" ADD CONSTRAINT "project_to_project_tag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_to_project_tag" ADD CONSTRAINT "project_to_project_tag_project_tag_id_project_tag_id_fk" FOREIGN KEY ("project_tag_id") REFERENCES "public"."project_tag"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_artifact_document_fk" FOREIGN KEY ("artifact_document_id","artifact_document_created_at") REFERENCES "public"."artifact_document"("id","created_at") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_worker_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."worker"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_rejected_by_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_block_output" ADD CONSTRAINT "task_block_output_task_activity_id_task_activity_id_fk" FOREIGN KEY ("task_activity_id") REFERENCES "public"."task_activity"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_to_task_tag" ADD CONSTRAINT "task_to_task_tag_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_to_task_tag" ADD CONSTRAINT "task_to_task_tag_task_tag_id_task_tag_id_fk" FOREIGN KEY ("task_tag_id") REFERENCES "public"."task_tag"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "work_time_slot" ADD CONSTRAINT "work_time_slot_work_hours_id_work_hours_id_fk" FOREIGN KEY ("work_hours_id") REFERENCES "public"."work_hours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker" ADD CONSTRAINT "worker_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker" ADD CONSTRAINT "worker_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker" ADD CONSTRAINT "worker_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker" ADD CONSTRAINT "worker_folder_id_worker_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."worker_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker" ADD CONSTRAINT "worker_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_activity" ADD CONSTRAINT "worker_activity_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_blocks" ADD CONSTRAINT "worker_blocks_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_comment" ADD CONSTRAINT "worker_comment_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_comment" ADD CONSTRAINT "worker_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_edges" ADD CONSTRAINT "worker_edges_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_edges" ADD CONSTRAINT "worker_edges_source_block_id_worker_blocks_id_fk" FOREIGN KEY ("source_block_id") REFERENCES "public"."worker_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_edges" ADD CONSTRAINT "worker_edges_target_block_id_worker_blocks_id_fk" FOREIGN KEY ("target_block_id") REFERENCES "public"."worker_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_execution_blocks" ADD CONSTRAINT "worker_execution_blocks_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_execution_logs" ADD CONSTRAINT "worker_execution_logs_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_execution_logs" ADD CONSTRAINT "worker_execution_logs_state_snapshot_id_worker_execution_snapshots_id_fk" FOREIGN KEY ("state_snapshot_id") REFERENCES "public"."worker_execution_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_execution_snapshots" ADD CONSTRAINT "worker_execution_snapshots_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_folder" ADD CONSTRAINT "worker_folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_folder" ADD CONSTRAINT "worker_folder_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_logs" ADD CONSTRAINT "worker_logs_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_note" ADD CONSTRAINT "worker_note_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_note" ADD CONSTRAINT "worker_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "worker_schedule" ADD CONSTRAINT "worker_schedule_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_subflows" ADD CONSTRAINT "worker_subflows_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_user_id_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_key_idx" ON "api_key" USING btree ("key");--> statement-breakpoint
CREATE INDEX "api_key_expires_at_idx" ON "api_key" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "api_key_last_used_idx" ON "api_key" USING btree ("last_used");--> statement-breakpoint
CREATE INDEX "api_key_created_at_idx" ON "api_key" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_key_user_created_idx" ON "api_key" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "doc_kb_id_idx" ON "document" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "doc_filename_idx" ON "document" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "doc_kb_uploaded_at_idx" ON "document" USING btree ("knowledge_base_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "doc_processing_status_idx" ON "document" USING btree ("knowledge_base_id","processing_status");--> statement-breakpoint
CREATE INDEX "emb_kb_id_idx" ON "embedding" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "emb_doc_id_idx" ON "embedding" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emb_doc_chunk_idx" ON "embedding" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "emb_kb_model_idx" ON "embedding" USING btree ("knowledge_base_id","embedding_model");--> statement-breakpoint
CREATE INDEX "emb_kb_enabled_idx" ON "embedding" USING btree ("knowledge_base_id","enabled");--> statement-breakpoint
CREATE INDEX "emb_doc_enabled_idx" ON "embedding" USING btree ("document_id","enabled");--> statement-breakpoint
CREATE INDEX "embedding_vector_hnsw_idx" ON "embedding" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "emb_metadata_gin_idx" ON "embedding" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "emb_content_fts_idx" ON "embedding" USING gin ("content_tsv");--> statement-breakpoint
CREATE INDEX "IX_favorite_workerId" ON "favorite" USING btree ("workerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_favorite_userId" ON "favorite" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "kb_user_id_idx" ON "knowledge_base" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kb_workspace_id_idx" ON "knowledge_base" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "kb_user_workspace_idx" ON "knowledge_base" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "kb_deleted_at_idx" ON "knowledge_base" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "memory_key_idx" ON "memory" USING btree ("key");--> statement-breakpoint
CREATE INDEX "memory_worker_idx" ON "memory" USING btree ("worker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_worker_key_idx" ON "memory" USING btree ("worker_id","key");--> statement-breakpoint
CREATE INDEX "permissions_user_id_idx" ON "permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "permissions_entity_idx" ON "permissions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "permissions_user_entity_type_idx" ON "permissions" USING btree ("user_id","entity_type");--> statement-breakpoint
CREATE INDEX "permissions_user_entity_permission_idx" ON "permissions" USING btree ("user_id","entity_type","permission_type");--> statement-breakpoint
CREATE INDEX "permissions_user_entity_idx" ON "permissions" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_unique_constraint" ON "permissions" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "IX_project_activity_project_id" ON "project_activity" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_project_activity_occurred_at" ON "project_activity" USING btree ("occurred_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "IX_project_activity_action_type" ON "project_activity" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "IX_project_activity_actor_type" ON "project_activity" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "IX_project_activity_project_action" ON "project_activity" USING btree ("project_id","action_type");--> statement-breakpoint
CREATE INDEX "IX_project_activity_metadata_gin" ON "project_activity" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "project_note_project_id_idx" ON "project_note" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_note_user_id_idx" ON "project_note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_note_created_at_idx" ON "project_note" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_note_project_created_idx" ON "project_note" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "IX_project_tag_text_unique" ON "project_tag" USING btree ("text" text_ops);--> statement-breakpoint
CREATE INDEX "task_workspace_id_idx" ON "task" USING btree ("workspace_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_project_id_idx" ON "task" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_assignee_id_idx" ON "task" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_priority_idx" ON "task" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "task_created_at_idx" ON "task" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "task_updated_at_idx" ON "task" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "task_schedule_date_idx" ON "task" USING btree ("schedule_date");--> statement-breakpoint
CREATE INDEX "task_assignee_status_idx" ON "task" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "task_project_created_idx" ON "task" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "task_workspace_status_idx" ON "task" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "task_workspace_status_priority_idx" ON "task" USING btree ("workspace_id","status","priority");--> statement-breakpoint
CREATE INDEX "task_workspace_assignee_idx" ON "task" USING btree ("workspace_id","assignee_id");--> statement-breakpoint
CREATE INDEX "task_status_schedule_date_idx" ON "task" USING btree ("status","schedule_date");--> statement-breakpoint
CREATE INDEX "task_tags_gin_idx" ON "task" USING gin ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "task_raw_result_gin_idx" ON "task" USING gin ("raw_result" jsonb_ops);--> statement-breakpoint
CREATE INDEX "IX_task_activity_task_id" ON "task_activity" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_task_activity_occurred_at" ON "task_activity" USING btree ("occurred_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "IX_task_activity_action_type" ON "task_activity" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "IX_task_activity_actor_type" ON "task_activity" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "IX_task_activity_task_action" ON "task_activity" USING btree ("task_id","action_type");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_task_activity_id" ON "task_block_output" USING btree ("task_activity_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_task_block_output_execution_id" ON "task_block_output" USING btree ("execution_id" text_ops);--> statement-breakpoint
CREATE INDEX "IX_task_block_output_block_type" ON "task_block_output" USING btree ("block_type" text_ops);--> statement-breakpoint
CREATE INDEX "IX_task_block_output_block_id" ON "task_block_output" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_success" ON "task_block_output" USING btree ("success");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_duration" ON "task_block_output" USING btree ("duration_ms");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_started_at" ON "task_block_output" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_execution_type" ON "task_block_output" USING btree ("execution_id","block_type");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_execution_success" ON "task_block_output" USING btree ("execution_id","success");--> statement-breakpoint
CREATE INDEX "IX_task_block_output_output_gin" ON "task_block_output" USING gin ("output" jsonb_ops);--> statement-breakpoint
CREATE INDEX "IX_task_block_output_input_gin" ON "task_block_output" USING gin ("input" jsonb_ops);--> statement-breakpoint
CREATE INDEX "IX_task_comment_task_id" ON "task_comment" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_task_comment_user_id" ON "task_comment" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_task_comment_created_at" ON "task_comment" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "IX_task_tag_text_unique" ON "task_tag" USING btree ("text" text_ops);--> statement-breakpoint
CREATE INDEX "user_stats_user_id_idx" ON "user_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_stats_last_active_idx" ON "user_stats" USING btree ("last_active");--> statement-breakpoint
CREATE UNIQUE INDEX "path_idx" ON "webhook" USING btree ("path");--> statement-breakpoint
CREATE INDEX "IX_work_hours_organization_id" ON "work_hours" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_work_hours_day_of_week" ON "work_hours" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "IX_work_hours_org_day" ON "work_hours" USING btree ("organization_id","day_of_week");--> statement-breakpoint
CREATE INDEX "IX_work_time_slot_work_hours_id" ON "work_time_slot" USING btree ("work_hours_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_work_time_slot_start" ON "work_time_slot" USING btree ("start");--> statement-breakpoint
CREATE INDEX "IX_work_time_slot_end" ON "work_time_slot" USING btree ("end");--> statement-breakpoint
CREATE INDEX "IX_work_time_slot_hours_start" ON "work_time_slot" USING btree ("work_hours_id","start");--> statement-breakpoint
CREATE INDEX "worker_workspace_id_idx" ON "worker" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "worker_organization_id_idx" ON "worker" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "worker_created_by_idx" ON "worker" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "worker_folder_id_idx" ON "worker" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "worker_is_deployed_idx" ON "worker" USING btree ("is_deployed");--> statement-breakpoint
CREATE INDEX "worker_last_run_at_idx" ON "worker" USING btree ("last_run_at");--> statement-breakpoint
CREATE INDEX "worker_workspace_deployed_idx" ON "worker" USING btree ("workspace_id","is_deployed");--> statement-breakpoint
CREATE INDEX "worker_workspace_created_idx" ON "worker" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "worker_variables_gin_idx" ON "worker" USING gin ("variables" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_collaborators_gin_idx" ON "worker" USING gin ("collaborators" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_deployed_state_gin_idx" ON "worker" USING gin ("deployed_state" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_marketplace_data_gin_idx" ON "worker" USING gin ("marketplace_data" jsonb_ops);--> statement-breakpoint
CREATE INDEX "IX_worker_activity_worker_id" ON "worker_activity" USING btree ("worker_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "IX_worker_activity_occurred_at" ON "worker_activity" USING btree ("occurred_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "IX_worker_activity_action_type" ON "worker_activity" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "IX_worker_activity_actor_type" ON "worker_activity" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "IX_worker_activity_worker_action" ON "worker_activity" USING btree ("worker_id","action_type");--> statement-breakpoint
CREATE INDEX "IX_worker_activity_metadata_gin" ON "worker_activity" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_blocks_worker_id_idx" ON "worker_blocks" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_blocks_parent_id_idx" ON "worker_blocks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "worker_blocks_worker_parent_idx" ON "worker_blocks" USING btree ("worker_id","parent_id");--> statement-breakpoint
CREATE INDEX "worker_blocks_worker_type_idx" ON "worker_blocks" USING btree ("worker_id","type");--> statement-breakpoint
CREATE INDEX "worker_comment_worker_id_idx" ON "worker_comment" USING btree ("worker_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "worker_comment_user_id_idx" ON "worker_comment" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "worker_edges_worker_id_idx" ON "worker_edges" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_edges_source_block_idx" ON "worker_edges" USING btree ("source_block_id");--> statement-breakpoint
CREATE INDEX "worker_edges_target_block_idx" ON "worker_edges" USING btree ("target_block_id");--> statement-breakpoint
CREATE INDEX "worker_edges_worker_source_idx" ON "worker_edges" USING btree ("worker_id","source_block_id");--> statement-breakpoint
CREATE INDEX "worker_edges_worker_target_idx" ON "worker_edges" USING btree ("worker_id","target_block_id");--> statement-breakpoint
CREATE INDEX "execution_blocks_execution_id_idx" ON "worker_execution_blocks" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "execution_blocks_worker_id_idx" ON "worker_execution_blocks" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "execution_blocks_block_id_idx" ON "worker_execution_blocks" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "execution_blocks_status_idx" ON "worker_execution_blocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "execution_blocks_duration_idx" ON "worker_execution_blocks" USING btree ("duration_ms");--> statement-breakpoint
CREATE INDEX "execution_blocks_cost_idx" ON "worker_execution_blocks" USING btree ("cost_total");--> statement-breakpoint
CREATE INDEX "execution_blocks_worker_execution_idx" ON "worker_execution_blocks" USING btree ("worker_id","execution_id");--> statement-breakpoint
CREATE INDEX "execution_blocks_execution_status_idx" ON "worker_execution_blocks" USING btree ("execution_id","status");--> statement-breakpoint
CREATE INDEX "execution_blocks_started_at_idx" ON "worker_execution_blocks" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_worker_id_idx" ON "worker_execution_logs" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_execution_id_idx" ON "worker_execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_trigger_idx" ON "worker_execution_logs" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_level_idx" ON "worker_execution_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_started_at_idx" ON "worker_execution_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_cost_idx" ON "worker_execution_logs" USING btree ("total_cost");--> statement-breakpoint
CREATE INDEX "worker_execution_logs_duration_idx" ON "worker_execution_logs" USING btree ("total_duration_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_execution_logs_execution_id_unique" ON "worker_execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "worker_snapshots_worker_id_idx" ON "worker_execution_snapshots" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_snapshots_hash_idx" ON "worker_execution_snapshots" USING btree ("state_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_snapshots_worker_hash_idx" ON "worker_execution_snapshots" USING btree ("worker_id","state_hash");--> statement-breakpoint
CREATE INDEX "worker_snapshots_created_at_idx" ON "worker_execution_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "worker_logs_worker_id_idx" ON "worker_logs" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_logs_level_idx" ON "worker_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "worker_logs_created_at_idx" ON "worker_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "worker_logs_execution_id_idx" ON "worker_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "worker_logs_trigger_idx" ON "worker_logs" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "worker_logs_worker_level_idx" ON "worker_logs" USING btree ("worker_id","level");--> statement-breakpoint
CREATE INDEX "worker_logs_level_created_idx" ON "worker_logs" USING btree ("level","created_at");--> statement-breakpoint
CREATE INDEX "worker_logs_worker_created_idx" ON "worker_logs" USING btree ("worker_id","created_at");--> statement-breakpoint
CREATE INDEX "worker_logs_metadata_gin_idx" ON "worker_logs" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_logs_execution_result_gin_idx" ON "worker_logs" USING gin ("execution_result" jsonb_ops);--> statement-breakpoint
CREATE INDEX "worker_note_worker_id_idx" ON "worker_note" USING btree ("worker_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "worker_note_user_id_idx" ON "worker_note" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "worker_subflows_worker_id_idx" ON "worker_subflows" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_subflows_worker_type_idx" ON "worker_subflows" USING btree ("worker_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_workspace_idx" ON "workspace_member" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE POLICY "allow_members_crud_projects_in_workspace" ON "project" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "project"."workspace_id" AND "workspace_member"."user_id" = auth.uid()))) WITH CHECK ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "project"."workspace_id" AND "workspace_member"."user_id" = auth.uid())));--> statement-breakpoint
CREATE POLICY "allow_members_crud_tasks_in_workspace" ON "task" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "task"."workspace_id" AND "workspace_member"."user_id" = auth.uid()))) WITH CHECK ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "task"."workspace_id" AND "workspace_member"."user_id" = auth.uid())));--> statement-breakpoint
CREATE POLICY "allow_individual_read_access" ON "user" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "user"."id");--> statement-breakpoint
CREATE POLICY "allow_members_crud_workers_in_workspace" ON "worker" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "worker"."workspace_id" AND "workspace_member"."user_id" = auth.uid()))) WITH CHECK ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "worker"."workspace_id" AND "workspace_member"."user_id" = auth.uid())));--> statement-breakpoint
CREATE POLICY "allow_members_read_workspace" ON "workspace" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "workspace"."id" AND "workspace_member"."user_id" = auth.uid())));--> statement-breakpoint
CREATE POLICY "allow_members_update_workspace" ON "workspace" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = "workspace"."id" AND "workspace_member"."user_id" = auth.uid())));