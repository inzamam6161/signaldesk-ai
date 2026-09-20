import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalDesk — Customer Intelligence",
  description:
    "A customer-intelligence dashboard with searchable feedback, local workspace persistence, evidence-based analysis, sentiment classification and follow-up tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
