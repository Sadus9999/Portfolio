# Demigod Portfolio CMS

Panel CMS do zarządzania galerią portfolio z projektu Figma.

## Stack

- Next.js 15 / React 19
- Cloudflare R2 jako storage obrazów i `gallery.json`
- Sharp do generowania wersji WebP
- prosty login admina oparty o zmienne środowiskowe

## Funkcje MVP

- login
- widok listy i kafelków
- drag & drop kolejności
- edycja tytułu, klienta, tagów i publikacji
- multi-upload
- automatyczna optymalizacja thumbnail/full
- delete
- Publish changes do R2

## Start lokalny

1. `npm install`
2. skopiuj `.env.example` do `.env.local`
3. uzupełnij dane R2 oraz login
4. `npm run dev`

## Cloudflare R2

Bucket: `demigod-portfolio`

Publiczny development URL:

`https://pub-eff24699f34649e8bb817dacedb2d952.r2.dev`

CMS czyta i publikuje `gallery.json`, uploaduje obrazy do `full/` i `thumbs/`.

## Wymagane zmienne środowiskowe

- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

## Uwaga o uploadach

Aktualne MVP wysyła pliki przez endpoint Next.js i generuje WebP po stronie serwera. Przy wdrożeniu na Vercel warto później przenieść duże uploady na bezpośredni upload do R2, żeby ominąć limity rozmiaru body funkcji.
