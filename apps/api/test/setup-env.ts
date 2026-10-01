// Real environment variables win over apps/api/.env, so tests never touch the dev database.
process.env['NODE_ENV'] = 'test';
process.env['POSTGRES_DB'] = process.env['POSTGRES_TEST_DB'] ?? 'roadpulse_test';
