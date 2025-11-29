import { render, screen, waitFor } from '@testing-library/react'
import TopCustomers from '../../components/TopCustomers'
import * as api from '../../lib/api'

jest.mock('../../lib/api')

describe('TopCustomers', () => {
    const mockCustomers = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', totalOrders: 5, totalSpent: 500 },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', totalOrders: 3, totalSpent: 300 },
    ]

    beforeEach(() => {
        api.getTopCustomers.mockResolvedValue(mockCustomers)
    })

    it('renders loading state initially', () => {
        render(<TopCustomers tenantId="test-tenant" />)
        expect(screen.getByText('Top Customers')).toBeInTheDocument()
        // Check for pulse animation
        const pulse = document.querySelector('.animate-pulse')
        expect(pulse).toBeInTheDocument()
    })

    it('renders customer table after data load', async () => {
        render(<TopCustomers tenantId="test-tenant" />)

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument()
            expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        })
    })

    it('renders empty state when no customers', async () => {
        api.getTopCustomers.mockResolvedValue([])
        render(<TopCustomers tenantId="test-tenant" />)

        await waitFor(() => {
            expect(screen.getByText('No customers found')).toBeInTheDocument()
        })
    })
})
