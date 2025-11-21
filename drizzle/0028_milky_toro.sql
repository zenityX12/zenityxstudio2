CREATE TABLE `rolePermissions` (
	`id` varchar(64) NOT NULL,
	`role` enum('user','admin','sale') NOT NULL,
	`permissions` text NOT NULL,
	`updatedBy` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rolePermissions_role_unique` UNIQUE(`role`)
);
