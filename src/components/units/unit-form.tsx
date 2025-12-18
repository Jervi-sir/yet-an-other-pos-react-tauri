import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductUnit } from "@/types";
// import { useStore } from "@/context/StoreContext";

interface UnitFormProps {
  initialData?: ProductUnit;
  onClose: () => void;
  onSuccess?: () => void; // Added callback
}

export function UnitForm({ initialData, onClose, onSuccess }: UnitFormProps) {
  // const { addUnit } = useStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<ProductUnit>>({
    name: "",
    short_code: "",
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
        ? `http://localhost:3000/api/units/${initialData.id}`
        : `http://localhost:3000/api/units`;
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
          placeholder="e.g. Kilogram"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="short_code">Short Code</Label>
        <Input
          id="short_code"
          value={formData.short_code}
          onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
          placeholder="e.g. kg"
          required
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
