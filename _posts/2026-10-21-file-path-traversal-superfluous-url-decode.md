---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "File path traversal: superfluous URL-decode bypass"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's path traversal lab where the server strips ../ then decodes again: bypassing it with a double URL-encoded payload."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 13:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, url-encoding, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm path traversal yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, superfluous URL-decode bypass — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/urldecode-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (urldecode-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, python, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

This is the fourth filter in the path traversal series. The [simple case](/blog/file-path-traversal-simple/) had no filter; others fell to an [absolute path](/blog/file-path-traversal-absolute-path-bypass/) or to [nested sequences](/blog/file-path-traversal-stripped-non-recursively/). This lab strips `../` **and then URL-decodes the value a second time**, after the filter has already run.

That extra decode is the mistake. If the application decodes the input one more time than it should, we can hide our traversal sequence behind an extra layer of URL-encoding. The filter sees only harmless encoded text; the superfluous decode then turns it back into `../` — too late to be filtered.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The image endpoint blocks traversal sequences but performs an extra URL-decode on the filename. The task is to bypass the filter with a double-encoded payload and read `/etc/passwd`.

## Recon

The application is the usual shop, serving product images through a `filename` parameter.

![The shop home page](/posts/images/urldecode-shop.webp "The lab application, showing product images")

Right-click a product image and choose **Open image in new tab** (or **Copy image address**) to find the endpoint.

![Right-click menu on the product image](/posts/images/urldecode-context-menu.png "Opening the image in a new tab reveals the endpoint that serves it")

The image is served by `GET /image?filename=29.jpg`, returning the raw file:

![The image endpoint serving a product picture](/posts/images/urldecode-image-endpoint.png "The /image endpoint returns a file by its filename")

A normal request confirms the baseline — `filename=29.jpg` returns the JPEG:

![The normal image request returning a JPEG](/posts/images/urldecode-normal.webp "A normal request: filename=29.jpg returns the product image")

Plain `../../../etc/passwd` is blocked, and a single layer of encoding (`%2f`) doesn't help either — after the server's normal decode it becomes a literal `../`, which the filter catches.

## Understanding the double encoding

The whole trick rests on one idea: **encoding the already-encoded value a second time**.

Start from the path we want and encode the slashes once. A forward slash `/` is `%2f` in URL encoding, so:

```text
../../../etc/passwd   ->   ..%2f..%2f..%2fetc%2fpasswd
```

![The payload after a single URL-encode](/posts/images/urldecode-encoder-single.png "Single URL-encode: the slashes become %2f")

Now encode it **again**. The key is the `%` character itself, which encodes to `%25`. So every `%2f` becomes `%252f`:

```text
..%2f..%2f..%2fetc%2fpasswd   ->   ..%252f..%252f..%252fetc%252fpasswd
```

![The payload after a second URL-encode](/posts/images/urldecode-encoder-double.png "Double URL-encode: each %2f becomes %252f")

So `%252f` is a double-encoded slash. It decodes in two steps:

```text
%252f   --decode-->   %2f   --decode-->   /
```

Why does that defeat the filter? The web server decodes the query string once as normal, turning `%252f` into `%2f`. At that point the value is `..%2f..%2f..%2f...` — there is **no literal `../`**, so the filter finds nothing to strip. Then the application runs its *extra, superfluous* decode, turning `%2f` into `/` and producing `../../../` — but the filter has already finished and never sees it.

## Exploitation

Send the image request to Repeater and set `filename` to the double-encoded payload.

> In Burp, send the request to Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd>. The **Inspector** panel on the right is handy here — paste the value and it shows the decode chain step by step (`..%252F..` → `..%2F..` → `../../../etc/passwd`), which is a quick way to confirm your encoding is right.
{: .tip}

```http
GET /image?filename=..%252f..%252f..%252fetc%252fpasswd HTTP/2
Host: LAB-ID.web-security-academy.net
```

The response is the contents of `/etc/passwd`, and the lab is solved:

![The double-encoded payload returning /etc/passwd, with the Inspector showing the decode chain](/posts/images/urldecode-result.webp "The double-encoded payload passes the filter; the Inspector shows it decoding back to ../../../etc/passwd and the response returns the file")

> Burp's Inspector decoded the selection twice from URL encoding to reveal `../../../etc/passwd` — a clear picture of exactly what the server does one step too many.
{: .note}

## Root cause

The endpoint strips `../`, then calls a URL-decode on the already-decoded value — one decode too many:

```php
// Vulnerable: strip ../, then decode AGAIN (the web server already decoded once)
$filename = str_replace("../", "", $_GET["filename"]);
$filename = urldecode($filename);           // superfluous second decode
readfile("/var/www/images/" . $filename);
```

With `..%252f..`, the first (server) decode yields `..%2f..` — the filter sees no `../` and passes it through. The second, unnecessary `urldecode` then produces `../`, and the path escapes the image directory to `/etc/passwd`. The defect isn't the filter's pattern; it's decoding input after validating it, so the value that reaches the filesystem is not the value that was checked.

## Mitigation

Never validate a value and then transform it again — canonicalise *first*, then validate, then use that exact value with no further decoding. Better still, keep user input out of file paths entirely:

```python
# Unsafe: decode happens after the check, so the checked value isn't the final one
filename = request.args["filename"].replace("../", "")
filename = urllib.parse.unquote(filename)   # extra decode re-creates ../
open("/var/www/images/" + filename, "rb")

# Safer: user never supplies a path; look the file up by an ID you control
FILES = {"29": "teabag.jpg", "15": "balloons.jpg"}
open(os.path.join(IMAGE_DIR, FILES[image_id]), "rb")
```

If you must accept a filename, fully decode it up front, then canonicalise the resolved path (`os.path.realpath`) and confirm it still lives inside the intended base directory — and never decode again afterwards.

## Key takeaways

- A superfluous extra decode lets you hide `../` behind a second layer of encoding: `%252f` passes the filter, then decodes to `/`.
- Double-encoding works because `%` itself encodes to `%25`, so `%2f` becomes `%252f` and survives one decode pass.
- Burp's Inspector shows the decode chain (`%252F` → `%2F` → `/`), which makes crafting and verifying the payload easy.
- Decode/canonicalise before validating, never after — and prefer mapping IDs to files over accepting paths at all.
