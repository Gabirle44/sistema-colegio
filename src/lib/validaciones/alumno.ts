export type AlumnoDatos = {
  carnet: string;
  cui: string | null;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date | null;
  telefono: string | null;
  encargadoNombre: string;
  encargadoTelefono: string | null;
  encargadoCorreo: string | null;
};

export type ErroresAlumno = Partial<Record<keyof AlumnoDatos, string>>;

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();
const TELEFONO = /^[0-9+\-\s]{8,15}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarAlumno(
  fd: FormData,
): { datos: AlumnoDatos; errors?: undefined } | { datos?: undefined; errors: ErroresAlumno } {
  const errors: ErroresAlumno = {};

  const carnet = texto(fd, "carnet");
  const cui = texto(fd, "cui").replace(/[\s-]/g, "");
  const nombres = texto(fd, "nombres");
  const apellidos = texto(fd, "apellidos");
  const fecha = texto(fd, "fechaNacimiento");
  const telefono = texto(fd, "telefono");
  const encargadoNombre = texto(fd, "encargadoNombre");
  const encargadoTelefono = texto(fd, "encargadoTelefono");
  const encargadoCorreo = texto(fd, "encargadoCorreo").toLowerCase();

  // Obligatorios
  if (!carnet) errors.carnet = "El carnet es obligatorio";
  else if (carnet.length > 30) errors.carnet = "Máximo 30 caracteres";
  if (!nombres) errors.nombres = "Los nombres son obligatorios";
  if (!apellidos) errors.apellidos = "Los apellidos son obligatorios";
  if (!encargadoNombre) errors.encargadoNombre = "El nombre del encargado es obligatorio";

  // Opcionales: solo se validan si vienen con datos
  if (cui && !/^\d{13}$/.test(cui)) errors.cui = "El CUI debe tener 13 dígitos";
  if (telefono && !TELEFONO.test(telefono)) errors.telefono = "Teléfono inválido (8 a 15 dígitos)";
  if (encargadoTelefono && !TELEFONO.test(encargadoTelefono)) {
    errors.encargadoTelefono = "Teléfono inválido (8 a 15 dígitos)";
  }
  if (encargadoCorreo && (!CORREO.test(encargadoCorreo) || encargadoCorreo.length > 120)) {
    errors.encargadoCorreo = "Correo inválido";
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
      cui: cui || null,
      nombres,
      apellidos,
      fechaNacimiento,
      telefono: telefono || null,
      encargadoNombre,
      encargadoTelefono: encargadoTelefono || null,
      encargadoCorreo: encargadoCorreo || null,
    },
  };
}
