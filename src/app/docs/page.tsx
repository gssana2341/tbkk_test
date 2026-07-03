"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Gauge,
  History,
  Info,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Settings,
  SlidersHorizontal,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LOCAL_DIAGNOSTIC_RULES } from "@/lib/data/diagnosticRules";

type DiagnosticIndicator = {
  type: string;
  order?: number;
  orders?: number[];
  axis?: string[];
  condition?: string;
  compare?: string;
  min_ratio?: number;
  min_count?: number;
  max_count?: number;
  start_order?: number;
  weight?: number;
};

type DiagnosticRule = {
  fault_id: string;
  name: string;
  severity_base: string;
  indicators: DiagnosticIndicator[];
  references?: Array<{ source: string; section?: string }>;
};

type Workflow = {
  title: string;
  description: string;
  href: string;
  role: string;
  icon: LucideIcon;
};

const sections = [
  {
    id: "quick-start",
    label: "Quick start",
    description: "A short path from signing in to reviewing a sensor",
    keywords:
      "login dashboard organization area filter machine sensor quick start",
    icon: CheckCircle2,
  },
  {
    id: "getting-started",
    label: "Status and measurement guide",
    description:
      "Machine statuses, measurement axes, and essential context for reading data",
    keywords:
      "dashboard status normal warning concern critical lost standby H V A axis",
    icon: Gauge,
  },
  {
    id: "registration",
    label: "Sensor registration",
    description:
      "Required fields, thresholds, validation, and submission steps",
    keywords:
      "register device master satellite serial MAC machine area installation threshold image save",
    icon: Gauge,
  },
  {
    id: "sensor-detail",
    label: "Sensor detail",
    description:
      "How to review readings, alarms, diagnostics, FFT, and history",
    keywords:
      "sensor detail temperature vibration alarm date time FFT spectrum diagnostics history",
    icon: Activity,
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Shortcuts and an overview of the system's main workflows",
    keywords: "register sensor reports history settings admin export",
    icon: LayoutDashboard,
  },
  {
    id: "roles",
    label: "Roles and permissions",
    description:
      "What Viewer, Editor, Admin, and Superadmin accounts can access",
    keywords:
      "viewer editor admin superadmin permissions access reports register users",
    icon: UserCog,
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    description:
      "Supported diagnostic rules and how to interpret their results",
    keywords:
      "FFT rule engine unbalance misalignment looseness bearing 1X 2X harmonic",
    icon: Activity,
  },
  {
    id: "configuration",
    label: "Parameters and thresholds",
    description: "FMAX, LOR, measurement units, and alert limits",
    keywords: "FMAX LOR threshold frequency resolution mm/s temperature ISO",
    icon: SlidersHorizontal,
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    description: "Checks to perform when data or statuses appear abnormal",
    keywords:
      "troubleshoot offline lost no data graph notification line battery calibration",
    icon: LifeBuoy,
  },
  {
    id: "glossary",
    label: "Glossary",
    description: "Common vibration monitoring terms and units",
    keywords: "glossary Vrms RMS RPM 1X FMAX LOR baseline H V A unit",
    icon: BookOpen,
  },
] as const;

const workflows: Workflow[] = [
  {
    title: "View the machine overview",
    description:
      "Filter by organization, area, or status and switch between sensor views",
    href: "/",
    role: "All roles",
    icon: LayoutDashboard,
  },
  {
    title: "Register a sensor",
    description:
      "Add a sensor, define its installation point, and set initial thresholds",
    href: "/register",
    role: "Authorized users",
    icon: Gauge,
  },
  {
    title: "View reports",
    description: "Select a time range, compare data, and export reports",
    href: "/reports",
    role: "Superadmin",
    icon: BarChart3,
  },
  {
    title: "View notification history",
    description:
      "Review historical statuses and event timestamps recorded by the system",
    href: "/history",
    role: "All roles",
    icon: History,
  },
  {
    title: "Account settings",
    description: "Update personal information and user preferences",
    href: "/settings",
    role: "All roles",
    icon: Settings,
  },
  {
    title: "Manage users",
    description:
      "Manage accounts, permissions, and access to organization data",
    href: "/admin",
    role: "Admin / Superadmin",
    icon: UserCog,
  },
];

const diagnosticCopy: Record<string, { label: string; summary: string }> = {
  UNBALANCE: {
    label: "Rotating component unbalance",
    summary:
      "Look for a dominant radial 1X peak while confirming that other harmonics are not unusually prominent.",
  },
  MISALIGNMENT: {
    label: "Shaft misalignment",
    summary:
      "Evaluate 1X and 2X peaks and compare axial vibration with radial vibration.",
  },
  LOOSENESS: {
    label: "Mechanical looseness",
    summary:
      "Check for consecutive harmonics on the H/V axes that may indicate repeated impacts.",
  },
  BEARING_WEAR: {
    label: "Bearing wear",
    summary:
      "Evaluate high-frequency energy for impact signatures from bearing components.",
  },
};

const statusCards = [
  {
    name: "NORMAL",
    label: "Normal",
    color: "bg-[#72ff82]",
    border: "border-emerald-400/30",
    action: "Continue routine monitoring",
  },
  {
    name: "WARNING",
    label: "Warning",
    color: "bg-[#ffd84d]",
    border: "border-yellow-400/30",
    action: "Review the trend and plan an inspection",
  },
  {
    name: "CONCERN",
    label: "Elevated concern",
    color: "bg-[#ff8c1a]",
    border: "border-orange-400/30",
    action: "Confirm the cause and assign an owner",
  },
  {
    name: "CRITICAL",
    label: "Critical",
    color: "bg-[#ff4d4d]",
    border: "border-red-400/30",
    action: "Follow the plant's safety procedure immediately",
  },
  {
    name: "STANDBY",
    label: "Standby",
    color: "bg-slate-400",
    border: "border-slate-400/30",
    action: "Confirm whether the machine is intentionally stopped",
  },
  {
    name: "LOST",
    label: "Communication lost",
    color: "bg-slate-600",
    border: "border-slate-600/40",
    action: "Check the latest timestamp, battery, signal, and gateway",
  },
];

const quickStartSteps = [
  {
    title: "Open the Dashboard",
    detail: "Sign in and confirm that the correct organization is active.",
  },
  {
    title: "Narrow the equipment list",
    detail:
      "Use the organization tree, area, status, or search filters to find a machine.",
  },
  {
    title: "Open a sensor",
    detail:
      "Select a sensor card or dot and verify its name, installation point, and latest timestamp.",
  },
  {
    title: "Review before acting",
    detail:
      "Compare status, H/V/A vibration, temperature, trend, load, and operating speed.",
  },
];

const registrationSteps = [
  {
    title: "Open Register Device",
    detail:
      "From the Dashboard, select Register Device. Admin, Editor, and Superadmin accounts have access.",
  },
  {
    title: "Complete the Master tab",
    detail:
      "A Master sensor is recommended. Satellite 1–3 tabs are optional; blank tabs are not submitted.",
  },
  {
    title: "Enter identity and location",
    detail:
      "Provide Area, Sensor Name, the unique 12-character Serial Number, Machine, Machine Number, Motor Start Time, and Installation Point.",
  },
  {
    title: "Choose a threshold method",
    detail:
      "Use Machine Class (ISO 10816-3) to auto-fill thresholds, or use Name Place (motor nameplate values) to enter motor-specific limits. Only one method can be active.",
  },
  {
    title: "Set acquisition parameters",
    detail:
      "Review Alarm Threshold, Time Interval, G-Scale, LOR, Frequency Max, High Pass Filter, and temperature limits. Add notes or an image if useful.",
  },
  {
    title: "Save and confirm",
    detail:
      "Select Save, review the confirmation dialog, and confirm. A successful registration returns to the Dashboard.",
  },
];

const sensorDetailGuide = [
  {
    title: "Current condition",
    detail:
      "Confirm status, temperature, H/V/A values, battery, signal, and the latest reading time.",
  },
  {
    title: "Reading timeline",
    detail:
      "Choose a date and timestamp. Use Show ALARM to focus on alarm events when investigating a fault.",
  },
  {
    title: "Diagnostics",
    detail:
      "Treat diagnostic scores and fault labels as screening guidance, then verify them against operating conditions and field inspection.",
  },
  {
    title: "FFT and history",
    detail:
      "Use the frequency analysis for peaks and harmonics, then open History to confirm whether the change is persistent or temporary.",
  },
];

const roleRows = [
  [
    "Viewer",
    "Dashboard, sensor details, notification history, account settings, and documentation",
  ],
  [
    "Editor",
    "Viewer access plus sensor registration and sensor configuration editing",
  ],
  ["Admin", "Editor access plus user approval and role management"],
  [
    "Superadmin",
    "Full access, including reports and all administrative functions",
  ],
];

const glossaryItems = [
  ["H / V / A", "Horizontal, Vertical, and Axial measurement directions"],
  [
    "Vrms",
    "Root-mean-square vibration velocity used to represent overall vibration severity",
  ],
  [
    "mm/s RMS",
    "Millimeters per second RMS, the velocity unit used for vibration thresholds",
  ],
  ["RPM", "Revolutions per minute, the machine's rotational speed"],
  ["1X / 2X", "One or two times the rotational frequency"],
  [
    "FMAX",
    "The highest frequency included in the displayed and analyzed spectrum",
  ],
  [
    "LOR",
    "Lines of Resolution; the number of frequency bins in an FFT spectrum",
  ],
  [
    "Baseline",
    "A reference measurement captured under a representative healthy operating condition",
  ],
];

const rules = LOCAL_DIAGNOSTIC_RULES as DiagnosticRule[];

function describeIndicator(indicator: DiagnosticIndicator) {
  const axes = indicator.axis?.join("/") ?? "all axes";

  switch (indicator.type) {
    case "order_peak":
      return `Check the ${indicator.order}X peak on ${axes}${
        indicator.condition === "dominant"
          ? " and confirm it is the dominant peak"
          : ""
      }`;
    case "axis_ratio":
      return `Compare the axis ratio: ${indicator.compare} (minimum ${indicator.min_ratio})`;
    case "harmonic_absence":
      return `No more than ${indicator.max_count} of the ${indicator.orders?.join("X, ")}X harmonics may be present`;
    case "harmonic_presence":
      return `Check for at least ${indicator.min_count} of the ${indicator.orders?.join("X, ")}X harmonics on ${axes}`;
    case "high_frequency_energy":
      return `Check high-frequency energy from ${indicator.start_order}X onward on ${axes}`;
    default:
      return indicator.type;
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default function DocumentationPage() {
  const [query, setQuery] = useState("");

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
    if (!normalizedQuery) return sections;

    return sections.filter((section) =>
      `${section.label} ${section.description} ${section.keywords}`
        .toLocaleLowerCase("en-US")
        .includes(normalizedQuery)
    );
  }, [query]);

  const visibleIds = new Set(visibleSections.map((section) => section.id));

  return (
    <div className="mx-auto max-w-7xl pb-10 text-slate-200">
      <section className="rounded-xl border-[1.35px] border-[#374151] bg-[#030616] p-4 shadow-md sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#374151] bg-[#0B1121] text-blue-400 sm:h-12 sm:w-12">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
                Knowledge center
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                System documentation
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
                Operating workflows, diagnostic criteria, and data verification
                guidance for operators and administrators.
              </p>
            </div>
          </div>

          <div className="w-full xl:max-w-xl">
            <label
              htmlFor="docs-search"
              className="mb-2 block text-xs font-medium text-slate-400"
            >
              Search documentation
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="docs-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search thresholds, 1X, reports, or offline sensors..."
                className="h-10 w-full rounded-lg border border-[#374151] bg-[#0B1121] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              Based on the diagnostic rules currently supported by the system
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#374151] bg-[#0B1121] p-3 lg:sticky lg:top-4">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            On this page
          </p>
          <nav
            aria-label="Documentation sections"
            className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
          >
            {visibleSections.map((section) => {
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex min-w-max items-center rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-800/70 hover:text-white lg:min-w-0"
                >
                  <span>{section.label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-6">
          <p className="sr-only" aria-live="polite">
            {visibleSections.length} documentation sections found
          </p>

          {visibleSections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1121] px-6 py-14 text-center">
              <CircleHelp
                className="mx-auto h-9 w-9 text-slate-500"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-white">
                No matching topics found
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Try a shorter term such as “FFT”, “report”, or “threshold”.
              </p>
            </div>
          )}

          {visibleIds.has("quick-start") && (
            <section
              id="quick-start"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="01 · Quick start"
                title="From sign-in to a verified sensor reading"
                description="Use this sequence for a first review. It keeps the organization context, equipment identity, and data freshness visible before any maintenance decision is made."
              />

              <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickStartSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-xl border border-slate-700 bg-[#111827] p-4"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-sm font-bold text-blue-300">
                      {index + 1}
                    </span>
                    <h3 className="mt-4 font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {visibleIds.has("getting-started") && (
            <section
              id="getting-started"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="02 · Status and measurements"
                title="Interpret statuses consistently before taking action"
                description="A status is an initial screening signal, not an automatic shutdown command. Decisions must follow the plant SOP and consider supporting data."
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {statusCards.map((status) => (
                  <article
                    key={status.name}
                    className={`rounded-xl border ${status.border} bg-[#111827] p-4`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full ${status.color}`}
                        aria-hidden="true"
                      />
                      <h3 className="font-semibold text-white">
                        {status.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-300">
                      {status.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {status.action}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  [
                    "H",
                    "Horizontal",
                    "Lateral radial direction used to evaluate vibration in the horizontal plane.",
                  ],
                  [
                    "V",
                    "Vertical",
                    "Vertical radial direction used to evaluate foundation and structural response.",
                  ],
                  [
                    "A",
                    "Axial",
                    "Direction along the shaft axis used to assess shaft alignment and coupling behavior.",
                  ],
                ].map(([axis, english, description]) => (
                  <article
                    key={axis}
                    className="rounded-xl border border-slate-700 bg-[#111827] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 font-bold text-blue-300">
                        {axis}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">
                          Axis {axis}
                        </h3>
                        <p className="text-xs text-slate-500">{english}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {description}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100/80">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <p>
                  A single-axis reading cannot confirm the cause of a fault.
                  Review trends, rotational speed, load, and the spectrum
                  together.
                </p>
              </div>
            </section>
          )}

          {visibleIds.has("registration") && (
            <section
              id="registration"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  eyebrow="03 · Sensor registration"
                  title="Register a Master or Satellite sensor"
                  description="Registration is available to Admin, Editor, and Superadmin accounts. Prepare the sensor serial number, machine location, threshold method, and acquisition settings before you begin."
                />
                <Link
                  href="/register"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Open registration
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <ol className="grid gap-3 md:grid-cols-2">
                {registrationSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-xl border border-slate-700 bg-[#111827] p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-bold text-blue-300">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {[
                  {
                    title: "Serial validation",
                    detail:
                      "The Serial Number (MAC) must contain exactly 12 characters and must not already exist in the database.",
                  },
                  {
                    title: "Required configuration",
                    detail:
                      "Motor Start Time, Alarm Threshold (0.1–16), Time Interval, LOR, and Frequency Max are required when a serial number is entered.",
                  },
                  {
                    title: "Optional satellites",
                    detail:
                      "Use Next to configure Satellite 1–3. Leave a satellite serial number blank when that sensor is not part of the installation.",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-4"
                  >
                    <h3 className="font-semibold text-blue-100">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {visibleIds.has("sensor-detail") && (
            <section
              id="sensor-detail"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="04 · Sensor detail"
                title="Use the sensor page as an investigation workspace"
                description="Always verify equipment identity and data freshness first, then move from overall condition to trends, diagnostics, and frequency analysis."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {sensorDetailGuide.map((item, index) => (
                  <article
                    key={item.title}
                    className="rounded-xl border border-slate-700 bg-[#111827] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-bold text-blue-300">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {visibleIds.has("workflows") && (
            <section
              id="workflows"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="05 · Workflows"
                title="Go directly to a workflow"
                description="Page visibility may vary depending on the account's role and organization."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {workflows.map((workflow) => {
                  const Icon = workflow.icon;
                  return (
                    <Link
                      key={workflow.href}
                      href={workflow.href}
                      className="group rounded-xl border border-slate-700 bg-[#111827] p-4 transition hover:border-blue-500/60 hover:bg-blue-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-white">
                              {workflow.title}
                            </h3>
                            <ArrowRight
                              className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-400"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="mt-1 text-sm leading-5 text-slate-400">
                            {workflow.description}
                          </p>
                          <span className="mt-3 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-500">
                            {workflow.role}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {visibleIds.has("roles") && (
            <section
              id="roles"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="06 · Roles and permissions"
                title="Access follows the assigned account role"
                description="Menus and actions may be hidden when the current account does not have the required role. Organization-level access can further limit the visible equipment."
              />

              <div className="overflow-hidden rounded-xl border border-slate-700">
                {roleRows.map(([role, access], index) => (
                  <div
                    key={role}
                    className={`grid gap-1 bg-[#111827] px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4 ${
                      index > 0 ? "border-t border-slate-700" : ""
                    }`}
                  >
                    <span className="font-semibold text-blue-300">{role}</span>
                    <span className="text-sm leading-6 text-slate-400">
                      {access}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleIds.has("diagnostics") && (
            <section
              id="diagnostics"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="07 · Diagnostic rules"
                title={`${rules.length} supported diagnostic rules`}
                description="The current rule-based diagnostic engine scores multiple conditions. It is not an AI-confirmed diagnosis and must not replace an expert inspection."
              />

              <div className="mb-5 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Info
                    className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-semibold text-blue-100">Key terms</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      <strong className="text-slate-300">1X</strong> is the
                      rotational frequency,
                      <strong className="ml-1 text-slate-300">2X</strong> is
                      twice the rotational frequency, and a
                      <strong className="ml-1 text-slate-300">harmonic</strong>{" "}
                      is an integer multiple of the rotational frequency.
                    </p>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="space-y-3">
                {rules.map((rule) => {
                  const copy = diagnosticCopy[rule.fault_id] ?? {
                    label: rule.name,
                    summary: "Evaluate the indicators defined in the system.",
                  };
                  return (
                    <AccordionItem
                      key={rule.fault_id}
                      value={rule.fault_id}
                      className="overflow-hidden rounded-xl border border-slate-700 bg-[#111827] px-4"
                    >
                      <AccordionTrigger className="gap-4 text-left hover:no-underline">
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">
                            {rule.name} · {copy.label}
                          </span>
                          <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                            {copy.summary}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="border-t border-slate-800 pt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Scoring conditions
                        </h4>
                        <ul className="mt-3 space-y-2">
                          {rule.indicators.map((indicator, index) => (
                            <li
                              key={`${rule.fault_id}-${index}`}
                              className="flex items-start gap-2 text-sm text-slate-300"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-blue-400"
                                aria-hidden="true"
                              />
                              <span>
                                {describeIndicator(indicator)}
                                {typeof indicator.weight === "number" && (
                                  <span className="ml-2 text-xs text-slate-500">
                                    Weight {indicator.weight}%
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {rule.references && rule.references.length > 0 && (
                          <p className="mt-4 text-xs leading-5 text-slate-500">
                            Rule references:{" "}
                            {rule.references
                              .map((reference) => reference.source)
                              .join(", ")}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          )}

          {visibleIds.has("configuration") && (
            <section
              id="configuration"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="08 · Configuration"
                title="Parameters that affect chart interpretation"
                description="These values control signal acquisition and processing. Only users who understand the sensor and machine limitations should change them."
              />

              <div className="grid gap-4 xl:grid-cols-3">
                {[
                  {
                    code: "FMAX",
                    title: "Maximum frequency",
                    detail:
                      "The upper frequency limit displayed and analyzed, measured in Hz. It must be high enough to cover the frequencies of interest.",
                    note: "A higher FMAX shows a wider frequency range but reduces resolution per line when LOR remains unchanged.",
                  },
                  {
                    code: "LOR",
                    title: "Lines of Resolution",
                    detail:
                      "The number of spectral lines or frequency bins, not the number of decimal places. A higher value separates closely spaced peaks more clearly.",
                    note: "Approximate resolution: Δf = FMAX ÷ LOR. For example, 1,000 ÷ 3,200 ≈ 0.313 Hz.",
                  },
                  {
                    code: "LIMIT",
                    title: "Threshold",
                    detail:
                      "Limits separating Warning, Concern, and Critical states. They may be based on a baseline, machine type, and the organization's selected standard.",
                    note: "Always confirm that units match, such as vibration velocity (mm/s RMS) and temperature (°C).",
                  },
                ].map((item) => (
                  <article
                    key={item.code}
                    className="rounded-xl border border-slate-700 bg-[#111827] p-5"
                  >
                    <span className="inline-flex rounded-lg bg-blue-500/10 px-2.5 py-1 font-mono text-sm font-bold text-blue-300">
                      {item.code}
                    </span>
                    <h3 className="mt-4 font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </p>
                    <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
                      {item.note}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex gap-3 rounded-xl border border-red-400/20 bg-red-500/5 p-4 text-sm leading-6 text-red-100/80">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
                  aria-hidden="true"
                />
                <p>
                  Do not tighten thresholds simply to generate more alerts.
                  Capture a baseline under representative load conditions and
                  have the responsible machinery specialist approve it.
                </p>
              </div>
            </section>
          )}

          {visibleIds.has("troubleshooting") && (
            <section
              id="troubleshooting"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="09 · Troubleshooting"
                title="What to check first"
                description="Start with causes that are easy to verify, then proceed to the device, configuration, and machine condition."
              />

              <Accordion type="single" collapsible className="space-y-3">
                {[
                  {
                    question: "The sensor shows LOST or no data",
                    answer:
                      "Check the latest data timestamp, battery level, signal range, and gateway status. Confirm that the correct organization and area are selected before contacting the system administrator.",
                  },
                  {
                    question: "The expected peak is missing from the FFT chart",
                    answer:
                      "Check the actual rotational speed, FMAX, LOR, installation axis, and measurement period. For variable-speed machines, compare data recorded under similar speed and load conditions.",
                  },
                  {
                    question:
                      "The status frequently changes between Warning and Concern",
                    answer:
                      "Check whether the threshold is too close to the baseline, review the trend across multiple timestamps, and separate startup or shutdown events before adjusting alert limits.",
                  },
                  {
                    question: "Notifications are not received",
                    answer:
                      "Check user permissions, notification channels, event severity settings, and notification history to determine whether the event was not created or delivery failed.",
                  },
                  {
                    question:
                      "The diagnostic result does not match the field inspection",
                    answer:
                      "Record the time, speed, load, installation point, and actual inspection result for comparison. Diagnostics are a rule-based screening aid and must be confirmed through a field inspection using an appropriate measurement method.",
                  },
                ].map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    value={`troubleshooting-${index}`}
                    className="rounded-xl border border-slate-700 bg-[#111827] px-4"
                  >
                    <AccordionTrigger className="gap-4 text-left text-sm text-white hover:no-underline sm:text-base">
                      <span className="flex items-center gap-3">
                        <Wrench
                          className="h-4 w-4 shrink-0 text-blue-400"
                          aria-hidden="true"
                        />
                        {item.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-slate-800 pt-4 text-sm leading-6 text-slate-400">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {visibleIds.has("glossary") && (
            <section
              id="glossary"
              className="scroll-mt-24 rounded-2xl border border-[#374151] bg-[#0B1121] p-5 sm:p-7"
            >
              <SectionHeading
                eyebrow="10 · Glossary"
                title="Common monitoring terms"
                description="Use these definitions when comparing charts, thresholds, diagnostic rules, and field measurements."
              />

              <dl className="grid gap-3 sm:grid-cols-2">
                {glossaryItems.map(([term, definition]) => (
                  <div
                    key={term}
                    className="rounded-xl border border-slate-700 bg-[#111827] p-4"
                  >
                    <dt className="font-mono text-sm font-bold text-blue-300">
                      {term}
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-slate-400">
                      {definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <footer className="rounded-2xl border border-[#374151] bg-[#0B1121] p-5 text-sm text-slate-400 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-3">
              <CircleHelp
                className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"
                aria-hidden="true"
              />
              <p className="leading-6">
                This documentation describes the current system behavior. If
                field data conflicts with a diagnostic result, follow the plant
                SOP and consult the responsible specialist.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
