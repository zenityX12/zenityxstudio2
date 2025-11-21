ALTER TABLE `inviteCodes` DROP INDEX `inviteCodes_code_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `verifiedCodes` DROP INDEX `verifiedCodes_code_unique`;--> statement-breakpoint
ALTER TABLE `aiModels` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `apiKeys` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `codeRedemptions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `creditTransactions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `credits` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `generations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `inviteCodes` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `verifiedCodes` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `lastResetAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `codeRedemptions` MODIFY COLUMN `redeemedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `amount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `balanceAfter` int NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `amount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `amount` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `updatedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `type` enum('image','video') NOT NULL DEFAULT 'image';--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` tinyint;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `inviteCodes` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `inviteCodes` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `verifiedCodes` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `verifiedCodes` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
CREATE INDEX `inviteCodes_code_unique` ON `inviteCodes` (`code`);--> statement-breakpoint
CREATE INDEX `username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `code` ON `verifiedCodes` (`code`);