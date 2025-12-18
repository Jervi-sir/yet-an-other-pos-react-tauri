import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductCategory } from "@/types";
// import { useStore } from "@/context/StoreContext";

interface CategoryFormProps {
  initialData?: ProductCategory;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryForm({ initialData, onClose, onSuccess }: CategoryFormProps) {
  // const { addCategory } = useStore();
  const [loading, setLoading] = useState(false);

  // We don't have updateCategory in store yet, so we'll just handle add for now or update store later
  // The user asked to "crud categories", implying full CRUD.
  // Store currently only has addCategory. I might need to add updateCategory to store if I want full CRUD.
  // For now I will mock update or just stick to Add.
  // Wait, I should add updateCategory to store. I'll do that after this file creation.

  const [formData, setFormData] = useState<Partial<ProductCategory>>({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData?.id
        ? `http://localhost:3000/api/categories/${initialData.id}`
        : `http://localhost:3000/api/categories`;
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
