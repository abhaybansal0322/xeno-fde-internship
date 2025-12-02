import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useTenant } from "../contexts/TenantContext";

export default function Header() {
    const { data: session } = useSession();
    const { tenantId, tenants, setTenantId, loading } = useTenant();

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-slate-900 tracking-tight">
                                Xeno Dashboard
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {session && tenants.length > 0 && (
                            <div className="flex items-center">
                                <label htmlFor="tenant-select" className="sr-only">
                                    Select Tenant
                                </label>
                                <select
                                    id="tenant-select"
                                    value={tenantId || ''}
                                    onChange={(e) => setTenantId(e.target.value)}
                                    disabled={loading}
                                    className="block w-48 pl-3 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {tenants.map((tenant) => (
                                        <option key={tenant.id} value={tenant.id} className="text-slate-900">
                                            {tenant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {session ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-slate-600 hidden sm:block font-medium">
                                    {session.user.email}
                                </span>
                                <button
                                    onClick={() => signOut()}
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => signIn("github")}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
