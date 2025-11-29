import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token, user }) {
            // Add custom session logic here if needed
            return session;
        },
    },
};

export default NextAuth(authOptions);
