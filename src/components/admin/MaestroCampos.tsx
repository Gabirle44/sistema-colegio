import { inputCls } from "@/lib/ui";

type Valores = { nombres?: string; apellidos?: string; email?: string; telefono?: string | null; salario?: string };

const L = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{t}</span>
    {children}
  </label>
);

export default function MaestroCampos({ v = {} }: { v?: Valores }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <L t="Nombres *"><input name="nombres" defaultValue={v.nombres} className={inputCls} /></L>
      <L t="Apellidos *"><input name="apellidos" defaultValue={v.apellidos} className={inputCls} /></L>
      <L t="Correo (usuario de acceso) *">
        <input name="email" type="email" defaultValue={v.email} className={inputCls} />
      </L>
      <L t="Teléfono"><input name="telefono" defaultValue={v.telefono ?? ""} inputMode="tel" className={inputCls} /></L>
      <L t="Salario mensual (Q)">
        <input name="salario" defaultValue={v.salario} inputMode="decimal" placeholder="0.00" className={inputCls} />
      </L>
    </div>
  );
}
