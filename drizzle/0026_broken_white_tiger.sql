CREATE TABLE `activityLogs` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`userRole` enum('admin','sale') NOT NULL,
	`action` varchar(64) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` varchar(64),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
