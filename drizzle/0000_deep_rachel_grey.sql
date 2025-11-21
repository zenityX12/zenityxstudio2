CREATE TABLE `aiModels` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('image','video') NOT NULL,
	`provider` varchar(255) NOT NULL,
	`modelId` varchar(255) NOT NULL,
	`costPerGeneration` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `aiModels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKeys` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`apiKey` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`monthlyBudget` int NOT NULL DEFAULT 0,
	`currentSpend` int NOT NULL DEFAULT 0,
	`lastResetAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`modelId` varchar(64) NOT NULL,
	`prompt` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`taskId` text,
	`resultUrl` text,
	`errorMessage` text,
	`creditsUsed` int NOT NULL DEFAULT 0,
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
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `inviteCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp DEFAULT (now()),
	`lastSignedIn` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
