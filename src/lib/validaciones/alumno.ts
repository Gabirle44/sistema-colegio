export type AlumnoDatos = {
  carnet: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date | null;
  encargadoNombre: string;
  encargadoTelefono: string | null;
};

export type ErroresAlumno = Partial<Record<keyof AlumnoDatos, string>>;

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();

export function validarAlumno(
  fd: FormData,
): { datos: AlumnoDatos; errors?: undefined } | { datos?: undefined; errors: ErroresAlumno } {
  const errors: ErroresAlumno = {};

  const carnet = texto(fd, "carnet");
  const nombres = texto(fd, "nombres");
  const apellidos = texto(fd, "apellidos");
  const encargadoNombre = texto(fd, "encargadoNombre");
  const telefono = texto(fd, "encargadoTelefono");
  const fecha = texto(fd, "fechaNacimiento");

  if (!carnet) errors.carnet = "El carnet es obligatorio";
  else if (carnet.length > 30) errors.carnet = "Máximo 30 caracteres";

  if (!nombres) errors.nombres = "Los nombres son obligatorios";
  if (!apellidos) errors.apellidos = "Los apellidos son obligatorios";
  if (!encargadoNombre) errors.encargadoNombre = "El nombre del encargado es obligatorio";

  if (telefono && !/^[0-9+\-\s]{8,15}$/.test(telefono)) {
    errors.encargadoTelefono = "Teléfono inválido (8 a 15 dígitos)";
  }

  let fechaNacimiento: Date | null = null;
  if (fecha) {
    const d = new Date(`${fecha}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) errors.fechaNacimiento = "Fecha inválida";
    else if (d.getTime() > Date.now()) errors.fechaNacimiento = "La fecha no puede ser futura";
    else fechaNacimiento = d;
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    datos: {
      carnet,
      nombres,
      apellidos,
      fechaNacimiento,
      encargadoNombre,
      encargadoTelefono: telefono || null,
    },
  };
}
