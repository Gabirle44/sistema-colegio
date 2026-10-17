const UNIDADES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho",
  "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco",
  "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function menorMil(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (r) {
    if (r < 30) partes.push(UNIDADES[r]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]);
    }
  }
  return partes.join(" ");
}

// "uno" -> "un" cuando va antes de "mil" o "millones"
const apocopar = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

function enteroALetras(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocopar(menorMil(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocopar(menorMil(miles))} mil`);
  if (resto) partes.push(menorMil(resto));
  return partes.join(" ");
}

// 1250.5 -> "Mil doscientos cincuenta quetzales con 50/100"
export function montoALetras(centavos: number): string {
  const entero = Math.floor(centavos / 100);
  const dec = String(centavos % 100).padStart(2, "0");
  const letras = apocopar(enteroALetras(entero));
  const unidad = entero === 1 ? "quetzal" : "quetzales";
  const texto = `${letras} ${unidad} con ${dec}/100`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
