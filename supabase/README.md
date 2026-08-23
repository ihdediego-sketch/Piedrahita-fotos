# Puesta en marcha de Supabase

Todo el contenido del sitio (textos, fotos, imágenes, comentarios) vive en
Supabase. Editar desde el panel no requiere volver a desplegar.

Producción: <https://piedrahita-fotos.vercel.app>

## 1. Crear el esquema

En el proyecto de Supabase → **SQL Editor**, ejecutar de una vez el contenido de
`migrations/0001_init.sql`. Crea las tablas, los roles, las políticas de
seguridad (RLS) y el bucket `photos` de Storage.

## 2. Variables de entorno en Vercel

En el proyecto de Vercel → **Settings → Environment Variables**, para
*Production*, *Preview* y *Development*:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ruxyhgueeddwggpufvbx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_bPY2oYvk7hexBIoW2Zv--Q_KP9FCTdc` |
| `NEXT_PUBLIC_SITE_URL` | `https://piedrahita-fotos.vercel.app` |

`NEXT_PUBLIC_SITE_URL` fija el destino de los enlaces del correo. Sin ella se
deduce de la petición, y en un despliegue de vista previa saldría la URL
efímera de ese despliegue, que Supabase rechazaría.

La clave secreta (`SUPABASE_SECRET_KEY`) **no** se pone en Vercel: solo la usa
el script de migración, en local.

Después de añadirlas hay que volver a desplegar para que las tome.

## 3. Configurar el acceso por enlace mágico

En Supabase → **Authentication → URL Configuration**:

- *Site URL*: `https://piedrahita-fotos.vercel.app`
- *Redirect URLs*, una por línea:

```
https://piedrahita-fotos.vercel.app/auth/confirm
http://localhost:3000/auth/confirm
```

Si además quieres poder entrar desde los despliegues de vista previa de Vercel,
añade `https://*-tu-usuario.vercel.app/auth/confirm` (Supabase admite comodín).

No hace falta tocar las plantillas de correo: `/auth/confirm` acepta tanto el
formato de fábrica (`?code=`) como el de `{{ .TokenHash }}`.

> El correo de fábrica de Supabase tiene un límite bajo de envíos por hora y
> suele acabar en spam. Para un uso real conviene configurar un SMTP propio en
> **Authentication → Emails → SMTP Settings**.

## 4. Nombrarte administrador

Entrar una vez en <https://piedrahita-fotos.vercel.app/entrar> con tu correo y
abrir el enlace. Eso crea el usuario y su perfil. Después, en el SQL Editor,
ejecutar `migrations/0002_admin.sql`.

A partir de ahí los roles se gestionan desde **/admin → Personas**.

## 5. Subir las cuatro fotos originales

Desde local, con la clave secreta del proyecto (Project Settings → API keys):

```sh
SUPABASE_SECRET_KEY=sb_secret_… node supabase/seed/migrate.mjs
```

Sube las imágenes de `public/photos/` a Storage e inserta las filas ya
publicadas. Es idempotente: si se vuelve a ejecutar, salta las que ya están.

Cuando el mapa las muestre desde Supabase, `public/photos/` y
`supabase/seed/photos.json` se pueden borrar del repositorio.

## Roles

| Rol | Puede |
| --- | --- |
| `admin` | Todo: publicar, moderar, editar los textos, borrar y asignar roles |
| `colaborador` | Publicar fotos directamente y aprobar o rechazar las que envían los demás |
| `usuario` | Enviar fotos (quedan pendientes), dar me gusta y comentar |

Los límites no dependen de la interfaz: están en las políticas RLS y en los
triggers de `0001_init.sql`, así que se aplican también a cualquier llamada
directa a la API.
