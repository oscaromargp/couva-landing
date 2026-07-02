# Guía: lanza tu primera campaña en Meta (paso a paso)

Meta = Facebook + Instagram. Vas a mandar tráfico a tu landing para capturar prospectos.
Tiempo: ~30 min. Presupuesto sugerido de prueba: **$150–250 MXN/día**.

> Requisito: tener la **Página** (ya la tienes) conectada a una **cuenta publicitaria**.

---

## PASO 0 — Cuenta publicitaria (una sola vez)
1. Entra a **business.facebook.com** → crea un **Portafolio de negocio** (Business).
2. Agrega tu **Página** al portafolio.
3. Crea una **cuenta publicitaria** (Configuración ▸ Cuentas publicitarias ▸ Agregar).
4. Agrega un **método de pago** (tarjeta).

## PASO 1 — Nueva campaña
1. Ve a **Administrador de Anuncios** (adsmanager.facebook.com) ▸ **+ Crear**.
2. Objetivo: **Clientes potenciales** (Leads).
   - Si aún NO tienes el Pixel activo → usa objetivo **Tráfico**. Igual funciona para arrancar.
3. Nombre de campaña: `COUVA - PE - Prueba 1`.
4. (Si aparece) Deja **Ventaja+** / configuración manual, como prefieras. Para empezar, manual está bien.

## PASO 2 — Conjunto de anuncios (aquí va lo importante)
- **Ubicación de conversión:** Sitio web → pon tu landing:
  `https://oscaromargp.github.io/couva-landing/es?utm_source=facebook&utm_medium=cpc&utm_campaign=couva_pe`
- **Presupuesto:** Diario, **$200 MXN**.
- **Público / Ubicación geográfica:**
  1. Borra el país por defecto.
  2. Busca **"Puerto Escondido, Oaxaca"** y suéltalo como pin.
  3. Sube el radio al **máximo** (Meta permite hasta ~80 km).
  4. Agrega más pines para cubrir ~150 km: **Santa María Huatulco, Pochutla, Puerto Ángel, Río Grande, Santa Catarina Juquila**.
- **Edad:** 30–60. **Sexo:** todos.
- **Segmentación detallada (opcional):** intereses como *Bienes raíces, Inversión inmobiliaria, Airbnb, Casas de vacaciones, Propiedad de inversión*. 
  - Consejo: con presupuesto chico y buen creativo, puedes dejar el público **abierto** (sin intereses) y activar **Ventaja+ público** para que Meta encuentre a los compradores. Prueba ambas.
- **Ubicaciones (placements):** deja **Ventaja+ (automáticas)**.

## PASO 3 — Anuncios (creativos + textos)
1. **Identidad:** selecciona tu **Página** (y tu Instagram si lo vinculaste).
2. **Formato:** Imagen única (o carrusel con varias).
3. Sube los creativos de la carpeta `marketing/creativos/`:
   - Feed: `ad-01-pilotes-4x5.jpg`, `ad-02-interior-4x5.jpg`, `ad-03-exterior-4x5.jpg`
   - Historias/Reels: `ad-04-pilotes-9x16.jpg`
4. **Texto principal / Título / Descripción:** cópialos de `marketing/anuncios-copy.md`.
5. **Sitio web (URL):** la misma landing con UTM de arriba.
6. **Botón:** Más información.
7. Crea **2–3 anuncios** distintos (distinto creativo + texto) para que Meta encuentre el ganador.

## PASO 4 — Publicar
- Revisa que el presupuesto diga **$200/día** y publica.
- Meta revisa el anuncio (unas horas). Luego empieza a correr.

---

## Qué esperar y cómo leerlo (los primeros días)
- **Días 1–2:** Meta está "aprendiendo". No juzgues aún.
- **Día 3–5:** mira estas 3 cifras:
  - **CTR** (clics/impresiones): sano > 1%.
  - **Costo por clic (CPC):** referencia < $8–12 MXN.
  - **Prospectos** que te llegan por la landing (Supabase/Telegram).
- **Regla simple:** apaga el anuncio con peor CTR, sube $50–100/día al mejor.

## Errores a evitar
- No cambies todo cada día (mata el aprendizaje).
- No pongas geo demasiado chica (deja el radio amplio).
- No prometas rentas garantizadas en el texto (política de Meta).

> Cuando tengas el **Pixel activo**, cambiamos el objetivo a **Clientes potenciales optimizado por el evento Lead** — ahí Meta empieza a traer gente que SÍ deja datos, y baja el costo por prospecto.
