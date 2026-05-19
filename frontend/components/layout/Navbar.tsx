"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { authApi } from "@/lib/api/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    router.push("/login");
  };

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Games", path: "/games" },
    { name: "Leaderboard", path: "/leaderboard" },
    { name: "Daily Challenge", path: "/daily" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 hidden md:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex">
            <Link href="/" className="flex flex-shrink-0 items-center font-bold text-xl text-indigo-600">
              EduPlay
            </Link>
            <div className="ml-6 flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.path
                      ? "border-indigo-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                  {user.username} (Lvl {user.level || 1})
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold leading-6 text-gray-900"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
