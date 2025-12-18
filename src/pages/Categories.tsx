import { useState, useEffect } from "react";
// import { useStore } from "@/context/StoreContext"; // Removed
import { DataTable } from "@/components/DataTable";
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
import { CategoryForm } from "@/components/categories/CategoryForm";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const fetchCategories = () => {
    fetch('http://localhost:3000/api/categories')
      .then(res => res.json())
      .then(setCategories)
      .catch(console.error);
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
      const res = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to server');
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
