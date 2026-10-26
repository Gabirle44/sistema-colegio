interface DatosPdf {
  colegio: { nombre: string };
  curso: string;
  grado: string;
  seccion: string;
  maestro: string;
  ciclo: number;
  anio: number;
  mes: number;
  alumnos: { nombre: string; carnet: string }[];
}

export async function pdfListaAsistencia(datos: DatosPdf): Promise<Uint8Array> {
  const ultimoDia = new Date(datos.anio, datos.mes, 0).getDate();
  const dias: { numero: number; diaSemana: string; esViernes: boolean }[] = [];
  const letrasDias = ["D", "L", "M", "M", "J", "V", "S"];

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(datos.anio, datos.mes - 1, d);
    const diaSem = fecha.getDay();
    if (diaSem !== 0 && diaSem !== 6) {
      dias.push({
        numero: d,
        diaSemana: letrasDias[diaSem],
        esViernes: diaSem === 5,
      });
    }
  }

  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <style>
        @page { size: landscape; margin: 6mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; background-color: #0f172a; }
        .page-container { background-color: #ffffff; min-height: 100vh; padding: 12px; box-sizing: border-box; }
        
        .top-header { display: flex; justify-content: flex-end; color: #ffffff; font-size: 13px; padding: 4px 8px; font-weight: 500; }
        .top-bar { height: 4px; background-color: #f59e0b; width: 100%; margin-bottom: 16px; }
        
        /* Caja de encabezado exacta a la original */
        .info-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background-color: #ffffff;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 2px; }

        /* Tabla exacta a la original */
        table { width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #cbd5e1; }
        th, td { border: 1px solid #cbd5e1; text-align: center; padding: 5px 2px; font-size: 10px; color: #334155; }
        th { background-color: #e2e8f0; font-weight: bold; }
        .col-alumno { text-align: left; padding-left: 8px; width: 250px; font-weight: 500; color: #1e293b; }
        
        /* ÚNICO AGREGADO: Borde azul en el borde derecho del Viernes */
        .border-viernes { border-right: 2.5px solid #2563eb !important; }
        
        .totales-header { background-color: #e2e8f0; font-weight: bold; color: #64748b; }
        .text-p { color: #16a34a; font-weight: bold; }
        .text-a { color: #dc2626; font-weight: bold; }
        .text-t { color: #d97706; font-weight: bold; }
        .text-e { color: #2563eb; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="top-header">${nombresMeses[datos.mes - 1]} ${datos.anio}</div>
      <div class="top-bar"></div>
      
      <div class="page-container">
        <div class="info-card">
          <div class="info-item">
            <span class="info-label">Curso</span>
            <span class="info-value">${datos.curso.toUpperCase()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Grado</span>
            <span class="info-value">${datos.grado} "${datos.seccion}"</span>
          </div>
          <div class="info-item">
            <span class="info-label">Maestro</span>
            <span class="info-value">${datos.maestro}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ciclo</span>
            <span class="info-value">${datos.ciclo}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px; color: #64748b;">No.</th>
              <th rowspan="2" class="col-alumno" style="color: #64748b; font-weight: bold;">ALUMNO</th>
              ${dias.map((d) => `<th class="${d.esViernes ? "border-viernes" : ""}">${d.numero}</th>`).join("")}
              <th colspan="4" class="totales-header">TOTALES</th>
            </tr>
            <tr>
              ${dias.map((d) => `<th class="${d.esViernes ? "border-viernes" : ""}">${d.diaSemana}</th>`).join("")}
              <th class="text-p">P</th>
              <th class="text-a">A</th>
              <th class="text-t">T</th>
              <th class="text-e">E</th>
            </tr>
          </thead>
          <tbody>
            ${
              datos.alumnos.length > 0
                ? datos.alumnos
                    .map(
                      (alumno, idx) => `
                <tr>
                  <td style="color: #64748b;">${idx + 1}</td>
                  <td class="col-alumno">${alumno.nombre}</td>
                  ${dias.map((d) => `<td class="${d.esViernes ? "border-viernes" : ""}"></td>`).join("")}
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `
                    )
                    .join("")
                : `<tr><td colspan="${dias.length + 6}">No hay alumnos inscritos.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  return new TextEncoder().encode(html);
}