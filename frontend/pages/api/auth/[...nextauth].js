import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginUser } from "@/lib/api";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "user@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    // Call backend API to authenticate
                    const user = await loginUser(credentials.email, credentials.password);
                    
                    if (user) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name || user.email,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error('Authentication error:', error);
                    return null;
                }
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
};

export default NextAuth(authOptions);
