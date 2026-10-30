// Foto del alumno; si no tiene, muestra un círculo con sus iniciales o un ícono genérico.
export default function FotoAlumno({
  alumnoId,
  tieneFoto,
  nombre,
  tamano = 64,
}: {
  alumnoId: number;
  tieneFoto: boolean;
  nombre: string;
  tamano?: number;
}) {
  const estilo = { width: tamano, height: tamano };
  if (!tieneFoto) {
    return (
      <div
        style={estilo}
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400"
        aria-label="Sin foto"
      >
        <svg viewBox="0 0 24 24" width={tamano * 0.55} height={tamano * 0.55} fill="currentColor" aria-hidden>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/alumnos/${alumnoId}/foto`}
      alt={nombre}
      style={estilo}
      className="shrink-0 rounded-full border border-slate-200 object-cover"
    />
  );
}
