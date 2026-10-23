---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "File path traversal: validation of start of path"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's path traversal lab where the filename must start with the base directory: satisfying the prefix, then traversing out to /etc/passwd."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 14:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                        # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm path traversal yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, validation of start of path — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/startpath-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (startpath-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, python, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

The path traversal filters so far have all tried to *remove or block* something. This one does the opposite: it **requires the filename to start with the expected base directory**, for example `/var/www/images/`. The idea is that if the path begins where it should, it must be safe.

But "starts with the right folder" says nothing about where the path *ends up*. We can satisfy the check literally — begin with `/var/www/images/` — and then traverse straight back out of it with `../` sequences. The prefix keeps the validator happy; the traversal does the real work.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The image endpoint validates that the filename starts with the expected base folder. The task is to satisfy that check and still retrieve `/etc/passwd`.

## Recon

The application is the usual shop, serving product images through a `filename` parameter.

![The shop home page](/posts/images/startpath-shop.webp "The lab application, showing product images")

Right-click a product image and choose **Open image in new tab** (or **Copy image address**) to find the endpoint.

![Right-click menu on the product image](/posts/images/startpath-context-menu.png "Opening the image in a new tab reveals the endpoint that serves it")

Here the endpoint gives us a crucial hint: the `filename` isn't a bare `6.jpg` — it's a full absolute path, `/var/www/images/6.jpg`.

![The image endpoint using a full absolute path](/posts/images/startpath-image-endpoint.png "The endpoint expects a full path that starts with /var/www/images/")

A normal request confirms the pattern — `filename=/var/www/images/6.jpg` returns the JPEG:

![The normal image request returning a JPEG](/posts/images/startpath-normal.webp "A normal request: filename=/var/www/images/6.jpg returns the product image")

That tells us two things: the application works with absolute paths, and it almost certainly checks that the value **begins with** `/var/www/images/`. A plain `../../../etc/passwd` fails that check because it doesn't start with the required folder.

## Exploitation

Send the image request to Repeater. The trick is to give the validator exactly the prefix it wants, then climb back out with traversal sequences.

> In Burp, send the request to Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd>, then edit the `filename` value and replay with **Send**.
{: .tip}

```http
GET /image?filename=/var/www/images/../../../etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
```

The value starts with `/var/www/images/`, so the start-of-path check passes. The `../../../` then walks up out of that folder to the filesystem root, and `/etc/passwd` is returned. The lab is solved:

![The prefixed payload returning the contents of /etc/passwd](/posts/images/startpath-result.webp "Starting with the required base path then traversing out returns /etc/passwd")

> The resolved path here is `/var/www/images/../../../etc/passwd`, which the operating system simplifies to `/etc/passwd`. The folder you start in is irrelevant once you traverse above it.
{: .note}

## Root cause

The endpoint validates the *prefix* of the filename, then reads whatever that path resolves to:

```php
// Vulnerable: only checks how the path STARTS, not where it resolves to
$filename = $_GET["filename"];
if (strpos($filename, "/var/www/images/") === 0) {   // starts with base dir?
    readfile($filename);                              // ...but ../ can still escape
}
```

`/var/www/images/../../../etc/passwd` passes the `strpos(...) === 0` check because it literally begins with `/var/www/images/`. The flaw is that the check looks at the *string*, not at the *resolved* path. Once the operating system collapses the `../` sequences, the file that's actually opened is `/etc/passwd` — a location the validator never considered.

## Mitigation

Validate the **canonicalised** path, not the raw string. Resolve it first, then confirm the real target is inside the base directory:

```python
# Unsafe: a string prefix check; ../ after the prefix still escapes
if filename.startswith("/var/www/images/"):
    open(filename, "rb")

# Safer: resolve the path, THEN confirm it stays within the base directory
base = "/var/www/images/"
full = os.path.realpath(os.path.join(base, filename))
if full.startswith(os.path.realpath(base) + os.sep):
    open(full, "rb")
```

Even better, don't accept paths at all — map an identifier to a known file, so the user never influences the filesystem path directly.

## Key takeaways

- Checking that a path *starts with* the right directory says nothing about where it ends up; `../` after the prefix escapes it.
- Normal requests that expose a full absolute path (`/var/www/images/6.jpg`) are a strong hint that a start-of-path check is in play.
- Always validate the resolved/canonicalised path (`os.path.realpath`), not the raw input string.
- The durable fix across every path traversal lab is the same: map IDs to files instead of accepting paths.
