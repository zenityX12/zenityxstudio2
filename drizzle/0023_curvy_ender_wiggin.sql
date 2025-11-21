DROP TABLE `omnihumanGenerations`;--> statement-breakpoint
ALTER TABLE `aiModels` MODIFY COLUMN `type` enum('image','video') NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` MODIFY COLUMN `type` enum('image','video') NOT NULL;