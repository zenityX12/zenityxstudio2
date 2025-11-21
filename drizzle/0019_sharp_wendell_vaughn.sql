ALTER TABLE `aiModels` MODIFY COLUMN `isActive` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `isActive` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` int NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` int NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `inviteCodes` MODIFY COLUMN `isActive` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `verifiedCodes` MODIFY COLUMN `isActive` int NOT NULL DEFAULT 1;