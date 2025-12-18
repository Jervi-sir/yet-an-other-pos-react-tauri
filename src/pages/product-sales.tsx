import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import type { User } from "@/types";
import db from "@/db/database";
import { saleLines, sales, users as usersTable } from "@/db/schema";
import { eq, sql, and, or, desc } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface SoldProductRow {
  id: number;
  date: string;
  product_name: string;
  qty: number;
  unit_price: number;
  total: number;
  cashier: string;
  document_number: string;
  user_id: number;
}

export default function ProductSalesPage() {
  const currentUser = useAuth();
  const isCashier = currentUser?.role === 'cashier';

  const [data, setData] = useState<SoldProductRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState<number | "all">(isCashier && currentUser ? currentUser.id : "all");
  const [filterSearch, setFilterSearch] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");

  // Init User Filter
  useEffect(() => {
    if (isCashier && currentUser) {
      setFilterUser(currentUser.id);
    }
  }, [currentUser, isCashier]);

  // Fetch Metadata (Users)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await db.select().from(usersTable);
        setUsers(res.map(u => ({ ...u, email: u.email || undefined, role: u.role as any })));
      } catch (e) { console.error(e); }
    };
    loadUsers();
  }, []);

  const getUserName = (id: number) => {
    return users.find((u) => u.id === id)?.name || "Unknown";
  };

  const fetchSoldProducts = async () => {
    setIsLoading(true);
    try {
      const pageNum = page;
      const limitNum = limit;
      const offset = (pageNum - 1) * limitNum;

      // Base query
      let query = db.select({
        id: saleLines.id,
        sale_id: saleLines.sale_id,
        product_id: saleLines.product_id,
        product_name: saleLines.product_name,
        qty: saleLines.qty,
        unit_price: saleLines.unit_price,
        discount: saleLines.discount,
        tax_rate: saleLines.tax_rate,
        line_total: saleLines.line_total,
        // Joined fields for display/filtering
        document_number: sales.document_number,
        created_at: sales.created_at,
        created_by_user_id: sales.created_by_user_id
      })
        .from(saleLines)
        .leftJoin(sales, eq(saleLines.sale_id, sales.id));

      const conditions = [];

      if (filterDate) {
        conditions.push(sql`substr(${sales.created_at}, 1, 10) = ${filterDate}`);
      }

      if (filterUser && filterUser !== 'all') {
        conditions.push(eq(sales.created_by_user_id, Number(filterUser)));
      }

      if (activeSearchTerm) {
        const term = `%${activeSearchTerm.toLowerCase()}%`;
        conditions.push(or(
          sql`lower(${saleLines.product_name}) LIKE ${term}`,
          sql`lower(${sales.document_number}) LIKE ${term}`
        ));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Data query
      const result = await query.where(whereClause)
        .orderBy(desc(sales.created_at))
        .limit(limitNum)
        .offset(offset);

      // Count query
      const countRes = await db.select({ count: sql<number>`count(*)` })
        .from(saleLines)
        .leftJoin(sales, eq(saleLines.sale_id, sales.id))
        .where(whereClause);

      const total = countRes[0].count;

      const rows: SoldProductRow[] = result.map((item) => ({
        id: item.id,
        date: item.created_at || '',
        product_name: item.product_name,
        qty: item.qty,
        unit_price: item.unit_price,
        total: item.line_total,
        cashier: getUserName(item.created_by_user_id || 0),
        document_number: item.document_number || '',
        user_id: item.created_by_user_id || 0
      }));

      setData(rows);
      setTotalPages(Math.ceil(total / limitNum) || 1);
      setTotalRecords(total);

    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when dependencies change
  // We include `users` in dependency to re-map names if they load after data? 
  // No, `fetchSoldProducts` creates new objects. If `users` updates, `getUserName` closure?
  // `getUserName` uses `users` state. 
  // Ideally we should memoize or just depend on `users`.
  useEffect(() => {
    fetchSoldProducts();
  }, [page, filterDate, filterUser, activeSearchTerm, users.length]);

  const handleSearch = () => {
    setPage(1);
    setActiveSearchTerm(filterSearch);
  };

  const handleFilterDateChange = (val: string) => {
    setPage(1);
    setFilterDate(val);
  };

  const handleFilterUserChange = (val: number | "all") => {
    setPage(1);
    setFilterUser(val);
  };

  const columns: ColumnDef<SoldProductRow>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.getValue("date")).toLocaleString(),
    },
    {
      accessorKey: "product_name",
      header: "Product",
    },
    {
      accessorKey: "qty",
      header: "Quantity",
    },
    {
      accessorKey: "unit_price",
      header: "Unit Price",
      cell: ({ row }) => `${Math.round(row.getValue("unit_price") as number)} da`,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => `${Math.round(row.getValue("total") as number)} da`,
    },
    {
      accessorKey: "cashier",
      header: "Cashier",
    },
    {
      accessorKey: "document_number",
      header: "Doc #",
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Sold Products History ({totalRecords})</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-md border items-center">
        <div className="flex-1 w-full md:w-auto flex gap-2">
          <Input
            placeholder="Search Product, Doc #..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-full md:w-[200px]">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => handleFilterDateChange(e.target.value)}
          />
        </div>

        {!isCashier && (
          <div className="w-full md:w-[200px]">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={filterUser}
              onChange={(e) => handleFilterUserChange(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All Cashiers</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setFilterDate("");
              setFilterUser(isCashier && currentUser ? currentUser.id : "all");
              setFilterSearch("");
              setActiveSearchTerm("");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="relative">
        <DataTable columns={columns} data={data} searchKey="product_name" />
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            Fetching data...
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
