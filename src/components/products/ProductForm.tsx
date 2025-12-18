import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, ProductCategory, ProductUnit } from "@/types";

interface ProductFormProps {
  initialData?: Product;
  categories: ProductCategory[];
  units: ProductUnit[];
  onSuccess: () => void;
  onClose: () => void;
}

export function ProductForm({ initialData, categories, units, onSuccess, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false);

  const [showCostWarning, setShowCostWarning] = useState(false);
  const [confirmCostWarning, setConfirmCostWarning] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    barcode: "",
    category_id: undefined,
    unit_id: undefined,
    cost_price: 0,
    sale_price: 0,
    stock_quantity: 0,
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cost = Number(formData.cost_price);
    const sale = Number(formData.sale_price);

    if (sale < cost && !confirmCostWarning) {
      setShowCostWarning(true);
      return;
    }

    setLoading(true);

    try {
      const productData = {
        ...formData,
        category_id: formData.category_id || undefined,
        unit_id: formData.unit_id || undefined,
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity),
        updated_at: new Date().toISOString(),
      } as Product;

      const url = initialData?.id
        ? `http://localhost:3000/api/products/${initialData.id}`
        : `http://localhost:3000/api/products`;

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData?.id ? productData : {
          ...productData,
          created_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        console.error("Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      {/* Warning Alert */}
      {showCostWarning && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md flex flex-col gap-2">
          <div className="font-medium">Warning: Sale Price is less than Cost Price!</div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirm-cost"
              className="h-4 w-4 rounded border-gray-300"
              checked={confirmCostWarning}
              onChange={(e) => setConfirmCostWarning(e.target.checked)}
            />
            <Label htmlFor="confirm-cost" className="text-sm font-normal text-foreground">
              I confirm that I want to sell this item at a loss.
            </Label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id?.toString()}
            onValueChange={(val) => setFormData({ ...formData, category_id: Number(val) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input
            id="barcode"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Scan or enter barcode"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="cost">Cost Price</Label>
          <Input
            id="cost"
            type="number"
            step="1"
            value={formData.cost_price}
            onChange={(e) => {
              setFormData({ ...formData, cost_price: Number(e.target.value) });
              setShowCostWarning(false); // Reset warning on change
              setConfirmCostWarning(false);
            }}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="price">Sale Price</Label>
          <Input
            id="price"
            type="number"
            step="1"
            value={formData.sale_price}
            onChange={(e) => {
              setFormData({ ...formData, sale_price: Number(e.target.value) });
              setShowCostWarning(false); // Reset warning on change
              setConfirmCostWarning(false);
            }}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="unit">Unit</Label>
        <Select
          value={formData.unit_id?.toString()}
          onValueChange={(val) => setFormData({ ...formData, unit_id: Number(val) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name} ({u.short_code})
              </SelectItem>
            ))}
            {units.length === 0 && <SelectItem value="default" disabled>No units defined</SelectItem>}
          </SelectContent>
        </Select>
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
