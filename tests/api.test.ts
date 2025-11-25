
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'bun:test' // Or your preferred test runner
import { API } from '../src/api'

await API.init();

//@ts-ignore
const app = API.app;

describe('Search Endpoint', () => {
    // Create the test client from the app instance
    const client = testClient(app) as any;

    it('should return search results', async () => {

        const sessionToken = await client.$post('/auth/login', {
            json: {
                username: 'testuser',
                password: 'testpassword'
            }
        }).then(res => res.json()).then(data => data.token);

        const res = await client..$get({
            query: { q: 'hono' },
        })

        // Assertions
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
            query: 'hono',
            results: ['result1', 'result2'],
        })
    })
})