import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { User, UserRole } from "@/types";

interface UserFormProps {
  initialData?: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserForm({ initialData, onClose, onSuccess }: UserFormProps) {
  const [loading, setLoading] = useState(false);

  // We need to manage form state ourselves because validation and types
  const [formData, setFormData] = useState<Partial<User>>({
    username: "",
    name: "",
    email: "",
    password_hash: "",
    role: "cashier",
    is_active: true,
  });

  // Password field is special: only required on create, optional on update (if empty, don't change)
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // Show existing password if available (assuming plain text storage for this requirement)
      // If valid hash, this would look ugly, but based on request "admin can give it", we assume readable.
      setPassword(initialData.password_hash);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData?.id
        ? `http://localhost:3000/api/users/${initialData.id}`
        : `http://localhost:3000/api/users`;
      const method = initialData?.id ? 'PUT' : 'POST';

      // Prepare payload
      const payload: any = {
        ...formData,
        password_hash: password, // Send visible password as hash
        created_at: initialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save user");
      }
    } catch (e) {
      console.error(e);
      alert("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      {/* <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email || ""}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div> */}
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="text"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!initialData?.id} // Required for new, technically we fill it for edit too
        />
        <p className="text-xs text-muted-foreground">Visible to Admin</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role" >Role</Label>
        <Select
          value={formData.role}
          onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="sub_admin">Sub Admin</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked: boolean | string) => setFormData({ ...formData, is_active: checked === true })}
        />
        <Label htmlFor="is_active">Active Account</Label>
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
