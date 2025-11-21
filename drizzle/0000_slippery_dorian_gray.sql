CREATE TABLE `activityLogs` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`userRole` enum('admin','sale') NOT NULL,
	`action` varchar(64) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` varchar(64),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiModels` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('image','video') NOT NULL,
	`provider` varchar(255) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`costPerGeneration` decimal(10,1) NOT NULL DEFAULT '10.0',
	`kiePrice` decimal(10,1) NOT NULL DEFAULT '0.0',
	`pricingOptions` text,
	`kiePricingOptions` text,
	`isActive` int NOT NULL DEFAULT 1,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `aiModels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKeys` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`apiKey` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`monthlyBudget` int NOT NULL DEFAULT 0,
	`currentSpend` int NOT NULL DEFAULT 0,
	`lastResetAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `codeRedemptions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`codeId` varchar(64) NOT NULL,
	`redeemedAt` timestamp DEFAULT (now()),
	CONSTRAINT `codeRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creditTransactions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`type` enum('deduction','topup','refund','admin_adjustment') NOT NULL,
	`amount` decimal(10,1) NOT NULL,
	`balanceAfter` decimal(10,1) NOT NULL,
	`description` text NOT NULL,
	`relatedGenerationId` varchar(64),
	`relatedCodeId` varchar(64),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`amount` decimal(10,1) NOT NULL DEFAULT '0.0',
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`modelId` varchar(64) NOT NULL,
	`type` enum('image','video') NOT NULL,
	`prompt` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`taskId` text,
	`resultUrl` text,
	`resultUrls` text,
	`thumbnailUrl` text,
	`parameters` text,
	`errorMessage` text,
	`creditsUsed` decimal(10,1) NOT NULL DEFAULT '0.0',
	`kieCreditsUsed` decimal(10,1) NOT NULL DEFAULT '0.0',
	`refunded` int NOT NULL DEFAULT 0,
	`isHidden` int NOT NULL DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteCodes` (
	`id` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`credits` int NOT NULL DEFAULT 100,
	`maxUses` int NOT NULL DEFAULT 1,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`note` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `inviteCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`id` varchar(64) NOT NULL,
	`role` enum('user','admin','sale') NOT NULL,
	`permissions` text NOT NULL,
	`updatedBy` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rolePermissions_role_unique` UNIQUE(`role`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` varchar(64) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`isSecret` int NOT NULL DEFAULT 1,
	`updatedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`username` varchar(64),
	`bio` text,
	`phone` varchar(20),
	`birthday` varchar(10),
	`profilePicture` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin','sale') NOT NULL DEFAULT 'user',
	`isVerified` int NOT NULL DEFAULT 1,
	`preferences` text,
	`createdAt` timestamp DEFAULT (now()),
	`lastSignedIn` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `verifiedCodes` (
	`id` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`note` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `verifiedCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifiedCodes_code_unique` UNIQUE(`code`)
);
