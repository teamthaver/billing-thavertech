"use client"

import { Invoice } from "@/lib/types/dataTypes"
import { ColumnDef } from "@tanstack/react-table"
import ViewInvoicePopup from "./viewInvoicePopup"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisVertical, X } from "lucide-react"

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Trash } from "lucide-react"
import { useState } from 'react'
import { deleteInvoice, updateStatus } from "@/lib/actions/invoice"
import { useRouter } from "next/navigation"

export const columns: ColumnDef<Invoice>[] = [
    {
        accessorKey: "invoice_id",
        header: "Invoice ID",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("invoice_id")}</div>
        ),
        size: 150
    },
    {
        accessorKey: "client_name",
        header: "Client Name",
        cell: ({ row }) => (
            <div className="truncate" title={row.getValue("client_name") ? row.getValue("client_name") : "NA"}>
                {row.getValue("client_name") ? row.getValue("client_name") : "NA"}
            </div>
        ),
        size: 300
    },
    // {
    //     id: "gst_or_tax",
    //     header: "GST/TAX No",
    //     accessorFn: (row) => row.client_gst_no || row.tax_number,
    //     cell: ({ row }) => (
    //         <p className="text-xs font-mono">
    //             {row.original.client_gst_no && <span className="text-blue-700 font-semibold">{row.original.client_gst_no}</span>}
    //             {row.original.tax_number && <span className="text-green-700 font-semibold">{row.original.tax_number}</span>}
    //             {!row.original.client_gst_no && !row.original.tax_number && <span>-</span>}
    //         </p>
    //     ),
    // },
    {
        accessorKey: "sub_total",
        header: "Subtotal",
        cell: ({ row }) => (
            <span>{row.original.currency === "INR" ? "₹" : "$"} {Number(row.getValue("sub_total")).toLocaleString()}</span>
        ),
        size: 100
    },
    {
        accessorKey: "grand_total",
        header: "Total",
        cell: ({ row }) => {
            const amount = Number(row.getValue("grand_total"));
            const status = row.original.status;

            let color = "text-gray-600";

            if (status === "paid") color = "text-green-600";
            else if (status === "pending") color = "text-orange-500";
            else if (status === "overdue") color = "text-red-600";
            else if (status === "cancelled") color = "text-primary";

            return (
                <span className={`font-semibold ${color}`}>
                    {row.original.currency === "INR" ? "₹" : "$"}  {amount.toLocaleString()}
                </span>
            );
        },
        size: 100
    },
    {
        accessorKey: "total_items",
        header: () => (
            <div className="text-center w-full">Total Items</div>
        ),
        cell: ({ row }) => (
            <div className="text-center font-semibold w-full">
                {Number(row.getValue("total_items")).toLocaleString()}
            </div>
        ),
        size: 100
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const amount = Number(row.getValue("status"));
            const status = row.original.status;

            let color = "text-gray-600";

            if (status === "paid") color = "text-green-600";
            else if (status === "pending") color = "text-orange-500";
            else if (status === "overdue") color = "text-red-600";
            else if (status === "cancelled") color = "text-primary";

            return (
                <span className={`font-semibold ${color}`}>
                    {row.original.status}
                </span>
            );
        },
    },
    {
        accessorKey: "invoice_date",
        header: "Invoice Date",
        cell: ({ row }) => {
            const date = new Date(row.getValue("invoice_date"))
            return <span>{date.toLocaleDateString()}</span>
        },
    },
    {
        id: "actions",
        header: () => (
            <div className="text-center w-18">Actions</div>
        ),
        cell: ({ row }) => {
            const invoiceId = row.original.id
            const [deleteOpen, setDeleteOpen] = useState(false)
            const [cancelOpen, setCancelOpen] = useState(false)
            const router = useRouter();

            const handelDelete = async () => {
                try {
                    const res = await deleteInvoice(invoiceId);
                    if (!res.success) {
                        alert(res.message);
                        return;
                    }
                    router.refresh()
                } catch (error) {
                    console.log(error)
                } finally {
                    setDeleteOpen(false);
                }
            }

            const handelCancel = async () => {
                try {
                    const res = await updateStatus(invoiceId, "cancelled");
                    if (!res.success) {
                        alert(res.message);
                        return;
                    }
                    router.refresh()
                } catch (error) {
                    console.log(error)
                } finally {
                    setCancelOpen(false);
                }
            }

            return (
                <div className="flex w-20 items-center justify-center">
                    <ViewInvoicePopup id={invoiceId} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="no-print p-2"><EllipsisVertical /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                                    <Trash />Delete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                                    <X />Cancel
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Delete Invoice</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this invoice? All associated items and billing details will be permanently removed.
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" onClick={() => handelDelete()}>Confirm</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>


                    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Cancel Invoice</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to cancel this invoice? The invoice will be marked as cancelled and excluded from active records.
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" onClick={() => handelCancel()}>Confirm</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            )
        },
    }
]