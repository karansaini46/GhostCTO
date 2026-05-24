import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app, createSession, testPassword, uniqueEmail } from '../../test/helpers.js';

const getRefreshCookie = (cookies: string[] | undefined) =>
  cookies?.find((cookie) => cookie.startsWith('ghostcto_refresh_token='));

describe('auth routes', () => {
  it('registers a founder account and returns a safe session', async () => {
    const email = uniqueEmail();
    const response = await request(app)
      .post('/auth/register')
      .send({
        email,
        name: 'Revenue Founder',
        password: testPassword,
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.accessTokenExpiresAt).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email,
      name: 'Revenue Founder',
      plan: 'FREE',
      role: 'FOUNDER',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(getRefreshCookie(response.headers['set-cookie'])).toEqual(expect.any(String));
  });

  it('rejects duplicate registrations', async () => {
    const email = uniqueEmail();
    const payload = {
      email,
      name: 'Duplicate Founder',
      password: testPassword,
    };

    await request(app).post('/auth/register').send(payload).expect(201);

    const response = await request(app).post('/auth/register').send(payload).expect(409);

    expect(response.body.error).toMatchObject({
      code: 'EMAIL_IN_USE',
    });
  });

  it('logs in with valid credentials and rejects invalid credentials', async () => {
    const email = uniqueEmail();

    await request(app)
      .post('/auth/register')
      .send({
        email,
        name: 'Login Founder',
        password: testPassword,
      })
      .expect(201);

    const success = await request(app)
      .post('/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(200);

    expect(success.body.user.email).toBe(email);
    expect(success.body.accessToken).toEqual(expect.any(String));

    const failure = await request(app)
      .post('/auth/login')
      .send({
        email,
        password: 'wrong-password-value',
      })
      .expect(401);

    expect(failure.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('protects the current user route', async () => {
    await request(app).get('/auth/me').expect(401);

    const session = await createSession();
    const response = await request(app).get('/auth/me').set(session.authHeader).expect(200);

    expect(response.body.user).toMatchObject({
      email: session.user.email,
      id: session.user.id,
      role: 'FOUNDER',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });
});
