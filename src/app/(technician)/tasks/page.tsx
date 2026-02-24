"use client"

import { ServiceOrderList } from "@/modules/technician/components/service-order-list"

export default function TechnicianTasksPage() {
    return (
        <div className="animate-in slide-in-from-right duration-500">
            <ServiceOrderList />
        </div>
    )
}
