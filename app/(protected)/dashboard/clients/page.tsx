import AddClientPopup from '@/components/Clients/addClientPopup'
import { columns } from '@/components/Clients/tableColumns';
import { DataTable } from '@/components/dataTable';
import Pagination from '@/components/paginationComponent';
import SearchComponent from '@/components/SearchComponent';
import { fetchClients } from '@/lib/actions/clients'

type PageProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
};

const Clients = async ({ searchParams }: PageProps) => {

  const params = await searchParams;

  const search = params?.search

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const data = await fetchClients(page, limit, search);

  return (
    
    <div className="flex flex-col flex-1 space-y-6 min-h-0">

      <section className="flex items-center justify-between border px-8 py-4 rounded-2xl bg-muted/50">
        <h1 className="font-semibold text-lg">Clients</h1>
        <AddClientPopup mode='new'/>
      </section>

      <section className="flex-1 bg-muted/50 border border-border p-4 rounded-2xl overflow-auto min-h-0 flex flex-col space-y-6">

        <div>

          <h1 className="text-2xl font-bold">
            Client Records <span className="text-primary ml-2">
              [{data.data?.length ?? 0}]
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and view all your clients
          </p>

        </div>

        <div className="max-w-60">
          <SearchComponent placeholder="Search client by name..." />
        </div>
        {data?.data &&
          <>
            <DataTable data={data.data} columns={columns} />
            <Pagination totalPages={data.pagination.totalPages} />
          </>
        }
      </section>

    </div>
  )
}

export default Clients