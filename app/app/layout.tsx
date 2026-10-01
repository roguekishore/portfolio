import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import Chrome from "@/components/Chrome";
import Cursor from "@/components/Cursor";
import { TransitionProvider } from "@/components/Transition";
import { UIProvider } from "@/components/ui";
import Widgets from "@/components/Widgets";

export const metadata: Metadata = {
  title: "Orbe — An independent brand studio",
  description: "Front-end study of a studio site, built with placeholder content.",
};

export const viewport: Viewport = {
  themeColor: "#060606",
};

// Chrome, widgets, cursor and the transition layer persist across routes.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full bg-black">
      <body className="h-full">
        <UIProvider>
          <TransitionProvider>
            <Chrome />
            {children}
            <Widgets />
            <Cursor />
          </TransitionProvider>
        </UIProvider>
      </body>
    </html>
  );
}
