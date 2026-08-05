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
import { deleteTask } from "@/lib/actions/toDoList"
import { TaskFetched } from "@/lib/types/dataTypes"
import { Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"


const DeleteTask = ({ data }: { data: TaskFetched }) => {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const handleClick = async () => {
        if (loading) return;
        setLoading(true)
        try {
            const res = await deleteTask(data.id)
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
                    <Button variant={"outline"} className="w-10"><Trash/></Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete this task?</DialogTitle>
                        <DialogDescription>
                            You are about to delete the Task "{data.title}".
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleClick} disabled={loading}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default DeleteTask