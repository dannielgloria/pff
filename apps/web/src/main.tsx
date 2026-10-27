import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  House,
  Wallet,
  Users,
  TrendingUp,
  ChartNoAxesCombined,
  Settings,
  ReceiptText,
  LogOut,
  Sun,
  Moon,
  Menu,
  ShieldCheck,
  Plus,
  X,
  ArrowRight,
  Download,
} from "lucide-react";
import { request, configured, key, type Row } from "./api";
import { money, cents, decimal } from "./money";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true } },
});
const nav = [
  ["/", "Inicio", House],
  ["/calendar", "Calendario", CalendarDays],
  ["/payroll", "Nóminas", CircleDollarSign],
  ["/expenses", "Gastos", ReceiptText],
  ["/funds", "Cuentas y fondos", Wallet],
  ["/personal", "Dinero personal", Users],
  ["/investments", "Inversiones", TrendingUp],
  ["/projections", "Proyecciones", ChartNoAxesCombined],
  ["/reports", "Reportes", ReceiptText],
  ["/settings", "Configuración", Settings],
] as const;
function useData<T>(path: string) {
  return useQuery<T>({ queryKey: [path], queryFn: () => request<T>(path) });
}
type Field = {
  optional?: boolean;
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string;
};
type Action = {
  title: string;
  path: string;
  method?: string;
  fields: Field[];
  fixed?: Record<string, unknown>;
};
function EntryForm({
  action,
  onClose,
}: {
  action: Action;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,select,[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCallback.current();
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, []);
  const schema = z.object(
    Object.fromEntries(
      action.fields.map((f) => [
        f.name,
        f.type === "amount"
          ? z.string().regex(/^\d+(\.\d{1,2})?$/, "Usa hasta dos decimales")
          : f.optional ||
              f.name === "fund_id" ||
              f.name === "active" ||
              f.name === "scenario_role"
            ? z.string()
            : z.string().min(1, "Campo obligatorio"),
      ]),
    ),
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      action.fields.map((f) => [f.name, f.value || ""]),
    ),
  });
  return (
    <div className="overlay">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="dialog"
      >
        <div className="section-head">
          <h2 id="dialog-title">{action.title}</h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(async (values) => {
            setBusy(true);
            setError("");
            try {
              await request(action.path, action.method || "POST", {
                ...Object.fromEntries(
                  Object.entries(values).filter(
                    ([k, v]) => v !== "" || k === "active",
                  ),
                ),
                ...action.fixed,
                operation_key: key(),
              });
              await qc.invalidateQueries();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          })}
        >
          {action.fields.map((f) => (
            <label key={f.name}>
              {f.label}
              {f.options ? (
                <select {...register(f.name)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoComplete="off"
                  {...register(f.name)}
                  type={f.type === "amount" ? "text" : f.type || "text"}
                  inputMode={f.type === "amount" ? "decimal" : undefined}
                />
              )}
              <small className="error">{errors[f.name]?.message}</small>
            </label>
          ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar operación"}
          </button>
        </form>
      </section>
    </div>
  );
}
const loginSchema = z.object({
  email: z.string().email("Introduce un correo válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});
function Login() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  return (
    <main className="login">
      <div className="login-art">
        <div className="brand">
          <House /> casa<span>FINANZAS FAMILIARES</span>
        </div>
        <h1>
          Un plan compartido.
          <br />
          Un futuro más tranquilo.
        </h1>
        <p>Un espacio para decidir juntos.</p>
        <div className="login-orbit">
          <House size={64} />
        </div>
        <span className="eyebrow">CLARIDAD HOY. TRANQUILIDAD MAÑANA.</span>
      </div>
      <section>
        <span className="eyebrow">BIENVENIDOS A CASA</span>
        <h2>Sus finanzas, en orden.</h2>
        <p>Inicia sesión en tu espacio familiar privado.</p>
        <form
          onSubmit={handleSubmit(async (d) => {
            try {
              setError("");
              await request("/auth/me");
              await request("/auth/login", "POST", d);
              await qc.invalidateQueries();
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              {...register("email")}
            />
            <small className="error">{errors.email?.message}</small>
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            <small className="error">{errors.password?.message}</small>
          </label>
          {(!configured || error) && (
            <p className="notice" role="alert">
              {error ||
                "API pendiente de configurar. No se muestran datos financieros simulados."}
            </p>
          )}
          <button className="primary" disabled={isSubmitting || !configured}>
            {isSubmitting ? "Conectando…" : "Entrar a casa"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="secure">
          <ShieldCheck size={16} /> Sesión privada · Sin registro público
        </p>
      </section>
    </main>
  );
}
type Summary = {
  reserve_required: string;
  emergency_suggested_goal: string;
  next_payroll: Row | null;
  cycle_state: { mode: string; status: string } | null;
  cash: string;
  reserved: string;
  free: string;
  pending: string;
  paid: string;
  overdue: string;
  funds: Row[];
  as_of: string;
};
function Status({
  query,
}: {
  query: { isPending: boolean; error: Error | null };
}) {
  return query.error ? (
    <div role="alert" className="notice error">
      {query.error.message}
    </div>
  ) : query.isPending ? (
    <p className="muted" role="status">
      Consultando datos…
    </p>
  ) : null;
}
function Stat({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={"stat " + (accent ? "accent" : "")}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Home({ suffix }: { suffix: string }) {
  const q = useData<Summary>("/dashboard/summary" + suffix);
  const flow = useData<Row[]>("/dashboard/cashflow" + suffix);
  const payroll = useData<Row[]>("/payroll" + suffix);
  const expenses = useData<Row[]>("/expense-occurrences" + suffix);
  const s = q.data;
  const upcoming = [
    ...(payroll.data || [])
      .filter((p) => !p.transaction_id && p.status !== "CANCELLED")
      .map((p) => ({
        name: `Nómina ${p.person}`,
        date: String(p.scheduled_on),
        amount: String(p.budgeted_amount),
        income: true,
      })),
    ...(expenses.data || [])
      .filter((e) => e.status !== "paid")
      .map((e) => ({
        name: String(e.name),
        date: String(e.due_on),
        amount: String(e.remaining),
        income: false,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  return (
    <>
      <div className="intro">
        <div>
          <span className="eyebrow">SU DINERO, CON PERSPECTIVA</span>
          <h1>Todo empieza en casa.</h1>
          <p>Una vista clara de lo que tienen y lo que viene.</p>
        </div>
        <span className="pill">
          <span className="dot" /> Sólo movimientos confirmados
        </span>
      </div>
      <Status query={q} />
      {s && (
        <>
          <div className="stats">
            <Stat
              label="Dinero realmente libre"
              value={s.free}
              detail="Efectivo menos todos los apartados"
              accent
            />
            <Stat
              label="Saldo bancario registrado"
              value={s.cash}
              detail="Total de las cuentas registradas"
            />
            <Stat
              label="Dinero comprometido"
              value={s.reserved}
              detail="Apartados en todos los fondos"
            />
            <Stat
              label="Pendiente de pago"
              value={s.pending}
              detail="Obligaciones del ciclo seleccionado"
            />
          </div>
          {cents(s.overdue) > 0n && (
            <div className="notice error">
              Hay {money(s.overdue)} en obligaciones vencidas. El ciclo no puede
              cerrarse.
            </div>
          )}
          {cents(s.pending) > cents(s.cash) && (
            <div className="notice">
              Los pagos pendientes superan el efectivo confirmado. Las nóminas
              futuras no están disponibles.
            </div>
          )}
          <div className="cycle-strip">
            <span>
              Reserva requerida según calendario base{" "}
              <b>{money(s.reserve_required)}</b>
            </span>
            <span>
              Meta orientativa de emergencia · 6 meses{" "}
              <b>{money(s.emergency_suggested_goal)}</b>
            </span>
            <span>
              Estado del ciclo{" "}
              <b>
                {s.cycle_state?.mode === "regular"
                  ? "Regular"
                  : "En transición"}{" "}
                · {s.cycle_state?.status === "closed" ? "Cerrado" : "Abierto"}
              </b>
            </span>
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">MOVIMIENTOS CONFIRMADOS</span>
                  <h2>El recorrido de su dinero</h2>
                </div>
                <span className="muted">MXN</span>
              </div>
              <div className="chart">
                {flow.data?.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={flow.data.map((r) => ({
                        ...r,
                        value: Number(r.after),
                      }))}
                    >
                      <defs>
                        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#458574"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#458574"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis dataKey="occurred_on" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={65} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Saldo registrado"
                        stroke="#397661"
                        strokeWidth={2.5}
                        fill="url(#fill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty">
                    <ChartNoAxesCombined />
                    <p>
                      Su historia financiera comienza
                      <br />
                      con el primer movimiento confirmado.
                    </p>
                  </div>
                )}
              </div>
              <p className="footnote">
                Flujo neto del ciclo. Los traspasos propios no modifican el
                patrimonio.
              </p>
            </section>
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">EN EL HORIZONTE</span>
                  <h2>Próximos movimientos</h2>
                </div>
                <CalendarDays size={19} />
              </div>
              {upcoming.map((r, i) => (
                <div className="movement" key={i}>
                  <span
                    className={"movement-icon " + (r.income ? "green" : "")}
                  >
                    {r.income ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <div>
                    <b>{r.name}</b>
                    <small>{r.date} · Programado</small>
                  </div>
                  <strong>
                    {r.income ? "+" : "−"}
                    {money(r.amount)}
                  </strong>
                </div>
              ))}
              {!upcoming.length && (
                <p className="empty">
                  Genera el calendario del ciclo en Configuración.
                </p>
              )}
              <NavLink to="/calendar" className="text-link">
                Ver calendario completo <ArrowRight size={15} />
              </NavLink>
            </section>
          </div>
          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">CADA PESO CON UN PROPÓSITO</span>
                <h2>Sus fondos, a la vista</h2>
              </div>
              <NavLink to="/funds" className="text-link">
                Administrar fondos <ArrowRight size={15} />
              </NavLink>
            </div>
            <div className="fund-grid">
              {s.funds
                .filter((f) => f.code !== "unbudgeted")
                .map((f) => (
                  <div className="fund-mini" key={f.id}>
                    <span>{f.name}</span>
                    <strong>{money(String(f.balance))}</strong>
                    <div className="fund-line" />
                  </div>
                ))}
            </div>
          </section>
          <p className="footnote">
            Saldos y fondos acumulados a {s.as_of}. Pendientes y flujo según
            ciclo seleccionado. Importes en pesos mexicanos.
          </p>
        </>
      )}
    </>
  );
}
const dateField: Field = {
  name: "occurred_on",
  label: "Fecha real",
  type: "date",
};
function Table({
  columns,
  rows,
  actions,
}: {
  columns: [string, string][];
  rows: Row[];
  actions?: (r: Row) => React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([k, l]) => (
              <th key={k}>{l}</th>
            ))}
            {actions && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || i)}>
              {columns.map(([k]) => (
                <td key={k}>
                  {r[k] === null || r[k] === undefined
                    ? "—"
                    : k.includes("amount") ||
                        [
                          "balance",
                          "paid",
                          "remaining",
                          "current_value",
                          "opening",
                          "income",
                          "expenses",
                          "closing",
                          "saving",
                          "investment",
                          "personal_each",
                          "before",
                          "after",
                          "net",
                          "target",
                          "reserve",
                          "reserve_next",
                          "next_cycle_income_held",
                          "minimum_operating",
                          "operating",
                        ].includes(k)
                      ? money(String(r[k] || "0.00"))
                      : String(r[k] ?? "—")}
                </td>
              ))}
              {actions && <td className="actions">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">No hay registros para esta selección.</div>
      )}
    </div>
  );
}
function Workspace() {
  const location = useLocation();
  const qc = useQueryClient();
  const cycles = useData<Row[]>("/cycles");
  const accounts = useData<Row[]>("/accounts");
  const [cycle, setCycle] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const selected =
    cycle ||
    String(cycles.data?.filter((c) => c.status === "open").at(-1)?.id || "");
  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
    ...(selected ? { cycle_id: selected } : {}),
  });
  const suffix = "?" + params.toString();
  const accountField: Field = {
    name: "account_id",
    label: "Cuenta",
    options: (accounts.data || []).map((a) => ({
      value: String(a.id),
      label: String(a.name),
    })),
  };
  const perform = async (path: string, data: unknown = {}) => {
    try {
      setError("");
      await request(path, "POST", data);
      await qc.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const title = nav.find((n) => n[0] === location.pathname)?.[1] || "Inicio";
  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <House size={21} />
          </span>
          casa<span>FINANZAS FAMILIARES</span>
        </NavLink>
        <div className="family-label">DANIEL & CAROLINA</div>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setMobile(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatars">
            <span>D</span>
            <span>C</span>
            <div>
              <b>Un equipo, un plan</b>
              <small>Espacio familiar privado</small>
            </div>
          </div>
          <button
            onClick={async () => {
              await request("/auth/logout", "POST", {});
              qc.clear();
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Abrir navegación"
            >
              <Menu />
            </button>
            <span>Espacio familiar</span>
            <span>/</span>
            <b>{title}</b>
          </div>
          <div className="header-tools">
            <select
              aria-label="Ciclo presupuestal"
              value={selected}
              onChange={(e) => setCycle(e.target.value)}
            >
              <option value="">Selecciona ciclo</option>
              {cycles.data?.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.month} · {c.status === "closed" ? "Cerrado" : "Abierto"}
                </option>
              ))}
            </select>
            <button aria-label="Cambiar tema" onClick={() => setDark(!dark)}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="avatar">DC</span>
          </div>
        </header>
        <div className="content">
          <details className="filter-panel">
            <summary>Filtros de consulta</summary>
            <div className="filter-controls">
              <label>
                Desde
                <input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                  }
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                />
              </label>
              <label>
                Persona
                <select
                  value={filters.person_id || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, person_id: e.target.value })
                  }
                >
                  <option value="">Ambas</option>
                  <option value="1">Daniel + compartidos</option>
                  <option value="2">Carolina + compartidos</option>
                </select>
              </label>
              <label>
                Fondo de movimientos
                <select
                  value={filters.fund_id || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, fund_id: e.target.value })
                  }
                >
                  <option value="">Todos</option>
                  <option value="1">Hogar</option>
                  <option value="2">Reserva</option>
                  <option value="3">Emergencia</option>
                  <option value="4">Inversión</option>
                  <option value="5">Personal Daniel</option>
                  <option value="6">Personal Carolina</option>
                </select>
              </label>
              <button onClick={() => setFilters({})}>Limpiar filtros</button>
            </div>
            <p className="footnote">
              Las fechas/personas filtran eventos y movimientos; el fondo filtra
              movimientos registrados. Los saldos acumulados conservan el total
              familiar.
            </p>
          </details>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home suffix={suffix} />} />
            <Route
              path="/payroll"
              element={
                <Payroll
                  suffix={suffix}
                  accountField={accountField}
                  setAction={setAction}
                  perform={perform}
                />
              }
            />
            <Route
              path="/expenses"
              element={
                <Expenses
                  suffix={suffix}
                  accountField={accountField}
                  setAction={setAction}
                />
              }
            />
            <Route path="/calendar" element={<Calendar suffix={suffix} />} />
            <Route
              path="/funds"
              element={
                <Funds
                  selected={selected}
                  accountField={accountField}
                  setAction={setAction}
                />
              }
            />
            <Route
              path="/personal"
              element={
                <Personal
                  suffix={suffix}
                  selected={selected}
                  accountField={accountField}
                  setAction={setAction}
                />
              }
            />
            <Route
              path="/investments"
              element={
                <Investments
                  selected={selected}
                  accountField={accountField}
                  setAction={setAction}
                />
              }
            />
            <Route path="/projections" element={<Projections />} />
            <Route
              path="/reports"
              element={
                <Reports
                  suffix={suffix}
                  accountField={accountField}
                  setAction={setAction}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <Configuration
                  selected={selected}
                  accounts={accounts.data || []}
                  setAction={setAction}
                  perform={perform}
                />
              }
            />
          </Routes>
        </div>
      </main>
      {action && <EntryForm action={action} onClose={() => setAction(null)} />}
    </div>
  );
}
type Props = {
  suffix: string;
  accountField: Field;
  setAction: (a: Action) => void;
  perform?: (p: string, d?: unknown) => Promise<void>;
};
function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">CASA · FINANZAS COMPARTIDAS</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Payroll({ suffix, accountField, setAction, perform }: Props) {
  const q = useData<Row[]>("/payroll" + suffix);
  const [proposal, setProposal] = useState<{
    id: number;
    values: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState("");
  return (
    <>
      <Heading
        title="Cada ingreso, un propósito."
        subtitle="Nominal → efectiva al hábil anterior → real confirmada. El ciclo se conserva al cruzar de mes."
      />
      <Status query={q} />
      <section className="panel">
        <Table
          rows={q.data || []}
          columns={[
            ["person", "Persona"],
            ["nominal_payment_date", "Nominal"],
            ["scheduled_payment_date", "Efectiva programada"],
            ["actual_payment_date", "Real recibida"],
            ["budget_cycle", "Ciclo presupuestal"],
            ["status", "Estado"],
            ["variance_days", "Días de diferencia real"],
            ["budgeted_amount", "Presupuesto"],
            ["received_amount", "Recibido"],
          ]}
          actions={(r) => (
            <>
              {!r.transaction_id ? (
                <>
                  <button
                    disabled={r.status === "CANCELLED"}
                    onClick={() =>
                      setAction({
                        title: "Confirmar nómina recibida",
                        path: `/payroll/${r.id}/confirm`,
                        fields: [
                          {
                            name: "amount",
                            label: "Importe realmente recibido",
                            type: "amount",
                            value: String(r.budgeted_amount),
                          },
                          dateField,
                          accountField,
                        ],
                      })
                    }
                  >
                    Confirmar depósito
                  </button>
                  <button
                    onClick={() =>
                      setAction({
                        title: "Reprogramar nómina",
                        path: `/payroll/${r.id}`,
                        method: "PATCH",
                        fields: [
                          {
                            name: "nominal_payment_date",
                            label: "Fecha nominal (la efectiva se recalcula)",
                            type: "date",
                            value: String(r.nominal_payment_date),
                          },
                          {
                            name: "budgeted_amount",
                            label: "Presupuesto",
                            type: "amount",
                            value: String(r.budgeted_amount),
                          },
                        ],
                      })
                    }
                  >
                    Editar nominal
                  </button>
                  <button
                    onClick={() =>
                      setAction({
                        title:
                          r.status === "CANCELLED"
                            ? "Restaurar nómina programada"
                            : "Cancelar nómina no recibida",
                        path: `/payroll/${r.id}`,
                        method: "PATCH",
                        fields: [],
                        fixed: {
                          status:
                            r.status === "CANCELLED"
                              ? "PROGRAMMED"
                              : "CANCELLED",
                        },
                      })
                    }
                  >
                    {r.status === "CANCELLED" ? "Restaurar" : "Cancelar"}
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      setError("");
                      const values = await request<Record<string, string>>(
                        `/payroll/${r.id}/proposal`,
                      );
                      setProposal({ id: Number(r.id), values });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Distribuir nómina
                </button>
              )}
            </>
          )}
        />
      </section>
      {error && <p className="error">{error}</p>}
      {proposal && (
        <section className="panel">
          <h2>Propuesta de distribución</h2>
          <p>
            Orden: hogar, reserva, emergencia, inversión y remanente personal
            50/50. El excedente queda separado.
          </p>
          <Table
            columns={[
              ["name", "Fondo"],
              ["amount", "Asignación"],
            ]}
            rows={Object.entries(proposal.values).map(([name, amount]) => ({
              name,
              amount,
            }))}
          />
          <button
            className="primary"
            onClick={async () => {
              await perform?.(`/payroll/${proposal.id}/allocate`, {
                allocations: proposal.values,
              });
              setProposal(null);
            }}
          >
            Confirmar apartados internos
          </button>
        </section>
      )}
    </>
  );
}
function Expenses({ suffix, accountField, setAction }: Props) {
  const q = useData<Row[]>("/expense-occurrences" + suffix);
  const [catalog, setCatalog] = useState(false);
  const concepts = useData<Row[]>("/expenses");
  const expenseFields = (r?: Row): Field[] => [
    { name: "name", label: "Concepto", value: String(r?.name || "") },
    {
      name: "member_id",
      label: "Persona asociada",
      optional: true,
      value: String(r?.member_id || ""),
      options: [
        { value: "", label: "Ambos" },
        { value: "1", label: "Daniel" },
        { value: "2", label: "Carolina" },
      ],
    },
    {
      name: "payer_id",
      label: "Pagador operativo",
      optional: true,
      value: String(r?.payer_id || ""),
      options: [
        { value: "", label: "Sin asignar" },
        { value: "1", label: "Daniel" },
        { value: "2", label: "Carolina" },
      ],
    },
    {
      ...accountField,
      optional: true,
      value: String(r?.account_id || ""),
      options: [
        { value: "", label: "Sin cuenta predeterminada" },
        ...(accountField.options || []),
      ],
    },
    {
      name: "priority",
      label: "Prioridad (menor = más urgente)",
      type: "number",
      value: String(r?.priority || 10),
    },
    {
      name: "notes",
      label: "Notas",
      optional: true,
      value: String(r?.notes || ""),
    },
    { name: "category", label: "Categoría", value: String(r?.category || "") },
    {
      name: "scenario_role",
      label: "Uso en escenarios",
      value: String(r?.scenario_role || ""),
      options: [
        { value: "", label: "Sin regla especial" },
        { value: "rent", label: "Renta" },
        { value: "groceries", label: "Despensa" },
      ],
    },
    {
      name: "amount",
      label: "Importe",
      type: "amount",
      value: String(r?.amount || ""),
    },
    {
      name: "day_of_month",
      label: "Día (1–31)",
      type: "number",
      value: String(r?.day_of_month || 1),
    },
    {
      name: "active",
      label: "Estado",
      options: [
        { value: "1", label: "Activo" },
        { value: "", label: "Pausado" },
      ],
      value: r === undefined || r.active ? "1" : "",
    },
  ];
  return (
    <>
      <Heading
        title="Lo que hace funcionar su hogar."
        subtitle="Pagos parciales, vencimientos y conceptos recurrentes."
      >
        <button onClick={() => setCatalog(!catalog)}>
          {catalog ? "Ver pagos" : "Ver conceptos"}
        </button>
        <button
          className="primary"
          onClick={() =>
            setAction({
              title: "Nuevo gasto recurrente",
              path: "/expenses",
              fields: expenseFields(),
            })
          }
        >
          <Plus size={16} /> Nuevo concepto
        </button>
      </Heading>
      <Status query={q} />
      <section className="panel">
        {catalog ? (
          <Table
            rows={concepts.data || []}
            columns={[
              ["name", "Concepto"],
              ["category", "Categoría"],
              ["amount", "Importe"],
              ["day_of_month", "Día"],
              ["active", "Activo"],
            ]}
            actions={(r) => (
              <button
                onClick={() =>
                  setAction({
                    title: "Editar concepto futuro",
                    path: `/expenses/${r.id}`,
                    method: "PATCH",
                    fields: expenseFields(r),
                  })
                }
              >
                Editar
              </button>
            )}
          />
        ) : (
          <Table
            rows={q.data || []}
            columns={[
              ["name", "Concepto"],
              ["due_on", "Vencimiento"],
              ["amount", "Importe"],
              ["paid", "Pagado"],
              ["remaining", "Pendiente"],
              ["status", "Estado"],
            ]}
            actions={(r) => (
              <>
                <button
                  onClick={() =>
                    setAction({
                      title: "Ajustar obligación",
                      path: `/expense-occurrences/${r.id}`,
                      method: "PATCH",
                      fields: [
                        {
                          name: "amount",
                          label: "Importe total",
                          type: "amount",
                          value: String(r.amount),
                        },
                        {
                          name: "due_on",
                          label: "Vencimiento",
                          type: "date",
                          value: String(r.due_on),
                        },
                      ],
                    })
                  }
                >
                  Ajustar
                </button>
                {r.status !== "paid" && (
                  <button
                    onClick={() =>
                      setAction({
                        title: "Registrar pago real",
                        path: `/expense-occurrences/${r.id}/payments`,
                        fields: [
                          {
                            name: "amount",
                            label: "Importe pagado",
                            type: "amount",
                            value: String(r.remaining),
                          },
                          dateField,
                          accountField,
                          {
                            name: "fund_id",
                            label: "Origen del dinero",
                            options: [
                              { value: "", label: "Dinero libre" },
                              { value: "1", label: "Hogar" },
                              { value: "2", label: "Reserva operativa" },
                            ],
                          },
                        ],
                      })
                    }
                  >
                    Pagar
                  </button>
                )}
              </>
            )}
          />
        )}
      </section>
      <p className="footnote">
        Los cambios de concepto se aplican a nuevas instancias. Las ya generadas
        se ajustan individualmente con auditoría. Despensa se gestiona como
        cuatro obligaciones independientes.
      </p>
    </>
  );
}
function Calendar({ suffix }: { suffix: string }) {
  const q = useData<{ payroll: Row[]; expenses: Row[]; transactions: Row[] }>(
    "/calendar" + suffix,
  );
  const [view, setView] = useState("month");
  const [day, setDay] = useState("");
  const cycleRows = useData<Row[]>("/cycles");
  const cycleMonth = String(
    cycleRows.data?.find(
      (c) => String(c.id) === new URLSearchParams(suffix).get("cycle_id"),
    )?.month || new Date().toISOString().slice(0, 7),
  );
  const year = Number(cycleMonth.slice(0, 4));
  const monthIndex = Number(cycleMonth.slice(5)) - 1;
  const monthDays = new Date(year, monthIndex + 1, 0).getDate();
  const weekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const payrollIds = new Set(
    (q.data?.payroll || [])
      .map((p) => String(p.transaction_id))
      .filter((id) => id !== "null"),
  );
  const rows = [
    ...(q.data?.payroll || []).map((r) => {
      const tx = q.data?.transactions.find(
        (t) => String(t.id) === String(r.transaction_id),
      );
      return {
        id: "p" + r.id,
        date: String(r.actual_payment_date || r.scheduled_payment_date),
        name: `Nómina ${r.person}`,
        amount: r.received_amount || r.budgeted_amount,
        state: String(r.status),
        nominal_payment_date: r.nominal_payment_date,
        scheduled_payment_date: r.scheduled_payment_date,
        actual_payment_date: r.actual_payment_date,
        before: tx?.before ?? null,
        after: tx?.after ?? null,
      };
    }),
    ...(q.data?.expenses || []).map((r) => ({
      id: "e" + r.id,
      date: String(r.due_on),
      name: String(r.name),
      amount: r.amount,
      state: String(r.status),
    })),
    ...(q.data?.transactions || [])
      .filter((r) => !payrollIds.has(String(r.id)))
      .map((r) => ({
        id: "t" + r.id,
        date: String(r.occurred_on),
        name: String(r.kind),
        amount: r.amount,
        state: "Registrado",
        before: r.before ?? null,
        after: r.after ?? null,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <Heading
        title="Un paso adelante."
        subtitle="Compromisos programados y operaciones registradas, en su fecha real."
      />
      <div className="tabs">
        {[
          ["month", "Mensual"],
          ["week", "Semanal"],
          ["list", "Lista"],
        ].map(([v, l]) => (
          <button
            className={view === v ? "selected" : ""}
            onClick={() => setView(v)}
            key={v}
          >
            {l}
          </button>
        ))}
        <input
          aria-label="Filtrar día o inicio de semana"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>
      <Status query={q} />
      <section className="panel">
        {view === "month" ? (
          <div className="calendar-grid">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: weekday }, (_, i) => (
              <span className="blank-day" key={"blank" + i} />
            ))}
            {Array.from(
              { length: monthDays },
              (_, i) => `${cycleMonth}-${String(i + 1).padStart(2, "0")}`,
            ).map((date) => (
              <button
                className={"day " + (day === date ? "selected" : "")}
                key={date}
                onClick={() => setDay(date)}
              >
                <strong>{date.slice(8)}</strong>
                <small>{date.slice(0, 7)}</small>
                {rows
                  .filter((r) => r.date === date)
                  .map((r) => (
                    <span className={"event " + r.state} key={r.id}>
                      {r.name}
                      <small>{money(String(r.amount))}</small>
                    </span>
                  ))}
              </button>
            ))}
          </div>
        ) : null}
        <Table
          columns={[
            ["date", "Fecha"],
            ["name", "Evento"],
            ["amount", "Importe"],
            ["state", "Estado"],
            ["nominal_payment_date", "Nominal"],
            ["scheduled_payment_date", "Programada ajustada"],
            ["actual_payment_date", "Real recibida"],
            ["before", "Saldo antes"],
            ["after", "Saldo después"],
          ]}
          rows={rows.filter(
            (r) =>
              !day ||
              (view === "week"
                ? r.date >= day &&
                  r.date <
                    new Date(
                      new Date(day + "T12:00:00").getTime() + 7 * 86400000,
                    )
                      .toISOString()
                      .slice(0, 10)
                : r.date === day),
          )}
        />
      </section>
    </>
  );
}
function Funds({
  selected,
  accountField,
  setAction,
}: {
  selected: string;
  accountField: Field;
  setAction: (a: Action) => void;
}) {
  const q = useData<Row[]>("/funds?cycle_id=" + selected);
  const goals = useData<Row[]>("/goals");
  const accounts = useData<Row[]>("/accounts");
  const transfers = useData<Row[]>("/transfers");
  return (
    <>
      <Heading
        title="Todo en su lugar."
        subtitle="Los apartados internos protegen su dinero sin generar un egreso."
      />
      <Status query={q} />
      <div className="fund-cards">
        {q.data?.map((f) => (
          <section className="panel" key={f.id}>
            <span className="eyebrow">{f.code}</span>
            <h2>{f.name}</h2>
            <strong className="large-money">{money(String(f.balance))}</strong>
            <p>
              Meta: {money(String(f.budgeted_amount))} ·{" "}
              {String(f.completion_percent)}%
            </p>
            <small>
              Aportado: {money(String(f.contributed_amount))} · Utilizado:{" "}
              {money(String(f.used_amount))}
            </small>
            {!String(f.code).startsWith("personal_") && (
              <button
                onClick={() =>
                  setAction({
                    title: "Aportar o liberar apartado",
                    path: `/funds/${f.id}/contributions`,
                    fixed: { cycle_id: selected },
                    fields: [
                      { name: "amount", label: "Importe", type: "amount" },
                      {
                        name: "direction",
                        label: "Operación",
                        options: [
                          { value: "in", label: "Apartar de dinero libre" },
                          { value: "out", label: "Liberar a dinero libre" },
                        ],
                      },
                    ],
                  })
                }
              >
                Administrar apartado
              </button>
            )}
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>Metas de ahorro</h2>
        <Table
          columns={[
            ["name", "Meta"],
            ["target", "Objetivo"],
          ]}
          rows={goals.data || []}
          actions={(g) => (
            <button
              onClick={() =>
                setAction({
                  title: "Editar meta",
                  path: `/goals/${g.id}`,
                  method: "PATCH",
                  fields: [
                    { name: "name", label: "Nombre", value: String(g.name) },
                    {
                      name: "target",
                      label: "Objetivo",
                      type: "amount",
                      value: String(g.target),
                    },
                  ],
                })
              }
            >
              Editar meta
            </button>
          )}
        />
        <h2>Cuentas registradas</h2>
        <button
          onClick={() =>
            setAction({
              title: "Registrar cuenta propia",
              path: "/accounts",
              fields: [{ name: "name", label: "Nombre de la cuenta" }],
            })
          }
        >
          Agregar cuenta
        </button>
        <Table
          columns={[
            ["name", "Cuenta"],
            ["balance", "Saldo registrado"],
          ]}
          rows={accounts.data || []}
        />
        <button
          className="primary"
          onClick={() =>
            setAction({
              title: "Instrucción de transferencia interna",
              path: "/transfers",
              fixed: { cycle_id: selected },
              fields: [
                accountField,
                {
                  ...accountField,
                  name: "destination_account_id",
                  label: "Cuenta destino",
                },
                { name: "amount", label: "Importe", type: "amount" },
                {
                  name: "scheduled_on",
                  label: "Fecha programada",
                  type: "date",
                },
              ],
            })
          }
        >
          Registrar transferencia
        </button>
        <Table
          columns={[
            ["source_account_id", "Cuenta origen"],
            ["destination_account_id", "Destino"],
            ["amount", "Importe"],
            ["scheduled_on", "Fecha"],
          ]}
          rows={transfers.data || []}
          actions={(r) =>
            !r.transaction_id && (
              <button
                onClick={() =>
                  setAction({
                    title: "Confirmar transferencia realizada",
                    path: `/transfers/${r.id}/confirm`,
                    fields: [dateField],
                  })
                }
              >
                Confirmar
              </button>
            )
          }
        />
      </section>
    </>
  );
}
function Personal({
  suffix,
  selected,
  accountField,
  setAction,
}: {
  suffix: string;
  selected: string;
  accountField: Field;
  setAction: (a: Action) => void;
}) {
  const transactions = useData<Row[]>("/transactions" + suffix + "&limit=100");
  const q = useData<Row[]>("/funds");
  const budgets = useData<Row[]>("/budgets" + suffix);
  return (
    <>
      <Heading
        title="El mismo derecho. Un plan compartido."
        subtitle="El dinero personal se reparte 50/50, independientemente de quién aporta los ingresos."
      />
      <Status query={q} />
      <div className="personal-grid">
        {["Daniel", "Carolina"].map((name, i) => {
          const f = q.data?.find(
            (f) => f.code === `personal_${name.toLowerCase()}`,
          );
          const b = budgets.data?.find(
            (b) => b.status === "active" && Number(b.fund_id) === i + 5,
          );
          const delivered = (transactions.data || [])
            .filter((t) => Number(t.fund_id) === i + 5 && t.kind === "expense")
            .reduce((sum, t) => sum + cents(String(t.amount)), 0n);
          return (
            <section className="panel personal" key={name}>
              <span className="person-avatar">{name[0]}</span>
              <h2>{name}</h2>
              <span>Saldo personal apartado</span>
              <strong className="large-money">
                {money(String(f?.balance || "0.00"))}
              </strong>
              <p>Objetivo del ciclo: {money(String(b?.amount || "0.00"))}</p>
              <p>
                Entregado registrado en el ciclo: {money(decimal(delivered))}
              </p>
              <button
                onClick={() =>
                  setAction({
                    title: "Registrar entrega real a " + name,
                    path: "/personal/deliveries",
                    fixed: { cycle_id: selected, fund_id: i + 5 },
                    fields: [
                      {
                        name: "amount",
                        label: "Importe entregado",
                        type: "amount",
                      },
                      dateField,
                      accountField,
                    ],
                  })
                }
              >
                Registrar entrega
              </button>
              <p className="footnote">
                Esta entrega registra una salida del patrimonio familiar. Usa
                transferencias para mover dinero entre cuentas incluidas en el
                patrimonio.
              </p>
            </section>
          );
        })}
      </div>
      <div className="notice">
        Si el reparto genera un centavo impar, permanece en reserva operativa.
        Ninguna persona recibe más que la otra.
      </div>
    </>
  );
}
function Investments({
  selected,
  accountField,
  setAction,
}: {
  selected: string;
  accountField: Field;
  setAction: (a: Action) => void;
}) {
  const contributions = useData<Row[]>("/funds/4/movements");
  const q = useData<{ accounts: Row[]; valuations: Row[] }>("/investments");
  return (
    <>
      <Heading
        title="Construir lo que viene."
        subtitle="Aportaciones registradas y valuaciones manuales, sin rendimientos supuestos."
      >
        <button
          className="primary"
          onClick={() =>
            setAction({
              title: "Registrar instrumento",
              path: "/investment-accounts",
              fields: [
                { name: "name", label: "Nombre" },
                { name: "institution", label: "Institución" },
                { name: "instrument", label: "Instrumento" },
                accountField,
              ],
            })
          }
        >
          <Plus size={16} /> Instrumento
        </button>
      </Heading>
      <Status query={q} />
      <section className="panel">
        <Table
          columns={[
            ["name", "Cuenta"],
            ["institution", "Institución"],
            ["instrument", "Instrumento"],
            ["contributed_amount", "Aportado neto"],
            ["current_value", "Valor manual"],
            ["gain_amount", "Rendimiento registrado"],
          ]}
          rows={q.data?.accounts || []}
          actions={(r) => (
            <>
              <button
                onClick={() =>
                  setAction({
                    title: "Vincular apartado existente sin duplicarlo",
                    path: `/investment-accounts/${r.id}/assign`,
                    fields: [
                      {
                        name: "contribution_id",
                        label: "Apartado ya registrado",
                        options: (contributions.data || [])
                          .filter((c) => cents(String(c.amount)) > 0n)
                          .map((c) => ({
                            value: String(c.id),
                            label: `#${c.id} · ${money(String(c.amount))}`,
                          })),
                      },
                      {
                        name: "valued_on",
                        label: "Fecha de vinculación",
                        type: "date",
                      },
                    ],
                  })
                }
              >
                Vincular apartado
              </button>
              <button
                onClick={() =>
                  setAction({
                    title: "Registrar aportación al instrumento",
                    path: `/investment-accounts/${r.id}/contributions`,
                    fixed: { cycle_id: selected },
                    fields: [
                      { name: "amount", label: "Importe", type: "amount" },
                      { name: "valued_on", label: "Fecha", type: "date" },
                      {
                        name: "direction",
                        label: "Operación",
                        options: [
                          {
                            value: "in",
                            label: "Aportación desde dinero libre",
                          },
                          { value: "out", label: "Retiro a dinero libre" },
                        ],
                      },
                    ],
                  })
                }
              >
                Aportar / retirar
              </button>
              <button
                onClick={() =>
                  setAction({
                    title: "Registrar valor manual",
                    path: "/investment-valuations",
                    fixed: { investment_account_id: r.id },
                    fields: [
                      {
                        name: "valued_on",
                        label: "Fecha de valuación",
                        type: "date",
                      },
                      {
                        name: "current_value",
                        label: "Valor actual",
                        type: "amount",
                      },
                    ],
                  })
                }
              >
                Valuar
              </button>
            </>
          )}
        />
        <h2>Historial de valuaciones</h2>
        <Table
          columns={[
            ["investment_account_id", "Instrumento"],
            ["valued_on", "Fecha"],
            ["current_value", "Valor manual"],
          ]}
          rows={q.data?.valuations || []}
        />
      </section>
    </>
  );
}
type ProjectionResult = {
  months: Row[];
  daily: Row[];
  prelude: Row[];
  policy_warnings: Row[];
  assumptions: string;
};
function Projections() {
  const schedules = useData<Row[]>("/payroll-schedules");
  const revision = useData<{ revision: number }>("/payroll/calendar-revision");
  const [scenario, setScenario] = useState<Record<string, unknown> | null>(
    null,
  );
  const simulation = useQuery<ProjectionResult>({
    queryKey: ["/projections/simulate", scenario, revision.data?.revision],
    queryFn: () =>
      request<ProjectionResult>("/projections/simulate", "POST", scenario),
    enabled: scenario !== null,
  });
  const result = simulation.data;
  const [error, setError] = useState("");
  return (
    <>
      <Heading
        title="Explorar el mañana."
        subtitle="Escenarios separados de la contabilidad real."
      />
      <section className="panel">
        <form
          className="scenario"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const values = Object.fromEntries(
                Array.from(new FormData(e.currentTarget)).filter(
                  ([, v]) => v !== "",
                ),
              );
              const payroll_days = Object.fromEntries(
                Object.entries(values)
                  .filter(([k]) => k.startsWith("payroll_day_"))
                  .map(([k, v]) => [k.replace("payroll_day_", ""), Number(v)]),
              );
              setScenario({ ...values, payroll_days });
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            Horizonte
            <select name="months">
              <option>3</option>
              <option>6</option>
              <option>12</option>
            </select>
          </label>
          <label>
            Mes inicial
            <input name="start_month" type="month" />
          </label>
          <label>
            Ingreso mensual
            <input
              name="income"
              placeholder="Vacío: configuración privada del plan"
              inputMode="decimal"
            />
          </label>
          <label>
            Gasto mensual del escenario
            <input
              name="expenses"
              placeholder="Vacío: catálogo vigente"
              inputMode="decimal"
            />
          </label>
          <label>
            Emergencia mensual
            <input
              name="saving"
              placeholder="Vacío: configuración privada del plan"
              inputMode="decimal"
            />
          </label>
          <label>
            Inversión mensual
            <input
              name="investment"
              placeholder="Vacío: configuración privada del plan"
              inputMode="decimal"
            />
          </label>
          <label>
            Renta del escenario
            <input
              name="rent"
              inputMode="decimal"
              placeholder="Vacío: catálogo"
            />
          </label>
          <label>
            Despensa del escenario
            <input
              name="groceries"
              inputMode="decimal"
              placeholder="Vacío: catálogo"
            />
          </label>
          <label>
            Extraordinario inicial
            <input
              name="extraordinary"
              inputMode="decimal"
              placeholder="0.00"
            />
          </label>
          {schedules.data?.map((p) => (
            <label key={p.id}>
              Día de nómina · {p.person} · #{p.id}
              <input
                name={"payroll_day_" + p.id}
                type="number"
                min="1"
                max="31"
                defaultValue={String(p.day_of_month)}
              />
            </label>
          ))}
          <button className="primary">Simular escenario</button>
        </form>
        {(error || simulation.error) && (
          <p role="alert" className="error">
            {error || simulation.error?.message}
          </p>
        )}
        {result && (
          <>
            <p className="notice">PROYECCIÓN · {result.assumptions}</p>
            {result.policy_warnings.length > 0 && (
              <p role="alert" className="notice error">
                Hay políticas de meses cortos pendientes de confirmación en
                Configuración. Este escenario no está aprobado para uso
                operativo.
              </p>
            )}
            {result.prelude.length > 0 && (
              <>
                <h2>Preflujo proyectado previo al mes inicial</h2>
                <Table
                  rows={result.prelude}
                  columns={[
                    ["date", "Fecha efectiva"],
                    ["name", "Evento proyectado"],
                    ["nominal_payment_date", "Nominal"],
                    ["amount", "Importe"],
                    ["after", "Operativo proyectado"],
                  ]}
                />
              </>
            )}
            <Table
              rows={result.months}
              columns={[
                ["month", "Mes"],
                ["reserve", "Reserva mínima inicial"],
                ["minimum_operating", "Mínimo operativo"],
                ["reserve_next", "Reserva siguiente mes"],
                [
                  "next_cycle_income_held",
                  "Ingreso del siguiente ciclo apartado",
                ],
                ["opening", "Apertura"],
                ["income", "Ingreso"],
                ["expenses", "Gastos"],
                ["closing", "Cierre"],
                ["saving", "Ahorro acumulado"],
                ["investment", "Inversión acumulada"],
                ["personal_each", "Personal c/u"],
                ["risk", "Riesgo"],
              ]}
            />
            <h2>Flujo cronológico proyectado</h2>
            <Table
              rows={result.daily}
              columns={[
                ["date", "Fecha"],
                ["name", "Movimiento proyectado"],
                ["nominal_payment_date", "Nominal"],
                ["scheduled_payment_date", "Programada ajustada"],
                ["budget_cycle", "Ciclo presupuestal"],
                ["amount", "Importe"],
                ["before", "Operativo antes"],
                ["after", "Operativo después"],
                ["risk", "Déficit"],
              ]}
            />
          </>
        )}
      </section>
    </>
  );
}
function Reports({
  suffix,
  accountField,
  setAction,
}: {
  suffix: string;
  accountField: Field;
  setAction: (a: Action) => void;
}) {
  const cycles = useData<Row[]>("/cycles");
  const actual = useData<{ funds: Row[] }>(
    "/reports/budget-vs-actual" + suffix,
  );
  const history = useData<Row[]>("/reports/history");
  const q = useData<{ summary: Summary; transactions: Row[]; expenses: Row[] }>(
    "/reports/monthly" + suffix,
  );
  const exportCSV = () => {
    const rows = q.data?.transactions || [];
    const cols = ["id", "occurred_on", "kind", "amount", "cycle_id"];
    const csv =
      "\uFEFF" +
      [
        cols,
        ...rows.map((r) =>
          cols.map((c) => {
            let v = String(r[c] ?? "");
            if (/^[=+@-]/.test(v)) v = "'" + v;
            return '"' + v.replaceAll('"', '""') + '"';
          }),
        ),
      ]
        .map((r) => r.join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "casa-movimientos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Heading
        title="Los números cuentan su historia."
        subtitle="Movimientos reales del ciclo seleccionado."
      >
        <button onClick={exportCSV} disabled={!q.data}>
          <Download size={16} /> CSV
        </button>
        <button onClick={() => window.print()} disabled={!q.data}>
          Imprimir / Guardar PDF
        </button>
      </Heading>
      <Status query={q} />
      {q.data && (
        <>
          <div className="stats">
            <Stat
              label="Saldo registrado acumulado"
              value={q.data.summary.cash}
              detail="Todas las cuentas"
            />
            <Stat
              label="Pagos del ciclo"
              value={q.data.summary.paid}
              detail="Egresos confirmados"
            />
            <Stat
              label="Pendientes del ciclo"
              value={q.data.summary.pending}
              detail="No son egresos confirmados"
            />
          </div>
          <section className="panel">
            <h2>Comparación por ciclo</h2>
            <Table
              rows={history.data || []}
              columns={[
                ["month", "Ciclo"],
                ["income", "Ingresos"],
                ["expenses", "Egresos"],
                ["net", "Flujo neto"],
              ]}
            />
            <h2>Presupuesto frente a aportaciones</h2>
            <Table
              rows={actual.data?.funds || []}
              columns={[
                ["name", "Fondo"],
                ["budgeted_amount", "Objetivo del ciclo"],
                ["contributed_amount", "Aportado"],
                ["used_amount", "Utilizado"],
                ["balance", "Saldo acumulado"],
                ["completion_percent", "Cumplimiento %"],
              ]}
            />
            <h2>Gasto pagado por categoría</h2>
            <Table
              rows={Object.entries(
                (q.data.expenses || []).reduce<Record<string, string>>(
                  (totals, r) => ({
                    ...totals,
                    [String(r.category)]: decimal(
                      cents(totals[String(r.category)] || "0.00") +
                        cents(String(r.paid)),
                    ),
                  }),
                  {} as Record<string, string>,
                ),
              ).map(([category, amount]) => ({ category, amount }))}
              columns={[
                ["category", "Categoría"],
                ["amount", "Total pagado"],
              ]}
            />
            <h2>Movimientos del ciclo seleccionado</h2>
            <Table
              rows={q.data.transactions}
              columns={[
                ["occurred_on", "Fecha real"],
                ["kind", "Operación"],
                ["amount", "Importe"],
                ["account_id", "Cuenta"],
                ["cycle_id", "Ciclo"],
              ]}
              actions={(r) => (
                <>
                  <button
                    onClick={() =>
                      setAction({
                        title: "Registrar ajuste documentado",
                        path: "/adjustments",
                        fixed: { original_transaction_id: r.id },
                        fields: [
                          {
                            name: "cycle_id",
                            label: "Ciclo abierto del ajuste",
                            options: (cycles.data || [])
                              .filter((c) => c.status === "open")
                              .map((c) => ({
                                value: String(c.id),
                                label: String(c.month),
                              })),
                          },
                          {
                            name: "kind",
                            label: "Efecto real",
                            options: [
                              { value: "income", label: "Entrada de efectivo" },
                              { value: "expense", label: "Salida de efectivo" },
                            ],
                          },
                          {
                            name: "amount",
                            label: "Importe del ajuste",
                            type: "amount",
                          },
                          dateField,
                          accountField,
                          { name: "note", label: "Motivo y evidencia" },
                        ],
                      })
                    }
                  >
                    Ajustar
                  </button>
                  {r.kind === "expense" && (
                    <button
                      onClick={() =>
                        setAction({
                          title: "Revertir gasto de ciclo abierto",
                          path: `/transactions/${r.id}/reverse`,
                          fields: [
                            {
                              name: "cycle_id",
                              label: "Ciclo abierto",
                              options: (cycles.data || [])
                                .filter((c) => c.status === "open")
                                .map((c) => ({
                                  value: String(c.id),
                                  label: String(c.month),
                                })),
                            },
                            dateField,
                            { name: "note", label: "Motivo documentado" },
                          ],
                        })
                      }
                    >
                      Revertir
                    </button>
                  )}
                </>
              )}
            />
          </section>
        </>
      )}
    </>
  );
}
function Configuration({
  selected,
  accounts,
  setAction,
  perform,
}: {
  selected: string;
  accounts: Row[];
  setAction: (a: Action) => void;
  perform: (p: string, d?: unknown) => Promise<void>;
}) {
  const openings = useData<Row[]>("/opening-balances");
  const schedules = useData<Row[]>("/payroll-schedules");
  const budgets = useData<Row[]>("/budgets?cycle_id=" + selected);
  const employers = useData<Row[]>("/payroll-employers");
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  return (
    <>
      <Heading
        title="Un plan que evoluciona con ustedes."
        subtitle="Configure el siguiente ciclo sin reescribir los periodos cerrados."
      />
      <section className="panel">
        <h2>Configuración del plan</h2>
        <button
          onClick={() =>
            setAction({
              title: "Actualizar base del plan",
              path: "/settings",
              method: "PATCH",
              fields: [
                { name: "start_date", label: "Fecha inicial", type: "date" },
                {
                  name: "monthly_income",
                  label: "Ingreso familiar presupuestado",
                  type: "amount",
                },
              ],
            })
          }
        >
          Editar fecha inicial e ingreso base
        </button>
        <h2>Ciclo presupuestal</h2>
        <div className="actions">
          <button
            onClick={() =>
              setAction({
                title: "Crear ciclo",
                path: "/cycles",
                fields: [
                  { name: "month", label: "Mes (AAAA-MM)", type: "month" },
                ],
              })
            }
          >
            Crear ciclo
          </button>
          <button
            className="primary"
            disabled={!selected}
            onClick={() => perform(`/cycles/${selected}/generate`)}
          >
            Generar calendario del ciclo
          </button>
        </div>
        <p className="footnote">
          Generar nuevamente no duplica nóminas ni obligaciones.
        </p>
        <h2>Confirmar capital inicial</h2>
        <Table
          rows={openings.data || []}
          columns={[
            ["effective_on", "Fecha"],
            ["amount", "Capital preexistente"],
            ["transaction_id", "Confirmación"],
          ]}
          actions={(r) =>
            !r.transaction_id && (
              <button
                onClick={() =>
                  setAction({
                    title: "Confirmar saldo realmente depositado",
                    path: `/opening-balances/${r.id}/confirm`,
                    fields: [],
                    fixed: { cycle_id: selected },
                  })
                }
              >
                Confirmar apertura
              </button>
            )
          }
        />
      </section>
      <section className="panel">
        <h2>Fechas nominales de nómina</h2>
        <p>
          Se adelantan automáticamente al día hábil anterior. No se marcan
          recibidas sin confirmación.
        </p>
        <Table
          rows={schedules.data || []}
          columns={[
            ["person", "Persona"],
            ["day_of_month", "Día"],
            ["amount", "Presupuesto"],
          ]}
          actions={(r) => (
            <button
              onClick={() =>
                setAction({
                  title: "Actualizar nóminas futuras",
                  path: `/payroll-schedules/${r.id}`,
                  method: "PATCH",

                  fields: [
                    {
                      name: "day_of_month",
                      label: "Día",
                      type: "number",
                      value: String(r.day_of_month),
                    },
                    {
                      name: "amount",
                      label: "Importe presupuestado",
                      type: "amount",
                      value: String(r.amount),
                    },
                    {
                      name: "employer_id",
                      label: "Empresa / calendario laboral",
                      optional: true,
                      value: String(r.employer_id || "none"),
                      options: [
                        { value: "none", label: "Sin empresa asignada" },
                        ...(employers.data || []).map((e) => ({
                          value: String(e.id),
                          label: String(e.name),
                        })),
                      ],
                    },
                    {
                      name: "active",
                      label: "Programación",
                      value: r.active ? "1" : "0",
                      options: [
                        { value: "1", label: "Activa" },
                        { value: "0", label: "Pausada" },
                      ],
                    },
                  ],
                })
              }
            >
              Editar programación
            </button>
          )}
        />
      </section>
      <PayrollCalendarAdmin setAction={setAction} />
      <section className="panel">
        <h2>Objetivos y versiones</h2>
        <Table
          rows={budgets.data || []}
          columns={[
            ["version", "Versión"],
            ["status", "Estado"],
            ["fund", "Fondo"],
            ["amount", "Objetivo"],
          ]}
        />
        <form
          className="scenario"
          onSubmit={(e) => {
            e.preventDefault();
            perform("/budgets", { cycle_id: selected, allocations: alloc });
          }}
        >
          {[
            ["home", "Hogar"],
            ["emergency", "Emergencia"],
            ["investment", "Inversión"],
            ["personal_daniel", "Personal Daniel"],
            ["personal_carolina", "Personal Carolina"],
          ].map(([code, label]) => (
            <label key={code}>
              {label}
              <input
                required
                value={alloc[code] || ""}
                inputMode="decimal"
                onChange={(e) => setAlloc({ ...alloc, [code]: e.target.value })}
              />
            </label>
          ))}
          <button className="primary">Guardar nueva versión</button>
        </form>
      </section>
      <section className="panel">
        <h2>Conciliación y cierre</h2>
        <p>
          Introduce el saldo de cada estado de cuenta al final del mes. El
          cierre exige todas las cuentas conciliadas, pagos cubiertos y reserva
          suficiente.
        </p>
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() =>
              setAction({
                title: "Conciliar " + a.name,
                path: "/reconciliations",
                fixed: { cycle_id: selected, account_id: a.id },
                fields: [
                  {
                    name: "statement_balance",
                    label: "Saldo del estado de cuenta",
                    type: "amount",
                  },
                ],
              })
            }
          >
            {a.name}: conciliar
          </button>
        ))}
        <button
          className="primary"
          disabled={!selected}
          onClick={() => perform(`/cycles/${selected}/close`)}
        >
          Verificar y cerrar ciclo
        </button>
      </section>
    </>
  );
}
function App() {
  const session = useData<{ user: Row | null; csrf: string }>("/auth/me");
  return session.isPending && configured ? (
    <div className="loading">Conectando con su espacio privado…</div>
  ) : session.data?.user ? (
    <Workspace />
  ) : (
    <Login />
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

function PayrollCalendarAdmin({
  setAction,
}: {
  setAction: (a: Action) => void;
}) {
  const days = useData<Row[]>("/non-working-days");
  const members = useData<Row[]>("/members");
  const employers = useData<Row[]>("/payroll-employers");
  const policies = useData<Row[]>("/payroll-calendar-policies");
  const fields = (r?: Row): Field[] => [
    {
      name: "non_working_date",
      label: "Día inhábil local",
      type: "date",
      value: String(r?.non_working_date || ""),
    },
    {
      name: "description",
      label: "Descripción",
      value: String(r?.description || ""),
    },
    {
      name: "type",
      label: "Tipo",
      value: String(r?.type || "company"),
      options: [
        {
          value: "national",
          label: "Nacional (sólo si la empresa lo observa)",
        },
        { value: "company", label: "Empresa" },
        { value: "extraordinary", label: "Extraordinario" },
      ],
    },
    {
      name: "member_id",
      label: "Aplicar a persona (vacío para empresa o ambos)",
      optional: true,
      value: String(r?.member_id || ""),
      options: [
        { value: "", label: "Sin restricción por persona" },
        ...(members.data || []).map((m) => ({
          value: String(m.id),
          label: String(m.name),
        })),
      ],
    },
    {
      name: "employer_id",
      label: "Aplicar a empresa (no elegir también persona)",
      optional: true,
      value: String(r?.employer_id || ""),
      options: [
        { value: "", label: "Sin restricción por empresa" },
        ...(employers.data || []).map((e) => ({
          value: String(e.id),
          label: String(e.name),
        })),
      ],
    },
    {
      name: "active",
      label: "Estado",
      value: r === undefined || r.active ? "1" : "0",
      options: [
        { value: "1", label: "Activo" },
        { value: "0", label: "Desactivado" },
      ],
    },
  ];
  return (
    <section className="panel">
      <h2>Calendarios laborales y días inhábiles</h2>
      <p>
        Los fines de semana se ajustan automáticamente. Registra únicamente los
        festivos que realmente aplica cada empresa. Sin persona ni empresa, el
        día aplica a ambos. Los cambios recalculan nóminas pendientes; los
        depósitos reales y vencimientos de gastos permanecen intactos.
      </p>
      <div className="actions">
        <button
          onClick={() =>
            setAction({
              title: "Agregar día inhábil",
              path: "/non-working-days",
              fields: fields(),
            })
          }
        >
          Agregar día inhábil
        </button>
        <button
          onClick={() =>
            setAction({
              title: "Registrar empresa",
              path: "/payroll-employers",
              fields: [{ name: "name", label: "Nombre de la empresa" }],
            })
          }
        >
          Agregar empresa
        </button>
      </div>
      <Status query={days} />
      <Table
        rows={days.data || []}
        columns={[
          ["non_working_date", "Fecha"],
          ["description", "Descripción"],
          ["type", "Tipo"],
          ["person", "Persona"],
          ["employer", "Empresa"],
          ["active", "Activo"],
          ["recorded_by", "Registró"],
          ["updated_by", "Modificó"],
        ]}
        actions={(r) => (
          <button
            onClick={() =>
              setAction({
                title: "Modificar día inhábil y recalcular",
                path: `/non-working-days/${r.id}`,
                method: "PATCH",
                fields: fields(r),
              })
            }
          >
            Editar / desactivar
          </button>
        )}
      />
      <h2>Meses sin el día nominal</h2>
      <p>
        La política provisional es usar el último día calendario y después
        adelantar al hábil anterior. Cada persona debe confirmarla
        explícitamente antes de usar un mes corto en producción.
      </p>
      <Table
        rows={policies.data || []}
        columns={[
          ["person", "Persona"],
          ["short_month_policy", "Política"],
          ["confirmed_at", "Confirmada el"],
        ]}
        actions={(r) => (
          <button
            onClick={() =>
              setAction({
                title: `Confirmar política de ${r.person}`,
                path: `/payroll-calendar-policies/${r.member_id}`,
                method: "PATCH",
                fields: [
                  {
                    name: "short_month_policy",
                    label: "Si el día nominal no existe",
                    value: String(r.short_month_policy),
                    options: [
                      {
                        value: "last_day",
                        label: "Último día calendario y hábil anterior",
                      },
                      {
                        value: "require_explicit_date",
                        label: "Exigir una fecha nominal explícita",
                      },
                    ],
                  },
                  {
                    name: "confirm_policy",
                    label: "Confirmación para uso operativo",
                    options: [
                      { value: "", label: "Selecciona para confirmar" },
                      {
                        value: "true",
                        label: "Confirmo esta política para esta persona",
                      },
                    ],
                  },
                ],
              })
            }
          >
            Confirmar / cambiar
          </button>
        )}
      />
    </section>
  );
}
