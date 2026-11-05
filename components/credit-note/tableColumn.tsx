"use client"

import { Invoice } from "@/lib/types/dataTypes"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { EllipsisVertical, Trash } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import ViewCreditNote from "./viewCreditNote"
import { cancelCreditNote, deleteCreditNote } from "@/lib/actions/credit-note"

const symbol = (currency?: string) => (currency === "INR" ? "₹" : "$")

/**
 * Fixed-width cell wrapper.
 * - truncate: single line with "…" and the full text on hover (title)
 * - width is set on the content itself, so it holds even if the table
 *   doesn't apply column.getSize()
 */
const Cell = ({
    children,
    width,
    title,
    className = "",
}: {
    children: React.ReactNode
    width: number
    title?: string
    className?: string
}) => (
    <div
        className={`truncate ${className}`}
        style={{ width, maxWidth: width }}
        title={title}
    >
        {children}
    </div>
)

/* ------------------------------------------------------------------ */
/* Actions — a real component so hooks aren't called inside `cell`     */
/* ------------------------------------------------------------------ */

const CreditNoteActions = ({ id }: { id: number }) => {
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setLoading(true)
        try {
            const res = await deleteCreditNote(id)
            if (!res.success) {
                alert(res.message)
                return
            }
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setDeleteOpen(false)
        }
    }

    const handleCancel = async () => {
        setLoading(true)
        try {
            const res = await cancelCreditNote(id)
            if (!res.success) {
                alert(res.message)
                return
            }
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setCancelOpen(false)
        }
    }

    return (
        <div className="flex w-20 items-center justify-center">
            <ViewCreditNote id={id} />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="no-print p-2">
                        <EllipsisVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                            <Trash /> Delete
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                            <X /> Cancel
                        </DropdownMenuItem> */}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Credit Note</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this credit note? All associated items will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleDelete} disabled={loading}>
                            {loading ? "Deleting..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cancel Credit Note</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this credit note? It will be marked as cancelled and excluded from active records.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleCancel} disabled={loading}>
                            {loading ? "Cancelling..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

export const columns: ColumnDef<Invoice>[] = [
    {
        accessorKey: "invoice_id",
        header: "Credit Note ID",
        size: 130,
        cell: ({ row }) => {
            const v = String(row.getValue("invoice_id") ?? "")
            return (
                <Cell width={130} title={v} className="font-medium">
                    {v}
                </Cell>
            )
        },
    },
    {
        accessorKey: "client_name",
        header: "Client Name",
        size: 220,
        cell: ({ row }) => {
            const v = String(row.getValue("client_name") ?? "")
            return (
                <Cell width={220} title={v}>
                    {v || "-"}
                </Cell>
            )
        },
    },
    {
        id: "gst_or_tax",
        header: "GST/TAX No",
        size: 160,
        accessorFn: (row) => row.client_gst_no || row.tax_number,
        cell: ({ row }) => {
            const { client_gst_no, tax_number } = row.original
            const v = client_gst_no || tax_number || ""
            return (
                <Cell width={160} title={v} className="font-mono text-xs">
                    {client_gst_no ? (
                        <span className="font-semibold text-blue-700">{client_gst_no}</span>
                    ) : tax_number ? (
                        <span className="font-semibold text-green-700">{tax_number}</span>
                    ) : (
                        <span>-</span>
                    )}
                </Cell>
            )
        },
    },
    {
        accessorKey: "sub_total",
        header: () => <div className="w-[120px] text-right">Subtotal</div>,
        size: 120,
        cell: ({ row }) => {
            const v = `${symbol(row.original.currency)} ${Number(row.getValue("sub_total")).toLocaleString()}`
            return (
                <Cell width={120} title={v} className="text-right tabular-nums">
                    {v}
                </Cell>
            )
        },
    },
    {
        accessorKey: "grand_total",
        header: () => <div className="w-[120px] text-right">Total</div>,
        size: 120,
        cell: ({ row }) => {
            const v = `${symbol(row.original.currency)} ${Number(row.getValue("grand_total")).toLocaleString()}`
            return (
                <Cell width={120} title={v} className="text-right font-semibold tabular-nums">
                    {v}
                </Cell>
            )
        },
    },
    {
        accessorKey: "total_items",
        header: () => <div className="w-[80px] text-center">Items</div>,
        size: 80,
        cell: ({ row }) => (
            <Cell width={80} className="text-center font-semibold">
                {Number(row.getValue("total_items")).toLocaleString()}
            </Cell>
        ),
    },
    {
        accessorKey: "invoice_date",
        header: "Date",
        size: 100,
        cell: ({ row }) => {
            const raw = row.getValue("invoice_date") as string | null
            const v = raw ? new Date(raw).toLocaleDateString("en-IN") : "-"
            return <Cell width={100}>{v}</Cell>
        },
    },
    {
        id: "actions",
        size: 80,
        header: () => <div className="w-20 text-center">Actions</div>,
        cell: ({ row }) => <CreditNoteActions id={row.original.id} />,
    },
]