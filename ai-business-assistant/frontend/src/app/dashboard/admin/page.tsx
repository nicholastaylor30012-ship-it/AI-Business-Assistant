"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Search, Edit2, Trash2, Shield,
  User, CheckCircle, XCircle, MoreHorizontal
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { User as UserType } from "@/types";
import { formatDate, getInitials, cn } from "@/lib/utils";

const createSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "staff"]),
  department: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Redirect non-admins
  if (currentUser?.role !== "admin") {
    router.push("/dashboard");
    return null;
  }

  const { data: users = [], isLoading } = useQuery<UserType[]>({
    queryKey: ["admin-users"],
    queryFn: () => adminAPI.listUsers({ limit: 100 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => adminAPI.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
      setEditingUser(null);
    },
    onError: () => toast.error("Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete user"),
  });

  const filtered = users.filter((u) =>
    search
      ? u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const toggleActive = (u: UserType) => {
    updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } });
  };

  const toggleRole = (u: UserType) => {
    updateMutation.mutate({ id: u.id, data: { role: u.role === "admin" ? "staff" : "admin" } });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>User Management</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Manage team members and their access
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add User
          </button>
        </div>

        {/* Search + stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input-base pl-9 text-sm"
            />
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total", count: users.length },
              { label: "Active", count: users.filter((u) => u.is_active).length },
              { label: "Admins", count: users.filter((u) => u.role === "admin").length },
            ].map(({ label, count }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                {["User", "Role", "Department", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "var(--bg-tertiary)", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users size={32} className="mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-[var(--bg-secondary)] group"
                    style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: u.role === "admin" ? "#7c3aed" : "var(--brand)" }}
                        >
                          {getInitials(u.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {u.full_name}
                            {u.id === currentUser?.id && (
                              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--brand-light)", color: "var(--brand)" }}>You</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: u.role === "admin" ? "#7c3aed18" : "var(--bg-tertiary)",
                          color: u.role === "admin" ? "#7c3aed" : "var(--text-secondary)",
                        }}
                      >
                        {u.role === "admin" && <Shield size={10} />}
                        {u.role}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {u.department || "—"}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: u.is_active ? "#10b98118" : "#ef444418",
                          color: u.is_active ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {u.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleRole(u)}
                          disabled={u.id === currentUser?.id}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
                          title={u.role === "admin" ? "Make staff" : "Make admin"}
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={u.id === currentUser?.id}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
                          title={u.is_active ? "Deactivate" : "Activate"}
                          style={{ color: "var(--text-muted)" }}
                        >
                          {u.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            if (u.id === currentUser?.id) return;
                            if (confirm(`Delete ${u.full_name}? This cannot be undone.`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          disabled={u.id === currentUser?.id}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30"
                          style={{ color: "var(--danger)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create user modal */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: CreateForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "staff" },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add New User</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "var(--text-muted)" }}>×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Full name</label>
            <input {...register("full_name")} placeholder="Jane Smith" className="input-base" />
            {errors.full_name && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input {...register("email")} type="email" placeholder="jane@company.com" className="input-base" />
            {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
              <input {...register("password")} type="password" placeholder="Min 8 chars" className="input-base" />
              {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Role</label>
              <select {...register("role")} className="input-base" style={{ color: "var(--text-primary)" }}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Department (optional)</label>
            <input {...register("department")} placeholder="e.g. Engineering" className="input-base" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
