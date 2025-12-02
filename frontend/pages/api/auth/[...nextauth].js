import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // Simple mock auth for "simple steps" requirement
                if (credentials.username === 'admin' && credentials.password === 'password') {
                    return { id: "1", name: "Admin User", email: "admin@example.com" }
                }
                return null
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token, user }) {
            return session;
        },
    },
};

export default NextAuth(authOptions);
