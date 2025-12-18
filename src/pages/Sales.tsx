
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import type { Sale, User, Customer, SaleLine } from "@/types";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function SalesPage() {
  const currentUser = useAuth();
  const isCashier = currentUser?.role === 'cashier';

  // Data State
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Dialog State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleLines, setSelectedSaleLines] = useState<SaleLine[]>([]);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState<number | "all">(isCashier && currentUser ? currentUser.id : "all");
  const [filterSearch, setFilterSearch] = useState("");

  // Init User Filter correctly if cashier
  useEffect(() => {
    if (isCashier && currentUser) {
      setFilterUser(currentUser.id);
    }
  }, [currentUser, isCashier]);

  // Fetch Metadata (Users, Customers) - Once
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3000/api/users').then(r => r.json()),
      fetch('http://localhost:3000/api/customers').then(r => r.json())
    ]).then(([u, c]) => {
      setUsers(u);
      setCustomers(c);
    }).catch(console.error);
  }, []);

  // Fetch Sales (Paginated)
  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterDate) params.append('date', filterDate);
      if (filterUser !== 'all') params.append('user_id', filterUser.toString());
      if (filterSearch) params.append('search', filterSearch);

      const res = await fetch(`http://localhost:3000/api/sales?${params}`);
      const data = await res.json();

      if (data.pagination) {
        setSales(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalSales(data.pagination.total);
      } else {
        setSales(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on Page or Filter Change (Effect is cleaner than manual calls for pagination)
  // But for search text, we want manual trigger? 
  // Code instructs: "Update Search input to trigger fetch (on Enter or Search button)".
  // But Date/User filters are usually immediate.
  // I'll assume "filterSearch" is the live input, let's separate `activeSearch`.
  // Actually, let's keep it simple: Date/User trigger effect. Search term triggers on button/enter.

  // WAIT: To support explicit Search trigger, I need a separate state variable `activeSearchTerm`.
  // And `filterDate` / `filterUser` can toggle immediately.

  const [activeSearchTerm, setActiveSearchTerm] = useState("");

  useEffect(() => {
    fetchSales();
  }, [page, filterDate, filterUser, activeSearchTerm]);
  // Note: changing filters should probably reset page to 1. 
  // I'll handle that in the handlers.

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

  const handleViewSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleLines([]); // Clear previous
    try {
      const res = await fetch(`http://localhost:3000/api/sale-lines?sale_id=${sale.id}`);
      const lines = await res.json();
      setSelectedSaleLines(lines);
    } catch (e) {
      console.error(e);
    }
  };

  const getCustomerName = (id?: number) => {
    if (!id) return "Walk-in";
    return customers.find((c) => c.id === id)?.name || "Unknown";
  };

  const getUserName = (id: number) => {
    return users.find((u) => u.id === id)?.name || "Unknown";
  };

  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: "document_number",
      header: "Doc #",
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
    },
    {
      accessorKey: "customer_id",
      header: "Customer",
      cell: ({ row }) => getCustomerName(row.getValue("customer_id")),
    },
    {
      accessorKey: "created_by_user_id",
      header: "Cashier",
      cell: ({ row }) => getUserName(row.getValue("created_by_user_id")),
    },
    {
      accessorKey: "grand_total",
      header: "Total",
      cell: ({ row }) => `${Math.round(row.getValue("grand_total") as number)} da`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewSale(row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Sales History ({totalSales})</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-md border items-center">
        <div className="flex-1 w-full md:w-auto flex gap-2">
          <Input
            placeholder="Search Document #..."
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
        <DataTable columns={columns} data={sales} searchKey="document_number" />
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            Fetching sales...
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

      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sale Details: {selectedSale?.document_number}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 text-sm">
                <div><strong>Date:</strong> {new Date(selectedSale.created_at).toLocaleString()}</div>
                <div><strong>Cashier:</strong> {getUserName(selectedSale.created_by_user_id)}</div>
                <div><strong>Customer:</strong> {getCustomerName(selectedSale.customer_id)}</div>
                <div><strong>Status:</strong> {selectedSale.status}</div>
              </div>

              <div className="border rounded-md p-2 max-h-[300px] overflow-auto">
                {selectedSaleLines.length === 0 ? (
                  <div className="text-center p-4 text-muted-foreground">Loading lines...</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left sticky top-0 bg-background">
                        <th className="p-1">Product</th>
                        <th className="p-1 text-right">Qty</th>
                        <th className="p-1 text-right">Price</th>
                        <th className="p-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSaleLines.map(line => (
                        <tr key={line.id} className="border-b last:border-0">
                          <td className="p-1">{line.product_name}</td>
                          <td className="p-1 text-right">{line.qty}</td>
                          <td className="p-1 text-right">{Math.round(line.unit_price)} da</td>
                          <td className="p-1 text-right">{Math.round(line.line_total)} da</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex justify-end text-lg font-bold">
                Total: {Math.round(selectedSale.grand_total)} da
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
