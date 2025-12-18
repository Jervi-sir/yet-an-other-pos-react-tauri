import { useState, useEffect } from "react";
import db from "@/db/database";
import { productCategories, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
// import { useStore } from "@/context/StoreContext"; // Removed
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProductCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm } from "@/components/categories/category-form";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const fetchCategories = async () => {
    try {
      const result = await db.select({
        id: productCategories.id,
        name: productCategories.name,
        // Drizzle doesn't automatically count relations easily in one go without raw sql or subqueries usually.
        // For now let's just fetch raw categories or use a left join + count grouping if needed by the UI.
        // The UI column uses `product_count`.
        // Let's implement a subquery for product count.
        product_count: sql<number>`(SELECT count(*) FROM ${products} WHERE ${products.category_id} = ${productCategories.id})`
      })
        .from(productCategories);

      setCategories(result);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | undefined>(undefined);

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      // Check if used? The UI already checks product_count before showing delete button usually.
      // But safety check:
      // We can rely on foreign key constraints if set, but Drizzle/SQLite might need explicit check or handle error.

      await db.delete(productCategories).where(eq(productCategories.id, id));
      fetchCategories();
    } catch (e) {
      console.error(e);
      alert('Failed to delete. It might be in use.');
    }
  };

  const handleCreate = () => {
    setEditingCategory(undefined);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<ProductCategory>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const canDelete = (row.original.product_count || 0) === 0;
        return (
          <div className="flex gap-2 justify-end">
            {canDelete && (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(row.original.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <DataTable columns={columns} data={categories} searchKey="name" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialData={editingCategory}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={fetchCategories}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
