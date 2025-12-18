import { useState, useEffect } from "react";
import db from "@/db/database";
import { users as usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserForm } from "@/components/users/user-form";
import { useAuth } from "@/lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const currentUser = useAuth();

  // Only admin should fully access this, sidebar handles navigation security but we can render conditionally too
  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = async () => {
    try {
      const result = await db.select().from(usersTable);

      const appUsers: User[] = result.map(u => ({
        ...u,
        email: u.email || undefined,
        role: u.role as any
      }));

      setUsers(appUsers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await db.delete(usersTable).where(eq(usersTable.id, id));
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to delete user');
    }
  };

  const handleCreate = () => {
    setEditingUser(undefined);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "username", header: "Username" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.getValue("role") as string}</Badge>
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("is_active");
        return <Badge variant={active ? "default" : "destructive"}>{active ? "Active" : "Inactive"}</Badge>;
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        if (!isAdmin) return null;
        return (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        {isAdmin && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={users} searchKey="name" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <UserForm
            initialData={editingUser}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={fetchUsers}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
