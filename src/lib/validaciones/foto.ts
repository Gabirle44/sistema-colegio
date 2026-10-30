// Validación de la foto del alumno (SC-38). Se confía en los bytes del archivo,
// nunca en el tipo que declara el navegador.
export const FOTO_MAX_BYTES = 200 * 1024; // 200 KB

export type TipoFoto = "image/jpeg" | "image/png";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];

const empieza = (b: Uint8Array, firma: number[]) => firma.every((v, i) => b[i] === v);

export function detectarTipoFoto(bytes: Uint8Array): TipoFoto | null {
  if (empieza(bytes, PNG)) return "image/png";
  if (empieza(bytes, JPEG)) return "image/jpeg";
  return null;
}

export type ResultadoFoto =
  | { datos: { bytes: Uint8Array<ArrayBuffer>; tipo: TipoFoto }; error?: undefined }
  | { datos?: undefined; error: string }
  | { datos?: undefined; error?: undefined }; // no se subió nada

export function validarBytesFoto(bytes: Uint8Array<ArrayBuffer>): ResultadoFoto {
  if (bytes.length > FOTO_MAX_BYTES) return { error: "La foto pesa más de 200 KB" };
  const tipo = detectarTipoFoto(bytes);
  if (!tipo) return { error: "La foto debe ser JPG o PNG" };
  return { datos: { bytes, tipo } };
}

// Lee el campo de archivo de un FormData. Si no se eligió archivo, no hay error ni datos.
export async function leerFoto(valor: FormDataEntryValue | null): Promise<ResultadoFoto> {
  if (!(valor instanceof File) || valor.size === 0) return {};
  if (valor.size > FOTO_MAX_BYTES) return { error: "La foto pesa más de 200 KB" };
  return validarBytesFoto(new Uint8Array(await valor.arrayBuffer()));
}
