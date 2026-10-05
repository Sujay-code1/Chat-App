import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

import { AppProvider } from "@/src/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mingle — chat with your people",
  description: "Private, simple conversations with the people who matter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      
    >
      <body className="bg-gray-900 text-white">
        <AppProvider>
          {children}
          <Toaster position="top-right" />
        </AppProvider>
      </body>
    </html>
  );
}
