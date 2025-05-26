import { executeQuery } from './database';

export async function setSessionTimezone(): Promise<void> {
  try {
    await executeQuery("SET timezone = 'Africa/Johannesburg'");
    console.log('Database timezone set to SAST');
  } catch (error) {
    console.error('Failed to set database timezone:', error);
    throw error;
  }
}

export { executeQuery } from './database';