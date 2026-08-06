-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_tokenHash_key`(`tokenHash`),
    INDEX `admin_sessions_adminId_idx`(`adminId`),
    INDEX `admin_sessions_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anonymous_devices` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notificationsLastViewedAt` DATETIME(3) NULL,
    `cooldownPostAt` DATETIME(3) NULL,
    `cooldownReplyAt` DATETIME(3) NULL,

    UNIQUE INDEX `anonymous_devices_tokenHash_key`(`tokenHash`),
    INDEX `anonymous_devices_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_generations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `generationNum` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'ENDING', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `saveCount` INTEGER NOT NULL DEFAULT 0,
    `postCount` INTEGER NOT NULL DEFAULT 0,
    `replyCount` INTEGER NOT NULL DEFAULT 0,
    `reactionCount` INTEGER NOT NULL DEFAULT 0,
    `longestThreadMs` BIGINT NULL,
    `totalDurationMs` BIGINT NULL,
    `endReason` VARCHAR(191) NULL,

    UNIQUE INDEX `site_generations_generationNum_key`(`generationNum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `generationId` INTEGER NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `absoluteExpiresAt` DATETIME(3) NOT NULL,
    `savedWebsite` BOOLEAN NOT NULL DEFAULT false,
    `replyCount` INTEGER NOT NULL DEFAULT 0,
    `reactionCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `posts_publicId_key`(`publicId`),
    INDEX `posts_generationId_status_createdAt_idx`(`generationId`, `status`, `createdAt`),
    INDEX `posts_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `posts_status_lastActivityAt_idx`(`status`, `lastActivityAt`),
    INDEX `posts_status_replyCount_idx`(`status`, `replyCount`),
    INDEX `posts_deviceId_idx`(`deviceId`),
    INDEX `posts_savedWebsite_idx`(`savedWebsite`),
    INDEX `posts_publicId_idx`(`publicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `replies` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `parentReplyId` VARCHAR(191) NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reactionCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `replies_publicId_key`(`publicId`),
    INDEX `replies_postId_status_idx`(`postId`, `status`),
    INDEX `replies_deviceId_idx`(`deviceId`),
    INDEX `replies_status_idx`(`status`),
    INDEX `replies_parentReplyId_idx`(`parentReplyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reactions` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('POST', 'REPLY') NOT NULL,
    `postId` VARCHAR(191) NULL,
    `replyId` VARCHAR(191) NULL,
    `reactionType` ENUM('UNDERSTAND', 'NOT_ALONE', 'THAT_HURT', 'NEED_CONTEXT', 'TELL_MORE', 'DISAGREE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hasExtended` BOOLEAN NOT NULL DEFAULT false,

    INDEX `reactions_postId_idx`(`postId`),
    INDEX `reactions_replyId_idx`(`replyId`),
    INDEX `reactions_deviceId_idx`(`deviceId`),
    UNIQUE INDEX `reactions_deviceId_postId_reactionType_key`(`deviceId`, `postId`, `reactionType`),
    UNIQUE INDEX `reactions_deviceId_replyId_reactionType_key`(`deviceId`, `replyId`, `reactionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `type` ENUM('REPLY_TO_POST', 'REPLY_TO_REPLY', 'REACTION_ON_POST', 'REACTION_ON_REPLY') NOT NULL,
    `postId` VARCHAR(191) NULL,
    `replyId` VARCHAR(191) NULL,
    `triggerDeviceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `viewedAt` DATETIME(3) NULL,

    INDEX `activity_notifications_recipientId_viewedAt_idx`(`recipientId`, `viewedAt`),
    INDEX `activity_notifications_postId_idx`(`postId`),
    INDEX `activity_notifications_replyId_idx`(`replyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('POST', 'REPLY') NOT NULL,
    `postId` VARCHAR(191) NULL,
    `replyId` VARCHAR(191) NULL,
    `reason` ENUM('HARASSMENT', 'THREATS', 'PERSONAL_INFO', 'SEXUAL', 'HATE', 'SPAM', 'ILLEGAL', 'SELF_HARM', 'OTHER') NOT NULL,
    `note` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `reports_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `reports_postId_idx`(`postId`),
    INDEX `reports_replyId_idx`(`replyId`),
    UNIQUE INDEX `reports_deviceId_postId_reason_key`(`deviceId`, `postId`, `reason`),
    UNIQUE INDEX `reports_deviceId_replyId_reason_key`(`deviceId`, `replyId`, `reason`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `moderation_actions` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `actionType` ENUM('HIDE_POST', 'RESTORE_POST', 'DELETE_POST', 'HIDE_REPLY', 'RESTORE_REPLY', 'DELETE_REPLY', 'DISMISS_REPORT', 'ACTION_REPORT') NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `moderation_actions_adminId_idx`(`adminId`),
    INDEX `moderation_actions_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `moderation_actions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_themes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(500) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_themes_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocked_terms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pattern` VARCHAR(500) NOT NULL,
    `isRegex` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blocked_terms_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limit_records` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `lastAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rate_limit_records_windowStart_idx`(`windowStart`),
    UNIQUE INDEX `rate_limit_records_deviceId_action_windowStart_key`(`deviceId`, `action`, `windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cleanup_runs` (
    `id` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `generationEnded` BOOLEAN NOT NULL DEFAULT false,
    `postsDeleted` INTEGER NOT NULL DEFAULT 0,
    `repliesDeleted` INTEGER NOT NULL DEFAULT 0,
    `reactionsDeleted` INTEGER NOT NULL DEFAULT 0,
    `notificationsClean` INTEGER NOT NULL DEFAULT 0,
    `rateLimitsCleaned` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,

    INDEX `cleanup_runs_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_generationId_fkey` FOREIGN KEY (`generationId`) REFERENCES `site_generations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `anonymous_devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replies` ADD CONSTRAINT `replies_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replies` ADD CONSTRAINT `replies_parentReplyId_fkey` FOREIGN KEY (`parentReplyId`) REFERENCES `replies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `replies` ADD CONSTRAINT `replies_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `anonymous_devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `anonymous_devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_replyId_fkey` FOREIGN KEY (`replyId`) REFERENCES `replies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_notifications` ADD CONSTRAINT `activity_notifications_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `anonymous_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_notifications` ADD CONSTRAINT `activity_notifications_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_notifications` ADD CONSTRAINT `activity_notifications_replyId_fkey` FOREIGN KEY (`replyId`) REFERENCES `replies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `anonymous_devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_replyId_fkey` FOREIGN KEY (`replyId`) REFERENCES `replies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `moderation_actions` ADD CONSTRAINT `moderation_actions_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_limit_records` ADD CONSTRAINT `rate_limit_records_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `anonymous_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
