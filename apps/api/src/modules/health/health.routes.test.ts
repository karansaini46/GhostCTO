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

  it('only allows configured browser origins', async () => {
    await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
      .expect(200);

    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://attacker.example')
      .expect(403);

    expect(blocked.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
