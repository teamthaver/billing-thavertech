import { fetchCurrentInvoices, fetchPreviousOutstanding, fetchServices, fetchServicesByExpiry, fetchStats } from "@/lib/actions/invoice"
import { DataTable } from "@/components/dataTable"
import { columns } from "@/components/Dashboard/pendingTableColumn"
import { endingServicesColumns } from "@/components/Dashboard/endindServicesTableColumn"
import AddInvoicePopup from "@/components/Invoice/addInvoicePopup"
import { CalendarArrowDown, Clock, TrendingUp } from "lucide-react"
import Pagination from "@/components/paginationComponent"
import SearchComponent from "@/components/SearchComponent"
import FinancialYearSelect from "@/components/Dashboard/FinancialYearSelector"
import { fetchClients } from "@/lib/actions/clients"
import { fetchCompanyData } from "@/lib/actions/users"
import { invoiceString } from "@/lib/currentInvoiceNo"
import AddTask from "@/components/toDoList/addTask"
import { fetchTasks } from "@/lib/actions/toDoList"
import MarkComplete from "@/components/toDoList/MarkComplete"
import TaskActions from "@/components/toDoList/TaskActions"
import DeleteTask from "@/components/toDoList/deleteTask"

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{
    invoice_page?: string
    invoice_limit?: string
    service_page?: string
    service_limit?: string
    currentsearch?: string
    previoussearch?: string
    fy?: string
    filter?: "overdue" | "completed" | "today" | "tomorrow" | ""
  }>
}) {
  const params = await searchParams

  const invoicePage = Number(params.invoice_page) || 1
  const invoiceLimit = Number(params.invoice_limit) || 10

  const servicePage = Number(params.service_page) || 1
  const serviceLimit = Number(params.service_limit) || 10

  const currentSearch = params.currentsearch;
  const previousSearch = params.previoussearch;

  const fy = params.fy
  const taskFilter = params.filter

  const statData = await fetchStats(fy)

  const clientData = await fetchClients();
  const servicesData = await fetchServices();
  const companyData = await fetchCompanyData();

  const invoiceData = await fetchCurrentInvoices(
    invoicePage,
    invoiceLimit,
    currentSearch
  )

  const previousOutstanding = await fetchPreviousOutstanding(
    invoicePage,
    invoiceLimit,
    previousSearch
  )

  const expServices = await fetchServicesByExpiry(
    servicePage,
    serviceLimit
  )

  const invoiceNo = await invoiceString();

  const tasks = await fetchTasks(taskFilter)
  if (!tasks.success) {
    return;
  }
  const taskData = tasks.data;

  return (
    <div className="flex flex-col gap-6 p-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-primary to-secondary text-primary-foreground rounded-2xl p-6 shadow-md">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome to Thaver Tech
          </h1>

          <p className="text-sm text-primary-foreground mt-2">
            {today}
          </p>
        </div>

        <AddInvoicePopup
          mode="new"
          ClientList={clientData?.data || []}
          ServicesList={servicesData?.data || []}
          companyData={companyData?.data || undefined}
          invoiceNo={invoiceNo}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[25%_75%] gap-4">
        <div className="grid gap-4 grid-cols-1">

          <div
            className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm"
          >
            <p className="flex justify-between text-sm text-muted-foreground">
              Total Sales <TrendingUp className="text-orange-500" size={20} />
            </p>
            <p className="text-2xl font-semibold ">
              ₹{statData.totalSales}
            </p>
          </div>

          <div
            className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm"
          >
            <p className="flex justify-between  text-sm text-muted-foreground">
              Current Payments<Clock className="text-emerald-500" size={20} />
            </p>
            <p className="text-2xl font-semibold mt-2">
              ₹{statData.currentPayments}
            </p>
          </div>

          <div
            className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm"
          >
            <p className="flex justify-between text-sm text-muted-foreground">
              Previous Outstanding<CalendarArrowDown className="text-green-700" size={20} />
            </p>
            <p className="text-2xl font-semibold mt-2">
              ₹{statData.previousOutstanding}
            </p>
          </div>

          <FinancialYearSelect />

        </div>

        <div className="grid grid-cols-[70%_30%] rounded-2xl border bg-card text-card-foreground p-5 shadow-sm mr-4">
          <div className="w-full h-full max-h-120 overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold">To Do List</h2>
                <p className="text-sm text-muted-foreground">
                  Stay focused on today's priorities
                </p>
              </div>

              <div className="text-sm font-medium text-muted-foreground">
                {tasks?.total} Tasks
              </div>
            </div>

            <div className="space-y-3 mb-3">

              {taskData?.map((task, index) => (
                <div
                  key={index}
                  className={`${task.completed
                    ? "bg-green-900/15 border-green-500/10"
                    : new Date(task.due_date) < new Date()
                      ? "bg-red-700/20"
                      : ""
                    } 
                    grid grid-cols-[80%_20%] items-center gap-3 rounded-xl border p-3 hover:bg-muted/40 transition-colors`}
                >
                  <div className="flex-1">
                    <p className={`${task.completed ? "line-through" : ""} text-base font-medium`}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  {!Boolean(task.completed) ?
                    <div className="flex flex-col space-y-1 items-end justify-end pr-3">
                      <MarkComplete data={task} /> 
                      <DeleteTask data={task} />
                    </div>
                    :
                    <div className="flex items-start justify-end p-3">
                      <span className="text-2xl">✓</span>
                    </div>
                  }
                </div>
              ))}
            </div>

            <AddTask />

          </div>

          <TaskActions />

        </div>

      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b">
          <h2 className="text-lg font-semibold">
            Current Invoices
          </h2>

          <div className="max-w-60 w-full">
            <SearchComponent placeholder="Search by Client name/Invoice ID..." prefix="current" />
          </div>
        </div>

        <div className="p-4">
          <DataTable data={invoiceData.data ?? []} columns={columns} />
          <Pagination
            totalPages={invoiceData.totalPages ?? 0}
            totalItems={invoiceData.total}
            paramPrefix="invoice"
          />
        </div>
      </div>


      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b">
          <h2 className="text-lg font-semibold">
            Previous Outstandings
          </h2>

          <div className="max-w-60 w-full">
            <SearchComponent placeholder="Search by Client name/Invoice ID..." prefix="previous" />
          </div>
        </div>

        <div className="p-4">
          <DataTable data={previousOutstanding.data ?? []} columns={columns} />
          <Pagination
            totalPages={previousOutstanding.totalPages ?? 0}
            totalItems={previousOutstanding.total}
            paramPrefix="previous"
          />
        </div>
      </div>


      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b">
          <h2 className="text-lg font-semibold">
            Future Renewals
          </h2>
        </div>


        {/* Table */}

        <div className="p-4">
          <DataTable data={expServices.data ?? []} columns={endingServicesColumns} />
          <Pagination
            totalPages={expServices.totalPages ?? 0}
            totalItems={expServices.total}
            paramPrefix="service"
          />
        </div>

      </div>
    </div >
  )
}