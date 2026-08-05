"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { markAllCompleted, markCompleted } from "@/lib/actions/toDoList"
import { TaskFetched } from "@/lib/types/dataTypes"
import { useRouter } from "next/navigation"
import { useState } from "react"


const MarkAllComplete = () => {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const handleClick = async () => {
        if (loading) return;
        setLoading(true)
        try {
            const res = await markAllCompleted()
            if (!res.success) {
                alert(res.message)
                return
            }
            setOpen(false)
            router.refresh()
        } catch (error) {

        } finally {
            setLoading(false)
        }

    }

    return (
        <div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant={"secondary"} className="w-full rounded-xl h-10 px-4 py-2.5 text-sm font-medium hover:opacity-90 transition hover:bg-muted">
                            ✓ Mark All Complete
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Mark all as completed?</DialogTitle>
                        <DialogDescription>
                            You are about to mark all Tasks as completed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleClick} disabled={loading}>✓ Mark</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default MarkAllComplete