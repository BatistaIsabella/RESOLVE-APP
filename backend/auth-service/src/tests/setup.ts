import { vi } from 'vitest';
import { redisFalso } from './helpers/redisFalso';

vi.mock('../config/redis', () => ({ getRedis: async () => redisFalso }));
