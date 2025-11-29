import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OrdersChart from '../../components/OrdersChart'
import * as api from '../../lib/api'

// Mock the api module
jest.mock('../../lib/api')

// Mock Recharts since it doesn't render well in JSDOM
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
}))

describe('OrdersChart', () => {
    const mockData = [
        { date: '2023-11-01', count: 10 },
        { date: '2023-11-02', count: 20 },
    ]

    beforeEach(() => {
        api.getOrdersTimeSeries.mockResolvedValue(mockData)
    })

    it('renders loading state initially', () => {
        render(<OrdersChart tenantId="test-tenant" />)
        // Check for loading spinner or container
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
    })

    it('renders chart after data load', async () => {
        render(<OrdersChart tenantId="test-tenant" />)

        await waitFor(() => {
            expect(screen.getByTestId('line-chart')).toBeInTheDocument()
        })
    })

    it('calls API with correct default range', async () => {
        render(<OrdersChart tenantId="test-tenant" />)

        await waitFor(() => {
            expect(api.getOrdersTimeSeries).toHaveBeenCalledWith('test-tenant', '7d')
        })
    })

    it('updates data when range changes', async () => {
        render(<OrdersChart tenantId="test-tenant" />)

        await waitFor(() => {
            expect(screen.getByRole('combobox')).toBeInTheDocument()
        })

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '30d' } })

        await waitFor(() => {
            expect(api.getOrdersTimeSeries).toHaveBeenCalledWith('test-tenant', '30d')
        })
    })
})
