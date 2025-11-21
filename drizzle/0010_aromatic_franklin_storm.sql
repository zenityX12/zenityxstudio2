ALTER TABLE `aiModels` MODIFY COLUMN `costPerGeneration` decimal(10,1) NOT NULL DEFAULT '10.0';--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `kiePrice` decimal(10,1) NOT NULL DEFAULT '0.0';--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `creditsUsed` decimal(10,1) NOT NULL DEFAULT '0.0';--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `kieCreditsUsed` decimal(10,1) NOT NULL DEFAULT '0.0';