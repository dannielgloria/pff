export function cents(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) throw new Error("Importe inválido");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  return (
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) *
    (value.startsWith("-") ? -1n : 1n)
  );
}
export function decimal(value: bigint): string {
  const n = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function money(value: string | undefined): string {
  const n = cents(value || "0.00");
  const abs = n < 0n ? -n : n;
  return `${n < 0n ? "−" : ""}$${(abs / 100n).toLocaleString("es-MX")}.${String(abs % 100n).padStart(2, "0")}`;
}
export const split = (value: string) => {
  const n = cents(value);
  return { each: decimal(n / 2n), reserve: decimal(n % 2n) };
};
