import { Figtree } from "next/font/google";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className={figtree.className}>{children}</div>;
}
