
import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product, ProductCategory, ProductUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/products/ProductForm";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm
      });
      const res = await fetch(`http://localhost:3000/api/products?${params}`);
      const data = await res.json();

      if (data.pagination) {
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalProducts(data.pagination.total);
      } else {
        // Fallback for non-paginated response (if API reverts)
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      fetch('http://localhost:3000/api/categories').then(r => r.json()).then(setCategories);
      fetch('http://localhost:3000/api/units').then(r => r.json()).then(setUnits);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm]);

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
