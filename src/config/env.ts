import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
};

if (!config.geminiApiKey) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY is not set in .env file');
}
