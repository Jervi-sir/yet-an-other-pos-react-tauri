import { useState, useEffect } from "react";
// import { useStore } from "@/context/StoreContext";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProductUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitForm } from "@/components/units/UnitForm";

export default function UnitsPage() {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  // const { units } = useStore();

  const fetchUnits = () => {
    fetch('http://localhost:3000/api/units')
      .then(res => res.json())
      .then(setUnits)
      .catch(console.error);
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | undefined>(undefined);

  const handleEdit = (unit: ProductUnit) => {
    setEditingUnit(unit);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/units/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchUnits();
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
    setEditingUnit(undefined);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<ProductUnit>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "short_code",
      header: "Short Code",
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
        <h1 className="text-2xl font-bold tracking-tight">Units</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Unit
        </Button>
      </div>

      <DataTable columns={columns} data={units} searchKey="name" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Create Unit"}</DialogTitle>
          </DialogHeader>
          <UnitForm
            initialData={editingUnit}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={fetchUnits}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
