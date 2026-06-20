-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REGULAR', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('CREDENTIALS', 'GOOGLE', 'YANDEX');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('VERIFICATION', 'TWO_FACTOR', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "DsGuildChannelType" AS ENUM ('TEXT', 'VOICE', 'CATEGORY', 'ANNOUNCEMENT', 'STAGE_VOICE', 'FORUM', 'MEDIA', 'THREAD_PUBLIC', 'THREAD_PRIVATE', 'THREAD_ANNOUNCEMENT', 'DIRECTORY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DsBotMessageBlockType" AS ENUM ('TEXT', 'EMBED');

-- CreateEnum
CREATE TYPE "DsBotMessageDispatchSourceType" AS ENUM ('FORM', 'TEMPLATES', 'INLINE');

-- CreateEnum
CREATE TYPE "DsBotMessageDispatchStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DsGuildMessageStatus" AS ENUM ('ACTIVE', 'MESSAGE_DELETED', 'CHANNEL_DELETED', 'GUILD_DELETED', 'GUILD_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "MonopolyCellPosition" AS ENUM ('TOP', 'RIGHT', 'BOTTOM', 'LEFT', 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT');

-- CreateEnum
CREATE TYPE "MonopolyCellElementType" AS ENUM ('CELL', 'ANGLE');

-- CreateEnum
CREATE TYPE "MonopolyCellType" AS ENUM ('STREET', 'CHANCE', 'COMMUNITY', 'COMMUNITY_CHEST', 'START', 'JAIL', 'PARKING', 'FREE_PARKING', 'GO_TO_JAIL', 'TAX', 'RAILROAD', 'UTILITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MonopolyActionType" AS ENUM ('RECEIVE_MONEY', 'PAY_MONEY', 'MOVE_TO_CELL', 'MOVE_STEPS', 'SKIP_TURN', 'GO_TO_JAIL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MonopolyMoveType" AS ENUM ('NULL', 'WAIT', 'DICE_ROLL_ON_THE_MOVE', 'DECISION_TO_BUY_A_STREET', 'AUCTION', 'CARD_ACTION');

-- CreateEnum
CREATE TYPE "MonopolyGameSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "picture" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REGULAR',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "method" "AuthMethod" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "Provider" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_in" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_settings" (
    "id" TEXT NOT NULL DEFAULT 'bonfire-id',
    "is_registration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bots" (
    "id" TEXT NOT NULL,
    "token_secret_bot" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_loading_sync" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guilds" (
    "id" TEXT NOT NULL,
    "is_loading_sync" BOOLEAN NOT NULL DEFAULT true,
    "guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "owner_id" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_guild_connections" (
    "id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_guild_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "global_name" TEXT,
    "avatar_url" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "is_user_bot" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guild_members" (
    "id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "user_db_id" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guild_member_roles" (
    "member_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ds_guild_member_roles_pkey" PRIMARY KEY ("member_id","role_id")
);

-- CreateTable
CREATE TABLE "ds_guild_roles" (
    "id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER,
    "position" INTEGER NOT NULL,
    "is_managed" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guild_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_guild_settings" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "voice_activity_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "message_module_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_role_enabled" BOOLEAN NOT NULL DEFAULT false,
    "temp_voice_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_guild_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guild_channels" (
    "id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "name" TEXT,
    "type" "DsGuildChannelType" NOT NULL,
    "position" INTEGER,
    "parent_channel_id" TEXT,
    "is_text_based" BOOLEAN NOT NULL DEFAULT false,
    "is_voice_based" BOOLEAN NOT NULL DEFAULT false,
    "is_thread" BOOLEAN NOT NULL DEFAULT false,
    "is_thread_only" BOOLEAN NOT NULL DEFAULT false,
    "can_send_messages" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guild_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guild_voice_sessions" (
    "id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guild_voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_message_templates" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DsBotMessageBlockType" NOT NULL,
    "content_json" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_message_forms" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_message_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_message_form_blocks" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "template_id" TEXT,
    "type" "DsBotMessageBlockType" NOT NULL,
    "content_json" JSONB,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_message_form_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_message_dispatches" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "source_type" "DsBotMessageDispatchSourceType" NOT NULL,
    "form_id" TEXT,
    "status" "DsBotMessageDispatchStatus" NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ds_bot_message_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bot_message_logs" (
    "id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "discord_message_id" TEXT NOT NULL,
    "discord_channel_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "DsGuildMessageStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_bot_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_guild_messages" (
    "id" TEXT NOT NULL,
    "guild_db_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "content" TEXT,
    "is_from_bot" BOOLEAN NOT NULL DEFAULT false,
    "is_from_our_bot" BOOLEAN NOT NULL DEFAULT false,
    "status" "DsGuildMessageStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ds_guild_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_game_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldWidthCells" INTEGER NOT NULL DEFAULT 11,
    "fieldHeightCells" INTEGER NOT NULL DEFAULT 11,
    "moneyPerLap" INTEGER NOT NULL DEFAULT 200,
    "minPlayers" INTEGER NOT NULL DEFAULT 2,
    "maxPlayers" INTEGER NOT NULL DEFAULT 6,
    "startMoney" INTEGER NOT NULL DEFAULT 1500,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monopoly_game_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_cell_templates" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" "MonopolyCellPosition" NOT NULL,
    "type_element" "MonopolyCellElementType" NOT NULL,
    "type" "MonopolyCellType",
    "price" INTEGER,
    "collection_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_cell_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_street_collection_templates" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_street_collection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_card_group_templates" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_card_group_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_card_templates" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_card_action_templates" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "action_type" "MonopolyActionType" NOT NULL,
    "amount" INTEGER,
    "target_cell_id" TEXT,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_card_action_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_game_sessions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" "MonopolyGameSessionStatus" NOT NULL DEFAULT 'WAITING',
    "name" TEXT,
    "players_count" INTEGER NOT NULL,
    "current_turn_player_id" TEXT,
    "current_type_turn" "MonopolyMoveType" NOT NULL DEFAULT 'NULL',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "monopoly_game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_game_session_players" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "money" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL,
    "color_id" TEXT,
    "figurine_id" TEXT,
    "is_bankrupt" BOOLEAN NOT NULL DEFAULT false,
    "is_ready" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_game_session_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_game_session_properties" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_player_id" TEXT,
    "cell_template_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "is_mortgaged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_game_session_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_figurines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "collection_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_figurines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_figurine_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_figurine_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monopoly_player_colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_player_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ds_bots_token_secret_bot_key" ON "ds_bots"("token_secret_bot");

-- CreateIndex
CREATE UNIQUE INDEX "ds_guilds_guild_id_key" ON "ds_guilds"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_bot_guild_connections_bot_id_guild_db_id_key" ON "ds_bot_guild_connections"("bot_id", "guild_db_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_users_user_id_key" ON "ds_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_guild_members_guild_db_id_user_db_id_key" ON "ds_guild_members"("guild_db_id", "user_db_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_guild_roles_guild_db_id_role_id_key" ON "ds_guild_roles"("guild_db_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_bot_guild_settings_connection_id_key" ON "ds_bot_guild_settings"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_guild_channels_guild_db_id_channel_id_key" ON "ds_guild_channels"("guild_db_id", "channel_id");

-- CreateIndex
CREATE INDEX "ds_guild_voice_sessions_guild_db_id_idx" ON "ds_guild_voice_sessions"("guild_db_id");

-- CreateIndex
CREATE INDEX "ds_guild_voice_sessions_member_id_idx" ON "ds_guild_voice_sessions"("member_id");

-- CreateIndex
CREATE INDEX "ds_guild_voice_sessions_channel_id_idx" ON "ds_guild_voice_sessions"("channel_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_templates_creator_id_idx" ON "ds_bot_message_templates"("creator_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_templates_is_public_idx" ON "ds_bot_message_templates"("is_public");

-- CreateIndex
CREATE INDEX "ds_bot_message_forms_creator_id_idx" ON "ds_bot_message_forms"("creator_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_forms_is_public_idx" ON "ds_bot_message_forms"("is_public");

-- CreateIndex
CREATE INDEX "ds_bot_message_form_blocks_form_id_idx" ON "ds_bot_message_form_blocks"("form_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_form_blocks_template_id_idx" ON "ds_bot_message_form_blocks"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "ds_bot_message_form_blocks_form_id_position_key" ON "ds_bot_message_form_blocks"("form_id", "position");

-- CreateIndex
CREATE INDEX "ds_bot_message_dispatches_connection_id_idx" ON "ds_bot_message_dispatches"("connection_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_dispatches_channel_id_idx" ON "ds_bot_message_dispatches"("channel_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_dispatches_created_by_id_idx" ON "ds_bot_message_dispatches"("created_by_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_dispatches_form_id_idx" ON "ds_bot_message_dispatches"("form_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_logs_dispatch_id_idx" ON "ds_bot_message_logs"("dispatch_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_logs_discord_message_id_idx" ON "ds_bot_message_logs"("discord_message_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_logs_discord_channel_id_idx" ON "ds_bot_message_logs"("discord_channel_id");

-- CreateIndex
CREATE INDEX "ds_bot_message_logs_status_idx" ON "ds_bot_message_logs"("status");

-- CreateIndex
CREATE INDEX "ds_bot_message_logs_is_deleted_idx" ON "ds_bot_message_logs"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "ds_bot_message_logs_discord_channel_id_discord_message_id_key" ON "ds_bot_message_logs"("discord_channel_id", "discord_message_id");

-- CreateIndex
CREATE INDEX "ds_guild_messages_guild_db_id_idx" ON "ds_guild_messages"("guild_db_id");

-- CreateIndex
CREATE INDEX "ds_guild_messages_channel_id_idx" ON "ds_guild_messages"("channel_id");

-- CreateIndex
CREATE INDEX "ds_guild_messages_message_id_idx" ON "ds_guild_messages"("message_id");

-- CreateIndex
CREATE INDEX "ds_guild_messages_author_user_id_idx" ON "ds_guild_messages"("author_user_id");

-- CreateIndex
CREATE INDEX "ds_guild_messages_status_idx" ON "ds_guild_messages"("status");

-- CreateIndex
CREATE INDEX "ds_guild_messages_is_deleted_idx" ON "ds_guild_messages"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "ds_guild_messages_channel_id_message_id_key" ON "ds_guild_messages"("channel_id", "message_id");

-- CreateIndex
CREATE INDEX "monopoly_cell_templates_template_id_idx" ON "monopoly_cell_templates"("template_id");

-- CreateIndex
CREATE INDEX "monopoly_cell_templates_collection_id_idx" ON "monopoly_cell_templates"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "monopoly_cell_templates_template_id_order_index_key" ON "monopoly_cell_templates"("template_id", "order_index");

-- CreateIndex
CREATE INDEX "monopoly_street_collection_templates_template_id_idx" ON "monopoly_street_collection_templates"("template_id");

-- CreateIndex
CREATE INDEX "monopoly_card_group_templates_template_id_idx" ON "monopoly_card_group_templates"("template_id");

-- CreateIndex
CREATE INDEX "monopoly_card_templates_group_id_idx" ON "monopoly_card_templates"("group_id");

-- CreateIndex
CREATE INDEX "monopoly_card_action_templates_card_id_idx" ON "monopoly_card_action_templates"("card_id");

-- CreateIndex
CREATE INDEX "monopoly_card_action_templates_target_cell_id_idx" ON "monopoly_card_action_templates"("target_cell_id");

-- CreateIndex
CREATE UNIQUE INDEX "monopoly_game_session_players_session_id_user_id_key" ON "monopoly_game_session_players"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "monopoly_game_session_properties_session_id_cell_template_i_key" ON "monopoly_game_session_properties"("session_id", "cell_template_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_guild_connections" ADD CONSTRAINT "ds_bot_guild_connections_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "ds_bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_guild_connections" ADD CONSTRAINT "ds_bot_guild_connections_guild_db_id_fkey" FOREIGN KEY ("guild_db_id") REFERENCES "ds_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_members" ADD CONSTRAINT "ds_guild_members_guild_db_id_fkey" FOREIGN KEY ("guild_db_id") REFERENCES "ds_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_members" ADD CONSTRAINT "ds_guild_members_user_db_id_fkey" FOREIGN KEY ("user_db_id") REFERENCES "ds_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_member_roles" ADD CONSTRAINT "ds_guild_member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ds_guild_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_member_roles" ADD CONSTRAINT "ds_guild_member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "ds_guild_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_roles" ADD CONSTRAINT "ds_guild_roles_guild_db_id_fkey" FOREIGN KEY ("guild_db_id") REFERENCES "ds_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_guild_settings" ADD CONSTRAINT "ds_bot_guild_settings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "ds_bot_guild_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_channels" ADD CONSTRAINT "ds_guild_channels_guild_db_id_fkey" FOREIGN KEY ("guild_db_id") REFERENCES "ds_guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_guild_voice_sessions" ADD CONSTRAINT "ds_guild_voice_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ds_guild_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_templates" ADD CONSTRAINT "ds_bot_message_templates_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_forms" ADD CONSTRAINT "ds_bot_message_forms_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_form_blocks" ADD CONSTRAINT "ds_bot_message_form_blocks_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "ds_bot_message_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_form_blocks" ADD CONSTRAINT "ds_bot_message_form_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ds_bot_message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_dispatches" ADD CONSTRAINT "ds_bot_message_dispatches_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "ds_bot_guild_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_dispatches" ADD CONSTRAINT "ds_bot_message_dispatches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_dispatches" ADD CONSTRAINT "ds_bot_message_dispatches_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "ds_bot_message_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bot_message_logs" ADD CONSTRAINT "ds_bot_message_logs_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "ds_bot_message_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_cell_templates" ADD CONSTRAINT "monopoly_cell_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "monopoly_game_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_cell_templates" ADD CONSTRAINT "monopoly_cell_templates_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "monopoly_street_collection_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_street_collection_templates" ADD CONSTRAINT "monopoly_street_collection_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "monopoly_game_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_card_group_templates" ADD CONSTRAINT "monopoly_card_group_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "monopoly_game_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_card_templates" ADD CONSTRAINT "monopoly_card_templates_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "monopoly_card_group_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_card_action_templates" ADD CONSTRAINT "monopoly_card_action_templates_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "monopoly_card_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_card_action_templates" ADD CONSTRAINT "monopoly_card_action_templates_target_cell_id_fkey" FOREIGN KEY ("target_cell_id") REFERENCES "monopoly_cell_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_game_sessions" ADD CONSTRAINT "monopoly_game_sessions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "monopoly_game_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_game_session_players" ADD CONSTRAINT "monopoly_game_session_players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "monopoly_game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_game_session_properties" ADD CONSTRAINT "monopoly_game_session_properties_session_player_id_fkey" FOREIGN KEY ("session_player_id") REFERENCES "monopoly_game_session_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monopoly_figurines" ADD CONSTRAINT "monopoly_figurines_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "monopoly_figurine_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
