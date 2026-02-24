"use client"

import { useQuery } from "@tanstack/react-query";

// Mock API call
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchCustomerStatus(id: string) {
    // In real app: axios.get(\`/api/customers/${id}/status\`)
    // Simulation:
    const random = Math.random();
    return {
        status: random > 0.3 ? 'ONLINE' : 'OFFLINE',
        lastSeen: new Date().toISOString()
    };
}

export function NetworkStatusBadge({ customerId }: { customerId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['customer-status', customerId],
        queryFn: () => fetchCustomerStatus(customerId),
        refetchInterval: 10000, // Poll every 10s
    });

    if (isLoading) return <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">Loading...</span>;

    const isOnline = data?.status === 'ONLINE';

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-sm font-semibold border ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
    );
}
