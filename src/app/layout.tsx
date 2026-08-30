import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { YearProvider } from "@/lib/contexts/YearContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Property Management Portal",
  description: "Modern Property Management System",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <AuthProvider>
            <YearProvider>
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
            </YearProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
