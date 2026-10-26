import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull(),photoStorageVersion:integer('photo_storage_version').notNull().default(0),mutationId:text('mutation_id').notNull().default('')});

export const lightroomConnections=sqliteTable('lightroom_connections',{id:text('id').primaryKey(),tokenHash:text('token_hash').notNull().unique(),galleryId:text('gallery_id').notNull(),name:text('name').notNull(),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull(),revoked:integer('revoked').notNull().default(0)});

export const galleryPhotos=sqliteTable('gallery_photos',{id:text('id').primaryKey(),galleryId:text('gallery_id').notNull(),sourceId:text('source_id').notNull(),position:integer('position').notNull(),payload:text('payload').notNull()},t=>[index('gallery_photos_order').on(t.galleryId,t.position),uniqueIndex('gallery_photos_source').on(t.galleryId,t.sourceId)]);
export const workspaceLegacySnapshots=sqliteTable('workspace_legacy_snapshots',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull()});

export const client_contacts=sqliteTable('client_contacts',{ id:text('id') .primaryKey(),name:text('name').notNull(),email:text('email').unique(),created_at:text('created_at').notNull() });

export const client_sessions=sqliteTable('client_sessions',{ hash:text('hash') .primaryKey(),contact_id:text('contact_id').notNull(),expires:integer('expires').notNull() });

export const client_magic=sqliteTable('client_magic',{ hash:text('hash') .primaryKey(),email:text('email').notNull(),expires:integer('expires').notNull() });

export const client_mail_limits=sqliteTable('client_mail_limits',{ email:text('email') .primaryKey(),count:integer('count').notNull(),window:integer('window').notNull() });

export const client_visits=sqliteTable('client_visits',{ id:text('id') .primaryKey(),contact_id:text('contact_id').notNull(),gallery_id:text('gallery_id').notNull(),reviewer_id:text('reviewer_id').notNull(),link_id:text('link_id').notNull(),title:text('title').notNull(),first_at:text('first_at'),last_at:text('last_at') },t=>[index('client_visits_contact').on(t.contact_id)]);

export const client_downloads=sqliteTable('client_downloads',{ id:text('id') .primaryKey(),contact_id:text('contact_id').notNull(),visit_id:text('visit_id').notNull(),title:text('title').notNull(),files:text('files').notNull(),size:text('size').notNull(),requested_at:text('requested_at').notNull(),received_at:text('received_at') },t=>[index('client_downloads_contact').on(t.contact_id,t.requested_at)]);

export const client_journal=sqliteTable('client_journal',{ id:text('id') .primaryKey(),contact_id:text('contact_id').notNull(),visibility:text('visibility').notNull(),body:text('body').notNull(),created_at:text('created_at').notNull() },t=>[index('client_journal_contact').on(t.contact_id,t.created_at)]);

export const client_alert_settings=sqliteTable('client_alert_settings',{id:text('id').primaryKey(),payload:text('payload').notNull()});
export const portfolio_state=sqliteTable('portfolio_state',{id:text('id').primaryKey(),draft:text('draft').notNull(),published:text('published'),revision:integer('revision').notNull().default(0),published_at:text('published_at')});
export const portfolio_assets=sqliteTable('portfolio_assets',{id:text('id').primaryKey(),removed:integer('removed').notNull().default(0),storage_key:text('storage_key').notNull(),source:text('source'),width:integer('width').notNull(),height:integer('height').notNull(),alt:text('alt').notNull(),created_at:text('created_at').notNull()});

export const portfolio_library=sqliteTable('portfolio_library',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0)});

export const usage_events=sqliteTable('usage_events',{id:text('id').primaryKey(),kind:text('kind').notNull(),at:text('at').notNull(),actor:text('actor').notNull(),account_id:text('account_id').notNull(),audience:text('audience').notNull(),gallery_id:text('gallery_id').notNull(),page:text('page').notNull(),from_page:text('from_page').notNull(),file_count:integer('file_count').notNull(),operation_id:text('operation_id').notNull().default('')},t=>[index('usage_events_at').on(t.at)]);
export const usage_collection=sqliteTable('usage_collection',{id:text('id').primaryKey(),started_at:text('started_at').notNull()});
export const usage_exclusions=sqliteTable('usage_exclusions',{id:text('id').primaryKey(),kind:text('kind').notNull(),subject:text('subject').notNull()});
