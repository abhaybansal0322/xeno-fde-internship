import { render, screen, waitFor } from '@testing-library/react'
import TopProducts from '../../components/TopProducts'
import * as api from '../../lib/api'

// Mock the API module
jest.mock('../../lib/api', () => ({
    getTopProducts: jest.fn(),
}))

const mockProducts = [
    { title: 'Product A', orderCount: 10, quantity: 20, revenue: 1000 },
    { title: 'Product B', orderCount: 5, quantity: 10, revenue: 500 },
]

describe('TopProducts', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        api.getTopProducts.mockResolvedValue(mockProducts)
    })

    it('renders loading state initially', () => {
        render(<TopProducts tenantId="123" />)
        // Check for pulse animation elements
        const pulseElements = document.getElementsByClassName('animate-pulse')
        expect(pulseElements.length).toBeGreaterThan(0)
    })

    it('renders product table after data load', async () => {
        render(<TopProducts tenantId="123" />)

        await waitFor(() => {
            expect(screen.getByText('Product A')).toBeInTheDocument()
            expect(screen.getByText('Product B')).toBeInTheDocument()
        })

        // Check headers
        expect(screen.getByText('Product')).toBeInTheDocument()
        expect(screen.getByText('Orders')).toBeInTheDocument()
        expect(screen.getByText('Quantity')).toBeInTheDocument()
        expect(screen.getByText('Revenue')).toBeInTheDocument()
    })

    it('renders empty state when no products', async () => {
        api.getTopProducts.mockResolvedValue([])
        render(<TopProducts tenantId="123" />)

        await waitFor(() => {
            expect(screen.getByText('No products found')).toBeInTheDocument()
        })
    })

    it('refetches data when lastUpdated changes', async () => {
        const { rerender } = render(<TopProducts tenantId="123" lastUpdated={1} />)

        await waitFor(() => {
            expect(api.getTopProducts).toHaveBeenCalledTimes(1)
        })

        // Update prop
        rerender(<TopProducts tenantId="123" lastUpdated={2} />)

        await waitFor(() => {
            expect(api.getTopProducts).toHaveBeenCalledTimes(2)
        })
    })
})
