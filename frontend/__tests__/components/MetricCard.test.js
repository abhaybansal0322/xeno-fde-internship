import { render, screen } from '@testing-library/react'
import MetricCard from '../../components/MetricCard'

describe('MetricCard', () => {
    it('renders title and value correctly', () => {
        render(<MetricCard title="Total Users" value="1,234" />)

        expect(screen.getByText('Total Users')).toBeInTheDocument()
        expect(screen.getByText('1,234')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
        const TestIcon = () => <span data-testid="test-icon">Icon</span>
        render(<MetricCard title="Test" value="0" icon={<TestIcon />} />)

        expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })
})
