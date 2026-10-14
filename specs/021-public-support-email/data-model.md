# Data model

Reuse dbo.system_configs config_key=platform.support_email; config_value is JSON {"value":"address"}. Empty string or legacy null means unconfigured. Admin updates preserve existing updated_by/updated_at and SETTINGS_CHANGED audit. No migration required. Public DTO contains only supportEmail. API envelope timestamp follows existing ApiResponse convention.
