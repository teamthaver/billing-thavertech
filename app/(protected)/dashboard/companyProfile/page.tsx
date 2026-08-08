import CompanyProfileTable from "@/components/CompanyProfile/companyProfileTable";
import Pagination from "@/components/paginationComponent";
import AddCompanyProfilePopup from "@/components/CompanyProfile/AddProfileDetails";
import SearchComponent from "@/components/SearchComponent";
import { fetchCompanyProfiles } from "@/lib/actions/companyProfile";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
};

const CompanyProfile = async ({ searchParams }: PageProps) => {
  const params = await searchParams;

  const search = params?.search;
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const data = await fetchCompanyProfiles(page, limit, search);

  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-6">
      <section className="flex items-center justify-between rounded-2xl border bg-muted/50 px-8 py-4">
        <h1 className="text-lg font-semibold">Company Profile</h1>

        <AddCompanyProfilePopup mode="new" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col space-y-6 overflow-auto rounded-2xl border border-border bg-muted/50 p-4">
        <div>
          <h1 className="text-2xl font-bold">
            Company Profiles
            <span className="ml-2 text-primary">
              [{data.data?.length ?? 0}]
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage and view all company profiles.
          </p>
        </div>

        <div className="max-w-60">
          <SearchComponent placeholder="Search by title..." />
        </div>

        {data.data && (
          <>
            <CompanyProfileTable data={data.data} />
            <Pagination totalPages={data.pagination.totalPages} />
          </>
        )}
      </section>
    </div>
  );
};

export default CompanyProfile;
