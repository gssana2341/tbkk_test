"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserAdminResponse, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getAllUsers, deleteUser, updateUserRole } from "@/api/users/users";
import { getUser } from "@/lib/auth";

type UserStatus = "Online" | "Offline" | "Pending" | "Suspended" | string;

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserAdminResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const [usersData, currentUserData] = await Promise.all([
                getAllUsers(),
                getUser(),
            ]);
            setUsers(usersData);
            setCurrentUser(currentUserData);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await deleteUser(userId);
            await fetchUsers(); // Refresh list after delete
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Failed to delete user");
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await updateUserRole(userId, newRole);
            await fetchUsers(); // Refresh list after update
        } catch (error) {
            console.error("Failed to update role:", error);
            alert("Failed to update role");
        }
    };

    // Helper function to get status badge styles
    const getStatusBadgeStyles = (status: UserStatus) => {
        const s = status.toLowerCase();
        // Online (Active)
        if (s === "active" || s === "online")
            return "bg-[#14532d] hover:bg-[#14532d] text-[#4ade80] border border-[#14532d]";
        // Offline (Disabled)
        if (s === "disabled" || s === "offline")
            return "bg-[#334155] hover:bg-[#334155] text-[#94a3b8] border border-[#334155]";
        // Pending
        if (s === "pending")
            return "bg-[#713f12] hover:bg-[#713f12] text-[#facc15] border border-[#713f12]";
        // Suspended
        if (s === "suspended")
            return "bg-[#7f1d1d] hover:bg-[#7f1d1d] text-[#fca5a5] border border-[#7f1d1d]";
        return "bg-gray-500 text-white";
    };

    const getStatusDotColor = (status: UserStatus) => {
        const s = status.toLowerCase();
        if (s === "active" || s === "online") return "bg-[#22c55e]";
        if (s === "disabled" || s === "offline") return "bg-[#94a3b8]";
        if (s === "pending") return "bg-[#facc15]";
        if (s === "suspended") return "bg-[#f87171]";
        return "bg-gray-400";
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesRole = true;
        if (roleFilter !== "All") {
            matchesRole = user.role.toLowerCase() === roleFilter.toLowerCase();
        }

        let matchesStatus = true;
        if (statusFilter !== "All") {
            // Compare directly as API returns display values
            matchesStatus = user.status === statusFilter;
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    const getVisiblePages = () => {
        const maxVisiblePages = 5;
        const pages: number[] = [];

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= maxVisiblePages; i++) {
                    pages.push(i);
                }
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                    pages.push(i);
                }
            }
        }
        return pages;
    };

    const visiblePages = getVisiblePages();

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            handlePageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">User Management</h1>
                <p className="text-gray-400">Total users: {filteredUsers.length} people</p>
                {currentUser && <p className="text-gray-500 text-sm mt-1">Found organization code: {currentUser.org_code}</p>}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-[#1e293b] rounded-md px-3 py-1 border border-gray-700 w-full md:w-auto">
                    <span className="text-gray-400 text-sm whitespace-nowrap">Search :</span>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            type="text"
                            placeholder="Name / Email"
                            className="pl-8 bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-gray-600 h-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[#1e293b] rounded-md px-3 py-1 border border-gray-700">
                    <span className="text-gray-400 text-sm whitespace-nowrap">Role :</span>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-32 bg-transparent border-none h-8 text-white focus:ring-0">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-gray-700 text-white">
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 bg-[#1e293b] rounded-md px-3 py-1 border border-gray-700">
                    <span className="text-gray-400 text-sm whitespace-nowrap">Status :</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32 bg-transparent border-none h-8 text-white focus:ring-0">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-gray-700 text-white">
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Offline">Offline</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#0f172a]">
                        <TableRow className="border-gray-700 hover:bg-[#0f172a]">
                            <TableHead className="text-white font-semibold">User</TableHead>
                            <TableHead className="text-white font-semibold">Contact</TableHead>
                            <TableHead className="text-white font-semibold text-center">Role</TableHead>
                            <TableHead className="text-white font-semibold">ORC</TableHead>
                            <TableHead className="text-white font-semibold">Last Login</TableHead>
                            <TableHead className="text-white font-semibold">Status</TableHead>
                            <TableHead className="text-white font-semibold text-right">
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="text-center h-32 text-gray-400">
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : currentUsers.length > 0 ? (
                            currentUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="border-gray-700 hover:bg-[#2d3748]"
                                >
                                    <TableCell>
                                        <div className="font-medium">{user.name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-gray-300 text-sm">{user.email}</span>
                                            {/* Phone removed per request */}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Select
                                                defaultValue={user.role?.toLowerCase()}
                                                disabled={currentUser?.id === user.id}
                                                onValueChange={(value) => handleRoleChange(user.id, value)}
                                            >
                                                <SelectTrigger className="w-28 h-8 bg-[#0f172a] border-gray-600 text-white">
                                                    <SelectValue placeholder={user.role} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1e293b] border-gray-700 text-white">
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="editor">Editor</SelectItem>
                                                    <SelectItem value="viewer">Viewer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {currentUser?.id === user.id && (
                                                <span className="text-[10px] text-gray-500">You cannot change your own role.</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-300 text-sm">{user.org_code}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-gray-300">
                                            {user.last_login ? formatDate(user.last_login) : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <Badge
                                                className={`rounded-full px-3 py-1 flex w-fit items-center gap-2 ${getStatusBadgeStyles(
                                                    user.status
                                                )}`}
                                            >
                                                <span
                                                    className={`block w-2.5 h-2.5 rounded-full ${getStatusDotColor(
                                                        user.status
                                                    )}`}
                                                />
                                                {/* API returns mapped status directly e.g. "Online" */}
                                                {user.status}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {currentUser?.org_code === user.org_code && currentUser?.id !== user.id && (
                                            <Button
                                                variant="ghost"
                                                className="h-7 px-4 bg-[#450a0a] hover:bg-[#5f1212] text-[#fca5a5] border border-[#7f1d1d] rounded-full text-xs font-normal transition-colors"
                                                onClick={() => handleDeleteUser(user.id)}
                                            >
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                Delete
                                            </Button>
                                        )}
                                        {/* Show empty placeholder if delete is unavailable to keep layout similar? Or just empty. 
                                            Keeping it conditional as per request (Org Check) */}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={7}
                                    className="text-center h-32 text-gray-500"
                                >
                                    No users found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="flex items-center justify-center mt-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-700 rounded-full bg-[#232e3c] shadow">
                        <button
                            onClick={handlePrevious}
                            disabled={currentPage === 1}
                            className="w-8 h-8 rounded-full border border-gray-700 bg-[#1F2937] flex items-center justify-center text-gray-400 hover:bg-[#3758F9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        {visiblePages.map((page) => {
                            const isActive = page === currentPage;
                            return (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive
                                        ? "bg-[#3758F9] text-white shadow"
                                        : "border border-gray-700 bg-[#1F2937] text-white hover:bg-[#232e3c]"
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        })}

                        <button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded-full border border-gray-700 bg-[#1F2937] flex items-center justify-center text-gray-400 hover:bg-[#3758F9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
