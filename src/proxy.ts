import { NextRequest, NextResponse } from "next/server";
import { leerSesion } from "@/lib/jwt";

// Protege las rutas por rol. En Next.js 16 "proxy" reemplaza a "middleware".
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await leerSesion(req.cookies.get("sesion")?.value);

  if (!sesion) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && sesion.rol !== "ADMIN") {
    return NextResponse.redirect(new URL("/maestro", req.url));
  }
  if (pathname.startsWith("/maestro") && sesion.rol !== "MAESTRO") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/maestro/:path*"],
};
