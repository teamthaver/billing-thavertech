import { columns } from "@/components/Prospects/tableColumns";
import { DataTable } from "@/components/dataTable";
import Pagination from "@/components/paginationComponent";
import AddProspectPopup from "@/components/Prospects/addProspects";
import SearchComponent from "@/components/SearchComponent";
import { fetchProspects } from "@/lib/actions/prospect";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
};

const Prospects = async ({ searchParams }: PageProps) => {
  const params = await searchParams;

  const search = params?.search;

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const data = await fetchProspects(page, limit, search);

  return (
    <div className="flex flex-col flex-1 space-y-6 min-h-0">
      <section className="flex items-center justify-between border px-8 py-4 rounded-2xl bg-muted/50">
        <h1 className="font-semibold text-lg">Prospects</h1>
        <AddProspectPopup mode="new" />
      </section>

      <section className="flex-1 bg-muted/50 border border-border p-4 rounded-2xl overflow-auto min-h-0 flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Prospect Records{" "}
            <span className="text-primary ml-2">
              [{data.data?.length ?? 0}]
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and view all your Prospects
          </p>
        </div>

        <div className="max-w-60">
          <SearchComponent placeholder="Search Prospect by name..." />
        </div>
        {data?.data && (
          <>
            <DataTable data={data.data} columns={columns} />
            <Pagination totalPages={data.pagination.totalPages} />
          </>
        )}
      </section>
    </div>
  );
};

export default Prospects;
