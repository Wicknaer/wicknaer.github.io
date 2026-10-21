---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
# ============================================================================

title: "File path traversal: absolute path bypass"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's path traversal lab where ../ sequences are stripped: bypassing the filter with an absolute path to read /etc/passwd."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-19 12:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm path traversal yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, absolute path bypass — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# Yazıyı sonradan güncellersen alttaki satırın # işaretini kaldır;
# üst bilgide "Updated" tarihi olarak görünür.
# last_modified_at: 2026-10-21 18:00:00 +0300
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

     GÖRSEL:   ![alt metin](/posts/images/abs-path-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, abs-path-request.png), yoksa çakışır
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

In the [simple path traversal case](/blog/file-path-traversal-simple/), a raw `../../../etc/passwd` was enough. Real applications often try to defend against this by stripping or blocking `../` sequences. This lab has exactly that filter — but it only removes traversal sequences, which is not the same as securing the file lookup.

If the application removes `../` yet still hands the filename straight to the filesystem, we can skip traversal entirely and supply an **absolute path** like `/etc/passwd`. There are no `../` sequences to strip, and the absolute path resolves on its own.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The image endpoint blocks path traversal sequences. The task is to bypass the filter and retrieve the contents of `/etc/passwd`.

## Recon

The application is the usual shop, serving product images through a `filename` parameter.

![The shop home page](/posts/images/abs-path-shop.webp "The lab application, showing product images")

As before, right-click a product image and choose **Open image in new tab** (or **Copy image address**) to find the URL behind it.

![Right-click menu on the product image](/posts/images/abs-path-context-menu.webp "Opening the image in a new tab reveals the endpoint that serves it")

The image is served by `GET /image?filename=38.jpg`, which returns the raw JPEG — the same pattern as the simple lab:

![The normal image request returning a JPEG](/posts/images/abs-path-normal.webp "A normal request: filename=38.jpg returns the product image")

The difference here is that a classic `../../../etc/passwd` payload no longer works — the application strips the `../` sequences, so the path never escapes the image directory.

## Exploitation

Send the image request to Repeater so we can try different payloads quickly.

> In Burp, select the request and press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it to Repeater, then edit the `filename` value and replay with **Send**.
{: .tip}

Since the filter only looks for traversal sequences, we sidestep it with an absolute path — no `../` required:

```http
GET /image?filename=/etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
```

The response is the contents of `/etc/passwd`, and the lab is solved:

![The absolute path returning the contents of /etc/passwd](/posts/images/abs-path-result.webp "Supplying an absolute path bypasses the traversal filter and returns /etc/passwd")

> A good habit when a filter blocks one technique: ask what the filter actually checks, not what it's meant to prevent. Here it checks for `../`, so anything that reaches the target file without `../` — an absolute path — walks right past it.
{: .note}

## Root cause

The endpoint strips traversal sequences from the filename, then uses whatever is left as the path. The problem is that "remove `../`" does nothing against an absolute path:

```php
// Vulnerable: strips ../ but then trusts the result as a path
$filename = str_replace("../", "", $_GET["filename"]);
readfile("/var/www/images/" . $filename);
```

In many real stacks the base-directory join is even weaker — path-join functions typically discard the base when the second argument is absolute, so `/etc/passwd` resolves directly regardless of the intended folder. Either way, the filter addresses the *symptom* (`../`) instead of the actual issue: untrusted input is used to build a filesystem path.

## Mitigation

Blocklisting `../` is the wrong approach — attackers have too many ways around it (absolute paths, encodings, nested sequences). Keep user input out of file paths entirely by mapping an identifier to a known file:

```python
# Unsafe: filter the input, then still use it as a path
filename = user_input.replace("../", "")
open("/var/www/images/" + filename, "rb")

# Safer: user never supplies a path; look the file up by an ID you control
FILES = {"38": "beer-belt.jpg", "14": "sun.jpg"}
open(os.path.join(IMAGE_DIR, FILES[image_id]), "rb")
```

If you must accept a filename, canonicalise the full path (e.g. `os.path.realpath`) and verify the result still lives inside the intended base directory, and reject absolute paths outright.

## Key takeaways

- Stripping `../` is not the same as securing a file lookup; an absolute path reaches the target without any traversal sequences.
- When a filter blocks the obvious payload, test what it literally checks — not its intent.
- Path-join functions usually drop the base directory when given an absolute path, which is why `/etc/passwd` works directly.
- The real fix is the same as every path traversal: map IDs to files, or canonicalise and confine the path and reject absolute inputs.
