export type AccionState = { error?: string; ok?: string } | undefined;

// Error esperado (validación o regla de negocio): se muestra al usuario tal cual.
export class ErrorNegocio extends Error {}
