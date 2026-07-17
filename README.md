# 🧭 Viaxes

Aplicación web para planificar viaxes: mapa interactivo, planning por días,
diario de bitácora (texto/foto/audio/debuxo) e listas (maleta, compra...).

## 1. Crear o proxecto en Supabase

1. Vai a [supabase.com](https://supabase.com) → **New project** (rexión Frankfurt recomendada).
2. Cando estea listo, entra en **SQL Editor** → pega **todo** o contido de `sql/schema.sql` → **Run**.
   Isto crea as táboas, a seguridade (RLS) e o bucket de almacenamento para fotos/audios/debuxos.
3. Vai a **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key`

## 2. Crear os dous usuarios (ti e ela)

En Supabase: **Authentication → Users → Add user** (2 veces):
- Email: `antonio@viaxes.local` (usarás só a parte "antonio" para entrar na app)
- Contrasinal: o que queiras
- Repite para o segundo usuario, ex: `nome@viaxes.local`

> Importante: desactiva a confirmación por email en **Authentication → Providers → Email → "Confirm email"** (ponlo en OFF), porque estes correos non existen de verdade.

## 3. Configurar variables de entorno

Copia `.env.example` a `.env` e pon os teus datos:

```
VITE_SUPABASE_URL=https://TU-PROXECTO.supabase.co
VITE_SUPABASE_ANON_KEY=a-tua-anon-key
```

## 4. Despregar en Vercel (gratis)

1. Sube este proxecto a un repo de GitHub (`ferramentascmus/viaxes` por exemplo).
2. Vai a [vercel.com](https://vercel.com) → **New Project** → importa o repo.
3. En **Environment Variables** engade `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Xa está — funciona en móbil e iPad, e cada push a GitHub actualiza a app.

## 5. Uso

- Entra con `antonio` / o teu contrasinal.
- Crea a primeira viaxe (nome + datas).
- Dentro da viaxe, no botón **👥 Convidar**, escribe o username da outra persoa
  (ex: se o email é `nome@viaxes.local`, o username é `nome`) para que poida
  ver e editar a mesma viaxe.
- **Mapa**: preme "+ Engadir lugar" e despois toca no mapa para crear un marcador.
- **Planning**: timeline horizontal, un cartón por día.
- **Diario**: texto, foto (dende a cámara do móbil), nota de voz ou debuxo.
- **Listas**: crea tantas coma queiras (maleta, compra...).

## Estrutura do proxecto

```
src/
  lib/supabase.js       cliente de Supabase
  pages/Login.jsx        acceso usuario/contrasinal
  pages/Trips.jsx         listaxe e creación de viaxes
  pages/TripDashboard.jsx  pantalla dunha viaxe (tabs)
  components/MapView.jsx    mapa Leaflet + marcadores
  components/Timeline.jsx    planning horizontal
  components/Diary.jsx        diario de bitácora
  components/DrawingPad.jsx    canvas de debuxo
  components/Lists.jsx          listas de tarefas
sql/schema.sql            esquema completo + RLS + storage
```

## Custo: 0 €

- **Supabase** free tier: 500MB de base de datos + 1GB de storage + auth ilimitada.
- **Vercel** free tier: deploys e hosting ilimitados para proxectos persoais.
- **OpenStreetMap** (mapa): gratuíto e sen límites de uso razoable.

Para unha viaxe de fin de semana con fotos, notas de voz e debuxos, sobra de moito.

## Seguinte pasos posibles (cando teñas tempo)

- Drag-and-drop para reordenar o itinerario (@dnd-kit xa está instalado).
- Modo escuro.
- Exportar a viaxe completa a PDF.
- Editar/mover marcadores existentes no mapa (agora só se crean e borran).
- Transcrición automática das notas de voz.
