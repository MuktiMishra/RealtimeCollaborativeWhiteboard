BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] TEXT,
    [access_token] TEXT,
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] TEXT,
    [session_state] NVARCHAR(1000),
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Account_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_sessionToken_key] UNIQUE NONCLUSTERED ([sessionToken])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[VerificationToken] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [VerificationToken_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [VerificationToken_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[Room] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Room_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [ownerId] NVARCHAR(1000) NOT NULL,
    [isPublic] BIT NOT NULL CONSTRAINT [Room_isPublic_df] DEFAULT 0,
    [lastAccessed] DATETIME2 NOT NULL CONSTRAINT [Room_lastAccessed_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Room_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RoomMember] (
    [id] NVARCHAR(1000) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [RoomMember_role_df] DEFAULT 'member',
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [RoomMember_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RoomMember_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoomMember_roomId_userId_key] UNIQUE NONCLUSTERED ([roomId],[userId])
);

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Room] ADD CONSTRAINT [Room_ownerId_fkey] FOREIGN KEY ([ownerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoomMember] ADD CONSTRAINT [RoomMember_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoomMember] ADD CONSTRAINT [RoomMember_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
