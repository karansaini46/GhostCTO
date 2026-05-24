import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../test/helpers.js';

describe('health routes', () => {
  it('returns service health metadata', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      environment: 'test',
      status: 'ok',
    });
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
