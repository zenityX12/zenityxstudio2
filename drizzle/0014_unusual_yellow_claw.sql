CREATE TABLE `codeRedemptions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`codeId` varchar(64) NOT NULL,
	`redeemedAt` timestamp DEFAULT (now()),
	CONSTRAINT `codeRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verifiedCodes` (
	`id` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `verifiedCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifiedCodes_code_unique` UNIQUE(`code`)
);
