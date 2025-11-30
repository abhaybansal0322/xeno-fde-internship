import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useTenant } from "../contexts/TenantContext";

export default function Header() {
    const { data: session } = useSession();
    const { tenantId, tenants, setTenantId, loading } = useTenant();

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-indigo-600">
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
                                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    {tenants.map((tenant) => (
                                        <option key={tenant.id} value={tenant.id}>
                                            {tenant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {session ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-700 hidden sm:block">
                                    {session.user.email}
                                </span>
                                <button
                                    onClick={() => signOut()}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => signIn("github")}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
