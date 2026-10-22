import type { Metadata } from "next";
import "./globals.css";
import SiteBackgroundSwitcher from "./components/SiteBackgroundSwitcher";
import Footer from "./components/Footer";
import DisclaimerPopup from "./components/DisclaimerPopup";

export const metadata: Metadata = {
  title: "喜灰RPG游戏资源站",
  description: "收录所有喜灰RPG，感兴趣可以来看一下",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteBackgroundSwitcher />

        <div className="site-content-layer">
          {children}
          <Footer />
        </div>

        <DisclaimerPopup />
      </body>
    </html>
  );
}
