ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `birthday` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `profilePicture` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferences` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);