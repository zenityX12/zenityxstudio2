CREATE TABLE `systemSettings` (
	`id` varchar(64) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`isSecret` int NOT NULL DEFAULT 1,
	`updatedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
