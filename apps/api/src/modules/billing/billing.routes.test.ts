import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { prisma } from '../../infrastructure/database/prisma.js';
import { app, createSession } from '../../test/helpers.js';

describe('billing routes', () => {
  it('returns billing status for the authenticated user', async () => {
    const session = await createSession();
    const response = await request(app).get('/billing/status').set(session.authHeader).expect(200);

    expect(response.body.billingStatus).toMatchObject({
      access: {
        canCreateProject: true,
        canGenerate: true,
        canUseChat: true,
      },
      plan: 'FREE',
    });
  });

  it('verifies a Gumroad license through a mocked provider call', async () => {
    const session = await createSession();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            purchase: {
              currency: 'usd',
              email: session.user.email,
              license_key: 'license-test-key',
              price: 149,
              product_id: 'test-product',
              purchaser_id: 'customer-1',
              sale_id: 'sale-1',
              sale_timestamp: '2026-05-01T00:00:00.000Z',
            },
            success: true,
            uses: 1,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/billing/verify')
      .set(session.authHeader)
      .send({
        licenseKey: 'license-test-key',
      })
      .expect(201);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.body.user.plan).toBe('LIFETIME');
    expect(response.body.payment).toMatchObject({
      amountCents: 14900,
      currency: 'USD',
      status: 'PAID',
      type: 'lifetime_access',
    });
    expect(response.body.billingStatus.plan).toBe('LIFETIME');

    const payment = await prisma.payment.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: 'GUMROAD',
          providerPaymentId: 'sale-1',
        },
      },
    });
    const metadata = payment?.metadata as
      | { licenseKey?: string; licenseKeyHash?: string; purchase?: { license_key?: string } }
      | undefined;

    expect(metadata?.licenseKey).toBeUndefined();
    expect(metadata?.licenseKeyHash).toHaveLength(64);
    expect(metadata?.purchase?.license_key).toBeUndefined();
  });

  it('maps inactive or invalid Gumroad licenses to a validation error', async () => {
    const session = await createSession();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              purchase: null,
              success: false,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
              },
              status: 200,
            },
          ),
      ),
    );

    const response = await request(app)
      .post('/billing/verify')
      .set(session.authHeader)
      .send({
        licenseKey: 'bad-license-key',
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_LICENSE_KEY');
  });

  it('prevents a license from being linked to another account', async () => {
    const owner = await createSession('owner');
    const other = await createSession('other');

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              purchase: {
                currency: 'usd',
                email: owner.user.email,
                license_key: 'shared-license-key',
                price: 149,
                product_id: 'test-product',
                purchaser_id: 'customer-1',
                sale_id: 'shared-sale',
                sale_timestamp: '2026-05-01T00:00:00.000Z',
              },
              success: true,
              uses: 1,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
              },
              status: 200,
            },
          ),
      ),
    );

    await request(app)
      .post('/billing/verify')
      .set(owner.authHeader)
      .send({
        licenseKey: 'shared-license-key',
      })
      .expect(201);

    const response = await request(app)
      .post('/billing/verify')
      .set(other.authHeader)
      .send({
        licenseKey: 'shared-license-key',
      })
      .expect(409);

    expect(response.body.error.code).toBe('LICENSE_ALREADY_REDEEMED');
  });
});
