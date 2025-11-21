CREATE TYPE "public"."generation_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."model_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'sale');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deduction', 'topup', 'refund', 'admin_adjustment');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'sale');--> statement-breakpoint
CREATE TABLE "activityLogs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"userRole" "user_role" NOT NULL,
	"action" varchar(64) NOT NULL,
	"targetType" varchar(64) NOT NULL,
	"targetId" varchar(64),
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aiModels" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "model_type" NOT NULL,
	"provider" varchar(255) NOT NULL,
	"modelId" varchar(255) NOT NULL,
	"costPerGeneration" numeric(10, 1) DEFAULT '10.0' NOT NULL,
	"kiePrice" numeric(10, 1) DEFAULT '0.0' NOT NULL,
	"pricingOptions" text,
	"kiePricingOptions" text,
	"isActive" integer DEFAULT 1 NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apiKeys" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"apiKey" text NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"monthlyBudget" integer DEFAULT 0 NOT NULL,
	"currentSpend" integer DEFAULT 0 NOT NULL,
	"lastResetAt" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "codeRedemptions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"codeId" varchar(64) NOT NULL,
	"redeemedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creditTransactions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(10, 1) NOT NULL,
	"balanceAfter" numeric(10, 1) NOT NULL,
	"description" text NOT NULL,
	"relatedGenerationId" varchar(64),
	"relatedCodeId" varchar(64),
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"amount" numeric(10, 1) DEFAULT '0.0' NOT NULL,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"modelId" varchar(64) NOT NULL,
	"type" "model_type" NOT NULL,
	"prompt" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"taskId" text,
	"resultUrl" text,
	"resultUrls" text,
	"thumbnailUrl" text,
	"parameters" text,
	"errorMessage" text,
	"creditsUsed" numeric(10, 1) DEFAULT '0.0' NOT NULL,
	"kieCreditsUsed" numeric(10, 1) DEFAULT '0.0' NOT NULL,
	"refunded" integer DEFAULT 0 NOT NULL,
	"isHidden" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "inviteCodes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"credits" integer DEFAULT 100 NOT NULL,
	"maxUses" integer DEFAULT 1 NOT NULL,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"note" text,
	"createdBy" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"expiresAt" timestamp,
	CONSTRAINT "inviteCodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rolePermissions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"permissions" text NOT NULL,
	"updatedBy" varchar(64),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rolePermissions_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "systemSettings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" varchar(64) NOT NULL,
	"isSecret" integer DEFAULT 1 NOT NULL,
	"updatedBy" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "systemSettings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320) NOT NULL,
	"username" varchar(64),
	"bio" text,
	"phone" varchar(20),
	"birthday" varchar(10),
	"profilePicture" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"isVerified" integer DEFAULT 0 NOT NULL,
	"preferences" text,
	"createdAt" timestamp DEFAULT now(),
	"lastSignedIn" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verifiedCodes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"maxUses" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"note" text,
	"createdBy" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"expiresAt" timestamp,
	CONSTRAINT "verifiedCodes_code_unique" UNIQUE("code")
);
