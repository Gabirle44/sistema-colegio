import { redirect } from "next/navigation";
import { obtenerSesion } from "./session";

// Verifica en el servidor que quien llama sea administrador.
// Se usa en páginas y acciones además del proxy (defensa en profundidad).
export async function requireAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "ADMIN") redirect("/login");
  return sesion;
}
