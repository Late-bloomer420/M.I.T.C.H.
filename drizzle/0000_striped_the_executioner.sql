CREATE TABLE `data_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_field` text NOT NULL,
	`pii_type_id` integer,
	`description` text,
	FOREIGN KEY (`pii_type_id`) REFERENCES `pii_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `identity_map` (
	`token_id` text PRIMARY KEY NOT NULL,
	`encrypted_real_value` text NOT NULL,
	`entity_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `pii_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pattern` text,
	`sensitivity_level` text DEFAULT 'HIGH',
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pii_types_name_unique` ON `pii_types` (`name`);