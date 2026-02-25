/**
 * Simplifica una cadena de texto para comparación:
 * 1. Elimina espacios al inicio y al final.
 * 2. Normaliza a formato ASCII (elimina tildes y diéresis).
 * 3. Reemplaza espacios por guiones bajos.
 * 4. Convierte a mayúsculas.
 * @param texto La cadena a simplificar.
 * @returns La cadena simplificada.
 */
export function simp(texto: string): string {
  if (!texto) {
    return '';
  }
  return texto
    .replace(/\(.*\)/g, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}
/**
 * Compara dos cadenas y devuelve un puntaje de similitud entre 0 y 1.
 * Utiliza la distancia de Levenshtein.
 * @param a Primera cadena.
 * @param b Segunda cadena.
 * @returns Un número entre 0 (sin similitud) y 1 (completamente iguales).
 */
export function compara(a: string, b: string, l = 0.7): boolean {
  const maxLength: number = Math.max(a.length, b.length);
  if (maxLength === 0) return true;
  if (b.includes(a)) return true;
  const distance: number = levenshtein(a, b);
  const nivel: number = 1 - distance / maxLength;
  return nivel >= l;
}
/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 * @param a Primera cadena.
 * @param b Segunda cadena.
 * @returns La distancia de Levenshtein.
 */
function levenshtein(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}