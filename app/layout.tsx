import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import "@/styles/admin-prompts.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Property Management Owner Command Center",
  description: "Private owner command center using live Google Sheets read-only data or operational errors."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
