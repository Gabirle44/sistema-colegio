// Utilidades de CSV (se usan en el navegador)
export const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Separa una línea respetando comillas; el separador puede ser , ; o tabulador
export function partirLinea(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') { actual += '"'; i++; } else comillas = !comillas;
    } else if (c === sep && !comillas) { out.push(actual); actual = ""; } else actual += c;
  }
  out.push(actual);
  return out.map((x) => x.trim());
}

export function detectarSeparador(encabezado: string): string {
  return [";", "\t", ","].reduce((mejor, c) => (encabezado.split(c).length > encabezado.split(mejor).length ? c : mejor), ",");
}

export const escCsv = (t: string) => (/[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
