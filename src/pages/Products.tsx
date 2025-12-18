import { useState, useEffect } from "react";
import db from "@/db/database";
import { products as productsTable, productCategories, productUnits } from "@/db/schema";
import { sql, or, and } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product, ProductCategory, ProductUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search
} from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(""); // Input value
  const [searchTerm, setSearchTerm] = useState(""); // Debounced/Trigger value
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const pageNum = page;
      const limitNum = limit;
      const offset = (pageNum - 1) * limitNum;

      // Base query
      let query = db.select().from(productsTable);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(productsTable);

      const conditions = [];

      if (searchTerm) {
        const term = `%${searchTerm.toLowerCase()}%`;
        conditions.push(or(
          sql`lower(${productsTable.name}) LIKE ${term}`,
          sql`lower(${productsTable.barcode}) LIKE ${term}`
        ));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // @ts-ignore
      const data = await query.where(whereClause).limit(limitNum).offset(offset);
      // @ts-ignore
      const totalResult = await countQuery.where(whereClause);
      const total = totalResult[0].count;

      setProducts(data as Product[]);
      setTotalPages(Math.ceil(total / limitNum));
      setTotalProducts(total);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cats, uns] = await Promise.all([
        db.select({
          id: productCategories.id,
          name: productCategories.name,
          parent_id: productCategories.parent_id
        }).from(productCategories),
        db.select({
          id: productUnits.id,
          name: productUnits.name,
          short_code: productUnits.short_code
        }).from(productUnits)
      ]);
      setCategories(cats as ProductCategory[]);
      setUnits(uns as ProductUnit[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, limit, searchTerm]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(search);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(undefined);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchProducts();
    // Also refresh metadata to update counts if needed
    fetchMetadata();
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "barcode",
      header: "Barcode",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => {
        const catId = row.getValue("category_id");
        const category = categories.find((c) => c.id === catId);
        return category ? category.name : "-";
      },
    },
    {
      accessorKey: "stock_quantity",
      header: "Stock",
    },
    {
      accessorKey: "cost_price",
      header: "Cost",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("cost_price"));
        return `${Math.round(amount)} da`;
      },
    },
    {
      accessorKey: "sale_price",
      header: "Sale",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("sale_price"));
        return `${Math.round(amount)} da`;
      },
    },
    {
      id: "gain",
      header: "Gain",
      cell: ({ row }) => {
        const cost = parseFloat(row.getValue("cost_price"));
        const sale = parseFloat(row.getValue("sale_price"));
        const gain = sale - cost;
        return (
          <span className={gain < 0 ? "text-destructive font-bold" : "text-green-600 font-bold"}>
            {Math.round(gain)} da
          </span>
        );
      },
    },
    {
      accessorKey: "last_purchase_at",
      header: "Last Purchased",
      cell: ({ row }) => {
        const date = row.getValue("last_purchase_at");
        return date ? new Date(date as string).toLocaleDateString() : "-";
      }
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active");
        return (
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Products ({totalProducts})</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex gap-2 items-center bg-muted/20 p-4 rounded-md border">
        <div className="flex-1">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          <Search className="h-4 w-4 mr-2" /> Search
        </Button>
      </div>

      <div className="relative">
        <DataTable columns={columns} data={products} />
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            Fetching products...
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Rows per page
          </p>
          <Select
            value={`${limit}`}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPage(1)}
              disabled={page === 1 || isLoading}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || isLoading}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Create Product"}</DialogTitle>
          </DialogHeader>
          <ProductForm
            initialData={editingProduct}
            onClose={() => setIsDialogOpen(false)}
            categories={categories}
            units={units}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
