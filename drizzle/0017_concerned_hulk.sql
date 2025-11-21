ALTER TABLE `creditTransactions` MODIFY COLUMN `type` enum('deduction','topup','refund','admin_adjustment') NOT NULL;--> statement-breakpoint
ALTER TABLE `credits` DROP COLUMN `onHoldCredits`;--> statement-breakpoint
ALTER TABLE `generations` DROP COLUMN `creditHeld`;