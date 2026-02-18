ALTER TABLE identity_map ADD `content_hash` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `identity_map_content_hash_unique` ON `identity_map` (`content_hash`);