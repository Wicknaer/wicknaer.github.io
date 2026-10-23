---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "File path traversal: non-recursive stripping bypass"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's path traversal lab where ../ is stripped once: bypassing it with nested ....// sequences to read /etc/passwd."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 12:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                        # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm path traversal yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, non-recursive stripping bypass — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# Yazıyı sonradan güncellersen alttaki satırın # işaretini kaldır;
# üst bilgide "Updated" tarihi olarak görünür.
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:   ## Büyük başlık  (otomatik "Contents" listesine eklenir)
               ### Alt başlık
     METİN:    normal paragraf. **kalın**, *italik*, `satır içi kod`
     LİSTE:    "- madde" ya da "1. adım"
     LİNK:     [görünen metin](https://adres)
     TUŞ:      <kbd>Ctrl</kbd> + <kbd>R</kbd>

     GÖRSEL:   ![alt metin](/posts/images/nonrec-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, nonrec-request.png), yoksa çakışır
               - Lab ID, session cookie gibi değerleri görsellerde karart
               - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır ve bozar

     KOD BLOĞU: üç ters tırnak + dil adı. Dil adı renklendirme + "Copy" verir.
                Diller: http, bash, python, sql, javascript, php, html
                ```http
                GET /... HTTP/2
                ```

     KUTULAR:   satırın altına {: .note} / {: .tip} / {: .warn} yaz:
                > Bu bir bilgi (Note) kutusudur.
                {: .note}

                > Bu bir ipucu (Tip) kutusudur.
                {: .tip}

                > Bu bir uyarı (Warning) kutusudur.
                {: .warn}
========================================================================== -->

## Overview

The previous labs showed two filters: one that [blocked traversal and fell to an absolute path](/blog/file-path-traversal-absolute-path-bypass/), and the [simple case](/blog/file-path-traversal-simple/) with no filter at all. This lab adds a smarter-looking filter that **strips `../` sequences from the input** — but it does so in a single pass, without re-scanning the result.

Any filter that removes a pattern only once can be defeated by nesting the pattern so that the removal *creates* the sequence you wanted. Here the payload is `....//`: when the filter cuts the `../` out of the middle, what's left is `../`. Chain a few of those and you get full traversal.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The image endpoint strips path traversal sequences, but non-recursively. The task is to bypass the filter and retrieve the contents of `/etc/passwd`.

## Recon

The application is the usual shop, serving product images through a `filename` parameter.

![The shop home page](/posts/images/nonrec-shop.webp "The lab application, showing product images")

Right-click a product image and choose **Open image in new tab** (or **Copy image address**) to find the endpoint behind it.

![Right-click menu on the product image](/posts/images/nonrec-context-menu.webp "Opening the image in a new tab reveals the endpoint that serves it")

Opening the URL shows the image is served by `GET /image?filename=15.jpg`, returning the raw file:

![The image endpoint serving a product picture](/posts/images/nonrec-image-endpoint.webp "The /image endpoint returns a file by its filename")

A normal request confirms the baseline — `filename=15.jpg` returns the JPEG:

![The normal image request returning a JPEG](/posts/images/nonrec-normal.webp "A normal request: filename=15.jpg returns the product image")

A plain `../../../etc/passwd` no longer works here, and neither does an absolute path — the application strips the `../` sequences out of the value before using it.

## Exploitation

Send the image request to Repeater so we can try crafted payloads.

> In Burp, select the request and press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it to Repeater, then edit the `filename` value and replay with **Send**.
{: .tip}

The trick is to nest the sequence. Use `....//` repeated instead of `../`:

```http
GET /image?filename=....//....//....//etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
```

The response is the contents of `/etc/passwd`, and the lab is solved:

![The nested payload returning the contents of /etc/passwd](/posts/images/nonrec-result.webp "The nested ....// payload survives the single-pass filter and returns /etc/passwd")

> This same idea defeats many one-pass blocklist filters. If a filter deletes `foo`, try `fofooo` — the inner `foo` is removed and the outer characters close back up into `foo`.
{: .note}

## Root cause

The endpoint removes `../` from the filename once, then uses the result as a path:

```php
// Vulnerable: ../ is stripped a single time, non-recursively
$filename = str_replace("../", "", $_GET["filename"]);
readfile("/var/www/images/" . $filename);
```

Trace what happens to one `....//` chunk. The string is `. . . . / /`, and it contains `../` in the middle (characters 3–5). The filter cuts that out and the outer characters collapse together:

```text
....//   ->  (remove the inner ../)  ->  ../
```

Because the replacement runs only once, it never looks at its own output — so the freshly formed `../` survives. Repeating the chunk gives `....//....//....//` → `../../../`, and the path escapes the image directory to reach `/etc/passwd`.

## Mitigation

Patching the symptom by stripping `../` is fragile: nesting, encodings, and backslashes all get around it. Keep user input out of file paths entirely by mapping an identifier to a known file:

```python
# Unsafe: strip ../ once, then still use the value as a path
filename = user_input.replace("../", "")
open("/var/www/images/" + filename, "rb")

# Safer: user never supplies a path; look the file up by an ID you control
FILES = {"15": "balloons.jpg", "14": "sun.jpg"}
open(os.path.join(IMAGE_DIR, FILES[image_id]), "rb")
```

If you must accept a filename, canonicalise the full path (e.g. `os.path.realpath`) and verify the result still lives inside the intended base directory — a decision made on the *resolved* path, not on string matching of the input.

## Key takeaways

- A single-pass blocklist can be beaten by nesting the banned pattern so that removing it recreates it: `....//` becomes `../`.
- Never sanitise by deleting bad substrings once; the output can contain a fresh copy of what you just removed.
- Validate on the canonicalised, resolved path — confirm it stays within the base directory — rather than string-matching the raw input.
- The durable fix is the same across all path traversal labs: map IDs to files instead of accepting paths.
