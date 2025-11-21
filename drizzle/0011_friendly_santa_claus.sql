ALTER TABLE `creditTransactions` MODIFY COLUMN `amount` decimal(10,1) NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `balanceAfter` decimal(10,1) NOT NULL;--> statement-breakpoint
ALTER TABLE `credits` MODIFY COLUMN `amount` decimal(10,1) NOT NULL DEFAULT '0.0';