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
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "../ui/textarea"
import { FormEvent, useState } from "react"
import { TaskType } from "@/lib/types/dataTypes"
import { insertTask } from "@/lib/actions/toDoList"
import { useRouter } from "next/navigation"

const AddTask = () => {

    const [data, setData] = useState<TaskType>({
        title: "",
        description: "",
        dueDate: ""
    })
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const handleSubmit = async (e: FormEvent) => {

        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            const res = await insertTask(data);
            if (!res.success) {
                alert(res.message)
                return;
            }
            setData({
                title: "",
                description: "",
                dueDate: ""
            })

            setOpen(false)
            router.refresh()

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full rounded-xl bg-primary text-primary-foreground h-10 px-4 py-2.5 text-sm font-medium hover:opacity-90 transition">
                        + Add New Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Add a new Task</DialogTitle>
                            <DialogDescription>
                                {/* Fill the following details */}
                            </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="my-6 ">
                            <Field>
                                <Label htmlFor="title">Title</Label>
                                <Input id="title"
                                    name="title"
                                    placeholder="Task Title"
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            title: e.target.value
                                        }))

                                    }
                                />
                            </Field>
                            <Field>
                                <Label htmlFor="description">Description</Label>
                                {/* <Input type="text" id="description" name="description" placeholder="Description" /> */}
                                <Textarea
                                    placeholder="Type task details here."
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            description: e.target.value
                                        }))

                                    }
                                />
                            </Field>
                            <Field>
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    type="date"
                                    id="dueDate"
                                    name="dueDate"
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            dueDate: e.target.value
                                        }))
                                    }
                                />
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" type="button">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={loading}>Add task</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddTask