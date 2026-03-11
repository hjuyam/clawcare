import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawCare",
  description: "ClawCare（龙虾管家）- OpenClaw 运维与治理面板",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
