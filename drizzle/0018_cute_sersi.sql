DROP INDEX `inviteCodes_code_unique` ON `inviteCodes`;--> statement-breakpoint
DROP INDEX `username_unique` ON `users`;--> statement-breakpoint
DROP INDEX `code` ON `verifiedCodes`;--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `lastResetAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `codeRedemptions` MODIFY COLUMN `redeemedAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `amount` decimal(10,1) NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `balanceAfter` decimal(10,1) NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `amount` decimal(10,1) NOT NULL DEFAULT '0.0';--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `type` enum('image','video') NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `refunded` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `isHidden` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `inviteCodes` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `inviteCodes` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isVerified` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `verifiedCodes` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `verifiedCodes` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `aiModels` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `apiKeys` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `codeRedemptions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `creditTransactions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `credits` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `generations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `inviteCodes` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `users` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `verifiedCodes` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `inviteCodes` ADD CONSTRAINT `inviteCodes_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `verifiedCodes` ADD CONSTRAINT `verifiedCodes_code_unique` UNIQUE(`code`);