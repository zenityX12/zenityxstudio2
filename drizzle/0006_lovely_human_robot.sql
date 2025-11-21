CREATE TABLE `creditTransactions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`type` enum('deduction','topup','refund','admin_adjustment') NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` text NOT NULL,
	`relatedGenerationId` varchar(64),
	`relatedCodeId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generations` ADD `refunded` boolean DEFAULT false NOT NULL;