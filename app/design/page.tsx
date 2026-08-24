"use client";

import { useState } from "react";
import {
  Heart,
  Download,
  Maximize2,
  X,
  EyeOff,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownText from "@/components/MarkdownText";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/components/admin/admin.css";
import "./design.css";

/** Muestra de color: pinta el fondo con la variable tal cual, así que si
 * alguien cambia el token en globals.css esta página se actualiza sola. */
function Swatch({
  name,
  varName,
  value,
  note,
}: {
  name: string;
  varName: string;
  value?: string;
  note?: string;
}) {
  return (
    <div className="design-swatch">
      <div className="design-swatch-fill" style={{ background: `var(${varName})` }} />
      <div className="design-swatch-meta">
        <span className="design-swatch-name">{name}</span>
        <span className="design-swatch-value">{varName}</span>
        {value && <span className="design-swatch-value">{value}</span>}
        {note && <span className="design-swatch-note">{note}</span>}
      </div>
    </div>
  );
}

const NAV = [
  { id: "fuentes", label: "Fuentes" },
  { id: "color", label: "Color" },
  { id: "radios", label: "Radios" },
  { id: "shadcn", label: "shadcn/ui" },
  { id: "botones", label: "Botones propios" },
  { id: "insignias", label: "Insignias y estado" },
  { id: "formularios", label: "Formularios" },
  { id: "markdown", label: "Editor y markdown" },
  { id: "mapa", label: "Mapa y modal" },
];

export default function DesignSystemPage() {
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [mdValue, setMdValue] = useState(
    "Un **hito** muy señalado, con una *anécdota* del pueblo.\n\n- Data de 1932\n- Aportada por un vecino"
  );

  return (
    <div className="design-page">
      <header className="design-header">
        <h1>Sistema de diseño de Piedrahita</h1>
        <p className="design-swatch-value">/design</p>
      </header>

      <div className="design-body">
        <nav className="design-nav">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              {n.label}
            </a>
          ))}
        </nav>

        <main className="design-main">
        {/* ---------- Fuentes ---------- */}
        <section id="fuentes" className="design-section">
          <h2>Fuentes</h2>
          <p className="design-lead">
            Dos familias, sin más pesos de los que hacen falta: <strong>Geist</strong> para
            todo el texto y <strong>Cormorant Garamond</strong> reservada al título del
            sitio y al rango de años de la línea de tiempo — nunca para cuerpo de texto.
          </p>

          <div className="design-type-sample">
            <div className="label">--font-sans · Geist · uso general</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "1.4rem" }}>
              Memoria fotográfica de Piedrahíta
            </p>
          </div>
          <div className="design-type-sample">
            <div className="label">--font-serif · Cormorant Garamond · solo títulos de cabecera y años</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem" }}>
              1900 – 1932
            </p>
          </div>
        </section>

        {/* ---------- Color ---------- */}
        <section id="color" className="design-section">
          <h2>Color</h2>
          <p className="design-lead">
            El sitio es prácticamente monocromo — tinta sobre papel — con el marrón{" "}
            <span className="design-code">--brown</span> como único acento, reservado para
            hitos, botones de acción y estados activos. No hay modo oscuro en uso: los
            tokens <span className="design-code">.dark</span> existen porque los generó
            shadcn, pero ninguna pantalla del sitio los activa.
          </p>

          <div className="design-block">
            <h3>Primitivos</h3>
            <div className="design-swatch-grid">
              <Swatch name="Tinta" varName="--ink" value="#111111" />
              <Swatch name="Tinta suave" varName="--ink-soft" value="#555555" />
              <Swatch name="Línea" varName="--line" value="#e2e2e2" />
              <Swatch name="Línea fuerte" varName="--line-strong" value="#b4b4b4" />
              <Swatch name="Papel" varName="--paper" value="#fafafa" />
              <Swatch name="Papel sólido" varName="--paper-solid" value="#ffffff" />
              <Swatch name="Borde de campo" varName="--border-input" value="#8c8c8c" />
              <Swatch name="Relleno placeholder" varName="--fill-placeholder" value="#d8d8d8" />
              <Swatch
                name="Marrón"
                varName="--brown"
                value="#5c3317"
                note="Único acento del proyecto"
              />
              <Swatch name="Marrón suave" varName="--brown-soft" value="#f5f1ea" />
              <Swatch name="Rojo" varName="--red" value="#a01c1c" />
              <Swatch name="Verde" varName="--green" value="#1c6b3a" />
              <Swatch name="Ámbar" varName="--amber" value="#8a6a1c" />
            </div>
          </div>

          <div className="design-block">
            <h3>Semánticos (mapeados a shadcn/ui)</h3>
            <div className="design-swatch-grid">
              <Swatch name="background" varName="--background" note="= --paper" />
              <Swatch name="foreground" varName="--foreground" note="= --ink" />
              <Swatch name="card" varName="--card" note="= --paper-solid" />
              <Swatch name="popover" varName="--popover" note="= --paper-solid" />
              <Swatch name="primary" varName="--primary" note="= --ink" />
              <Swatch name="secondary" varName="--secondary" note="ink 6% sobre paper" />
              <Swatch name="muted" varName="--muted" note="ink 6% sobre paper" />
              <Swatch name="accent" varName="--accent" note="= --brown" />
              <Swatch name="destructive" varName="--destructive" note="= --red" />
              <Swatch name="success" varName="--success" note="= --green" />
              <Swatch name="warning" varName="--warning" note="= --amber" />
              <Swatch name="border" varName="--border" note="= --line" />
              <Swatch name="input" varName="--input" note="= --border-input" />
              <Swatch name="ring" varName="--ring" note="= --ink" />
            </div>
          </div>
        </section>

        {/* ---------- Radios ---------- */}
        <section id="radios" className="design-section">
          <h2>Radios</h2>
          <p className="design-lead">
            Una sola escala, derivada de <span className="design-code">--radius</span>{" "}
            (0.625rem) con multiplicadores — nunca valores sueltos.
          </p>
          <div className="design-radius-grid">
            {[
              ["sm", "var(--radius-sm)"],
              ["md", "var(--radius-md)"],
              ["lg", "var(--radius-lg)"],
              ["xl", "var(--radius-xl)"],
              ["2xl", "var(--radius-2xl)"],
            ].map(([label, val]) => (
              <div className="design-radius-item" key={label}>
                <div className="design-radius-box" style={{ borderRadius: val }} />
                <span>--radius-{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- shadcn/ui ---------- */}
        <section id="shadcn" className="design-section">
          <h2>Componentes shadcn/ui</h2>
          <p className="design-lead">
            Primitivas de <span className="design-code">@base-ui/react</span> vestidas con
            los tokens de arriba. Se usan poco en el sitio público (que es casi todo CSS a
            medida) y más en el panel de administración y los formularios.
          </p>

          <div className="design-block">
            <h3>Button — variantes</h3>
            <div className="design-row">
              <Button variant="default">Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <h3 style={{ marginTop: "1.2rem" }}>Button — tamaños</h3>
            <div className="design-row">
              <Button size="xs">xs</Button>
              <Button size="sm">sm</Button>
              <Button size="default">default</Button>
              <Button size="lg">lg</Button>
              <Button size="icon" aria-label="Icono">
                <Plus aria-hidden size={16} />
              </Button>
            </div>
          </div>

          <div className="design-block">
            <h3>Input / Textarea / Label</h3>
            <div className="design-card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", maxWidth: 360 }}>
              <div>
                <Label htmlFor="d-input">Etiqueta</Label>
                <Input id="d-input" placeholder="Texto de ejemplo" style={{ marginTop: "0.4rem" }} />
              </div>
              <Textarea placeholder="Área de texto" rows={3} />
            </div>
          </div>

          <div className="design-block">
            <h3>Checkbox / Switch</h3>
            <div className="design-row">
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
                Marcar como hito
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                Activo
              </label>
            </div>
          </div>

          <div className="design-block">
            <h3>Tabs</h3>
            <Tabs defaultValue="uno" style={{ maxWidth: 420 }}>
              <TabsList>
                <TabsTrigger value="uno">Uno</TabsTrigger>
                <TabsTrigger value="dos">Dos</TabsTrigger>
                <TabsTrigger value="tres">Tres</TabsTrigger>
              </TabsList>
              <TabsContent value="uno">Contenido de la pestaña uno.</TabsContent>
              <TabsContent value="dos">Contenido de la pestaña dos.</TabsContent>
              <TabsContent value="tres">Contenido de la pestaña tres.</TabsContent>
            </Tabs>
          </div>
        </section>

        {/* ---------- Botones propios ---------- */}
        <section id="botones" className="design-section">
          <h2>Botones y controles propios</h2>
          <p className="design-lead">
            El panel de administración y el modal público no usan el{" "}
            <span className="design-code">Button</span> de shadcn para casi nada: tienen su
            propio vocabulario, más plano y con el marrón como única acción destacada.
          </p>

          <div className="design-block">
            <h3>Panel — guardar / descartar / añadir</h3>
            <div className="design-row" style={{ padding: "1.2rem", background: "var(--paper-solid)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
              <button className="save-btn">Guardar</button>
              <button className="discard-btn">Descartar</button>
              <button className="add-btn">
                <Plus aria-hidden size={14} strokeWidth={2} /> Añadir
              </button>
              <label className="upload-btn">
                <Upload aria-hidden size={14} strokeWidth={2} /> Subir imagen
              </label>
            </div>
          </div>

          <div className="design-block">
            <h3>Modal — iconos sobre foto</h3>
            <div
              className="design-row"
              style={{ padding: "1.2rem", background: "var(--ink)", borderRadius: "var(--radius-lg)" }}
            >
              <button className="modal-close" style={{ position: "static" }}>
                <X aria-hidden size={18} strokeWidth={1.8} />
              </button>
              <button className="modal-expand" style={{ position: "static" }}>
                <Maximize2 aria-hidden size={17} strokeWidth={1.8} />
              </button>
              <a className="modal-download" style={{ position: "static" }} href="#">
                <Download aria-hidden size={17} strokeWidth={1.8} />
              </a>
            </div>
          </div>

          <div className="design-block">
            <h3>Me gusta / sesión</h3>
            <div className="design-row">
              <button className="like-btn liked">
                <Heart aria-hidden size={16} strokeWidth={1.8} fill="currentColor" />
                12
              </button>
              <button className="like-btn">
                <Heart aria-hidden size={16} strokeWidth={1.8} />
                12
              </button>
              <a className="user-chip" href="#">
                Entrar
              </a>
              <a className="user-chip-guest user-chip" href="#">
                Únete
              </a>
              <a className="join-cta-link" href="#">
                Crear mi cuenta
              </a>
            </div>
          </div>
        </section>

        {/* ---------- Insignias ---------- */}
        <section id="insignias" className="design-section">
          <h2>Insignias y estado</h2>
          <p className="design-lead">
            El color nunca decora aquí: cada punto o pastilla usa un token semántico
            (<span className="design-code">--warning</span>,{" "}
            <span className="design-code">--success</span>,{" "}
            <span className="design-code">--destructive</span>) para que el estado se lea
            de un vistazo en la lista del panel.
          </p>
          <div className="design-row">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
              <span className="status-dot pending" /> Pendiente
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
              <span className="status-dot published" /> Publicada
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
              <span className="status-dot rejected" /> Descartada
            </span>
          </div>
          <div className="design-row">
            <span className="comment-status pending">Pendiente</span>
            <span className="comment-status rejected">Retirado</span>
            <span className="modal-featured">Hito</span>
          </div>
        </section>

        {/* ---------- Formularios ---------- */}
        <section id="formularios" className="design-section">
          <h2>Formularios del panel</h2>
          <p className="design-lead">
            Etiquetas en versales espaciadas encima del campo, borde de 1px y sin sombra —
            la clase <span className="design-code">.admin</span> es la que da este estilo a
            cualquier <span className="design-code">label</span>/<span className="design-code">input</span>/
            <span className="design-code">textarea</span> dentro de ella.
          </p>
          <div
            className="admin"
            style={{ height: "auto", padding: "1.4rem", background: "var(--paper-solid)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", maxWidth: 420 }}
          >
            <label>
              Título
              <Input type="text" placeholder="Plaza mayor, hacia 1932" />
            </label>
            <label className="check-field" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <Checkbox />
              <span>Hito relevante</span>
            </label>
            <span className="hint">Texto de ayuda bajo un campo, sin versales.</span>
          </div>
        </section>

        {/* ---------- Markdown ---------- */}
        <section id="markdown" className="design-section">
          <h2>Editor de descripción y render de markdown</h2>
          <p className="design-lead">
            <span className="design-code">MarkdownEditor</span> es un WYSIWYG (Tiptap)
            que serializa a markdown; <span className="design-code">MarkdownText</span>{" "}
            lo vuelve a pintar en el modal con <span className="design-code">react-markdown</span>{" "}
            (sin HTML crudo, así que no hace falta sanitizar aparte).
          </p>
          <div className="design-block">
            <h3>Editor (panel)</h3>
            <div style={{ maxWidth: 480 }}>
              <MarkdownEditor value={mdValue} onChange={setMdValue} placeholder="Escribe algo…" />
            </div>
          </div>
          <div className="design-block">
            <h3>Render (modal)</h3>
            <div className="design-card" style={{ maxWidth: 480 }}>
              <MarkdownText className="modal-description" text={mdValue} />
            </div>
          </div>
        </section>

        {/* ---------- Mapa y modal ---------- */}
        <section id="mapa" className="design-section">
          <h2>Marcadores y línea de tiempo</h2>
          <p className="design-lead">
            El mapa en sí no se documenta aquí (es MapLibre, no un componente de UI), pero
            sí las formas propias que se dibujan sobre él.
          </p>
          <div className="design-frame dark-preview">
            <div className="design-row" style={{ alignItems: "center" }}>
              <span className="photo-marker" />
              <span className="photo-marker featured" />
              <span className="cluster-marker">4</span>
              <span className="cluster-marker featured">2</span>
            </div>
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
