BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CanvasElement] (
    [id] NVARCHAR(1000) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [tool] NVARCHAR(1000) NOT NULL,
    [props] TEXT NOT NULL,
    [elementId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CanvasElement_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CanvasElement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CanvasElement_roomId_idx] ON [dbo].[CanvasElement]([roomId]);

-- AddForeignKey
ALTER TABLE [dbo].[CanvasElement] ADD CONSTRAINT [CanvasElement_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
