---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "File path traversal: null byte extension bypass"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's path traversal lab where the filename must end in .jpg: bypassing the extension check with a null byte to read /etc/passwd."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 15:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, null-byte, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                        # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm path traversal yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, null byte extension bypass — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/nullbyte-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (nullbyte-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, python, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

This is the last filter in the path traversal series, and it guards the *other* end of the filename: it requires the value to **end with a valid image extension** such as `.jpg`. The idea is that only image files can ever be requested.

The bypass is a classic **null byte**, `%00`. In languages built on C string handling, a null byte marks the end of a string. So `/etc/passwd%00.jpg` looks like it ends in `.jpg` to the application's extension check, but when that value reaches the low-level file API, everything from the null byte onward is discarded — the file actually opened is `/etc/passwd`.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The image endpoint validates that the filename ends in `.jpg`. The task is to bypass the extension check with a null byte and retrieve `/etc/passwd`.

## Recon

The application is the usual shop, serving product images through a `filename` parameter.

![The shop home page](/posts/images/nullbyte-shop.webp "The lab application, showing product images")

Right-click a product image and choose **Open image in new tab** (or **Copy image address**) to find the endpoint.

![Right-click menu on the product image](/posts/images/nullbyte-context-menu.webp "Opening the image in a new tab reveals the endpoint that serves it")

The image is served by `GET /image?filename=38.jpg`, returning the raw file:

![The image endpoint serving a product picture](/posts/images/nullbyte-image-endpoint.webp "The /image endpoint returns a file by its filename")

A normal request confirms the baseline — `filename=38.jpg` returns the JPEG:

![The normal image request returning a JPEG](/posts/images/nullbyte-normal.webp "A normal request: filename=38.jpg returns the product image")

Traversal sequences work here, but the value has to end in `.jpg` or the request is rejected — so `../../../etc/passwd` alone is blocked for failing the extension check.

## Exploitation

Send the image request to Repeater. We keep the `.jpg` suffix to satisfy the check, but cut it off with a null byte so the filesystem never sees it.

> In Burp, send the request to Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd>. Type the null byte as `%00` directly in the request; Burp sends it as a real `0x00` byte.
{: .tip}

```http
GET /image?filename=../../../etc/passwd%00.jpg HTTP/2
Host: LAB-ID.web-security-academy.net
```

The extension check sees a value ending in `.jpg` and lets it through. When the path reaches the file API, the `%00` null byte terminates the string at `/etc/passwd`, and `.jpg` is ignored. The response is the contents of `/etc/passwd`, and the lab is solved:

![The null byte payload returning the contents of /etc/passwd](/posts/images/nullbyte-result.webp "The null byte truncates the path at /etc/passwd while .jpg keeps the extension check happy")

> Think of `%00` as two different things to two different readers: to the application's string check it's just a character before `.jpg`; to the C-level file function it's "the string stops here".
{: .note}

## Root cause

The endpoint checks that the filename ends in an allowed extension, then passes the raw value to a file function that treats the null byte as a string terminator:

```php
// Vulnerable: checks the extension, then opens a path that a null byte can truncate
if (preg_match('/\.(jpg|png)$/', $filename)) {   // ends in .jpg/.png?
    readfile("/var/www/images/" . $filename);    // ...but %00 cuts the string short
}
```

With `../../../etc/passwd%00.jpg`, the regex is happy: the string ends in `.jpg`. But the underlying file call stops at the null byte, so it opens `/etc/passwd`. The two layers disagree about where the string ends — the check reads the whole value, the filesystem reads only up to the null byte.

This specific trick is historical: it relied on null-byte handling in older PHP (before 5.3.4) and similar C-backed APIs. Modern runtimes reject embedded null bytes, but the lesson about mismatched parsing between layers is evergreen.

## Mitigation

Reject null bytes (and other control characters) in input outright, and don't rely on the extension as a security boundary. As always, the robust fix is to keep user input out of file paths:

```python
# Unsafe: trust the extension, then open a path influenced by the user
if filename.endswith(".jpg"):
    open("/var/www/images/" + filename, "rb")

# Safer: reject null bytes, and map an ID to a known file instead of a path
if "\x00" in filename:
    abort(400)
FILES = {"38": "beer-belt.jpg", "15": "balloons.jpg"}
open(os.path.join(IMAGE_DIR, FILES[image_id]), "rb")
```

If you must accept a filename, validate the fully decoded value, canonicalise the resolved path, confirm it stays within the base directory, and reject anything containing a null byte.

## Key takeaways

- A null byte (`%00`) can satisfy an extension check while truncating the real path: `/etc/passwd%00.jpg` opens `/etc/passwd`.
- The bug is a parsing mismatch — the validator reads the whole string, the C-level file API stops at the null byte.
- File extensions are not a security control; attackers can append or truncate around them.
- The durable fix is unchanged across the whole series: reject control characters, validate the resolved path, and prefer mapping IDs to files over accepting paths.
