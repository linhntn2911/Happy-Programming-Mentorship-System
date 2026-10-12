IF COL_LENGTH('dbo.files', 'file_content') IS NULL
BEGIN
    ALTER TABLE dbo.files ADD file_content VARBINARY(MAX) NULL;
END;

