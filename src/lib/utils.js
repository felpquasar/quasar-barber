export const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const today = () => new Date().toISOString().split("T")[0];
export const addDays = (date, days) => {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
