// Unit tests for shopifyClient pagination logic
const axios = require('axios');
const { fetchCustomers, fetchProducts, fetchOrders } = require('../src/lib/shopifyClient');

jest.mock('axios');

describe('ShopifyClient Pagination', () => {
    const mockAccessToken = 'test_token';
    const mockDomain = 'test.myshopify.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('fetchCustomers should follow pagination links', async () => {
        // Page 1 response
        const page1Data = {
            customers: [
                { id: 1, email: 'c1@test.com', first_name: 'C1', last_name: 'L1', total_spent: '10.00' },
                { id: 2, email: 'c2@test.com', first_name: 'C2', last_name: 'L2', total_spent: '20.00' },
            ],
        };
        const page1Headers = {
            link: '<https://test.myshopify.com/page2>; rel="next"',
        };

        // Page 2 response
        const page2Data = {
            customers: [
                { id: 3, email: 'c3@test.com', first_name: 'C3', last_name: 'L3', total_spent: '30.00' },
            ],
        };
        const page2Headers = {
            link: '<https://test.myshopify.com/page1>; rel="previous"', // No next link
        };

        // Detail responses
        const detailData1 = { customer: { id: 1, first_name: 'C1', last_name: 'L1' } };
        const detailData2 = { customer: { id: 2, first_name: 'C2', last_name: 'L2' } };
        const detailData3 = { customer: { id: 3, first_name: 'C3', last_name: 'L3' } };

        axios.get
            .mockResolvedValueOnce({ data: page1Data, headers: page1Headers }) // Page 1
            .mockResolvedValueOnce({ data: page2Data, headers: page2Headers }) // Page 2
            .mockResolvedValueOnce({ data: detailData1 }) // Detail 1
            .mockResolvedValueOnce({ data: detailData2 }) // Detail 2
            .mockResolvedValueOnce({ data: detailData3 }); // Detail 3

        const customers = await fetchCustomers(mockDomain, mockAccessToken);

        // Verify axios calls
        // 2 list calls + 3 detail calls = 5 calls
        expect(axios.get).toHaveBeenCalledTimes(5);
        expect(axios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('/customers.json'), expect.any(Object));
        expect(axios.get).toHaveBeenNthCalledWith(2, 'https://test.myshopify.com/page2', expect.any(Object));

        // Verify results
        expect(customers).toHaveLength(3);
        expect(customers[0].shopifyId).toBe('1');
        expect(customers[2].shopifyId).toBe('3');
    });

    test('fetchProducts should handle single page result', async () => {
        const page1Data = {
            products: [
                { id: 101, title: 'P1', variants: [{ price: '10.00' }] },
            ],
        };
        const page1Headers = {}; // No link header

        axios.get.mockResolvedValueOnce({ data: page1Data, headers: page1Headers });

        const products = await fetchProducts(mockDomain, mockAccessToken);

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(products).toHaveLength(1);
        expect(products[0].shopifyId).toBe('101');
    });

    test('fetchOrders should handle pagination and query params', async () => {
        // Page 1
        const page1Data = {
            orders: [{ id: 1001, total_price: '50.00', created_at: '2024-01-01' }],
        };
        const page1Headers = {
            link: '<https://test.myshopify.com/orders_page2>; rel="next"',
        };

        // Page 2
        const page2Data = {
            orders: [{ id: 1002, total_price: '60.00', created_at: '2024-01-02' }],
        };
        const page2Headers = {};

        axios.get
            .mockResolvedValueOnce({ data: page1Data, headers: page1Headers })
            .mockResolvedValueOnce({ data: page2Data, headers: page2Headers });

        const orders = await fetchOrders(mockDomain, mockAccessToken);

        expect(axios.get).toHaveBeenCalledTimes(2);
        // First call should have status=any
        expect(axios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('status=any'), expect.any(Object));
        // Second call uses the link provided
        expect(axios.get).toHaveBeenNthCalledWith(2, 'https://test.myshopify.com/orders_page2', expect.any(Object));

        expect(orders).toHaveLength(2);
    });
});
