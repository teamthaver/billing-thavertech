'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import AddTask from './addTask'
import MarkAllComplete from './MarkAllComplete'

const filters = [
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "Overdue", value: "overdue" },
    { label: "Completed", value: "completed" },
]

const TaskActions = () => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const activeFilter = searchParams.get("filter");

    const updateFilter = (filter?: string) => {

        const params = new URLSearchParams(searchParams.toString());

        if (filter) {
            params.set("filter", filter);
        } else {
            params.delete("filter");
        }

        const query = params.toString();

        router.push(query ? `?${query}` : "/dashboard");
    };

    return (
        <div className="flex flex-col gap-3 m-3 border p-3 rounded-xl">

            <h3>Actions</h3>

            <AddTask />

            <MarkAllComplete />

            <div className="mt-2">

                <p className="text-sm font-medium text-muted-foreground mb-3">
                    Filters
                </p>

                <div className="flex flex-col gap-2">

                    {filters.map((filter) => (

                        <button
                            key={filter.value}
                            onClick={() => { updateFilter(filter.value) }}
                            className={`
                                w-full rounded-xl border px-4 py-2.5 
                                text-left text-sm font-medium transition
                                ${activeFilter === filter.value
                                    ? "bg-primary text-white"
                                    : "hover:bg-muted"
                                }
                            `}
                        >
                            {filter.label}
                        </button>
                    ))}
                    <button
                        onClick={() => updateFilter()}
                        className="w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium hover:bg-muted transition"
                    >
                        All Tasks
                    </button>

                </div>
            </div>
        </div>
    )
}

export default TaskActions