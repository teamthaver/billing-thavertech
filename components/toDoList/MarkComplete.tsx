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
import { markCompleted } from "@/lib/actions/toDoList"
import { TaskFetched } from "@/lib/types/dataTypes"
import { useRouter } from "next/navigation"
import { useState } from "react"


const MarkComplete = ({ data }: { data: TaskFetched }) => {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const handleClick = async () => {
        if (loading) return;
        setLoading(true)
        try {
            const res = await markCompleted(data.id)
            if(!res.success){
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
                    <Button className="w-10">✓</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Mark as completed?</DialogTitle>
                        <DialogDescription>
                            You are about to mark Task "{data.title}" as completed.
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

export default MarkComplete