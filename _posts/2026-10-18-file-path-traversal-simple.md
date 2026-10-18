---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
# ============================================================================

title: "File path traversal: simple case"       # Yazı başlığı (tırnak içinde)
description: "Walkthrough of PortSwigger's simple file path traversal lab: reading /etc/passwd through the image parameter with Burp's Intercept."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-18 20:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, path-traversal, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Görsel posts/images/ klasöründe. Değiştirmek istersen path satırını güncelle.
image:
  path: /posts/images/path-traversal-cover.webp
  alt: "File path traversal, simple case — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# Yazıyı sonradan güncellersen alttaki satırın # işaretini kaldır;
# üst bilgide "Updated" tarihi olarak görünür.
# last_modified_at: 2026-10-20 18:00:00 +0300
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

     GÖRSEL:   ![alt metin](/posts/images/path-traversal-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, path-traversal-request.png), yoksa çakışır
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

File path traversal (also called directory traversal) lets an attacker read files outside the directory the application intended to serve. It happens when user input is placed into a filesystem path without validation. By prefixing a filename with `../` sequences, an attacker can step up out of the base directory and reach arbitrary files such as `/etc/passwd`.

This lab is the simplest case: the product images are served by a parameter that drops straight into a file path, with no filtering at all.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Reading arbitrary files from a server you don't own is illegal.
{: .warn}

## The lab

**Goal:** The application serves product images through a vulnerable parameter. The task is to exploit the path traversal to retrieve the contents of `/etc/passwd`.

## Recon

The lab is the usual shop. Every product has a picture.

![The shop home page](/posts/images/path-traversal-shop.webp "The lab application, showing product images")

![A product page](/posts/images/path-traversal-product.webp "Each product loads an image from the server")

How is that image loaded? Right-click it and choose **Open image in new tab** (or **Copy image address**) to see the URL behind it.

![Right-click menu on the product image](/posts/images/path-traversal-context-menu.png "Opening the image in a new tab reveals the URL that serves it")

The image is served by `GET /image?filename=14.jpg`. The `filename` value looks like it's used directly to locate a file on disk — a classic path traversal candidate. If the server just joins it onto a base directory, we can climb out with `../`.

> In Burp's **HTTP history**, image responses are hidden by the default display filter (*Hiding CSS and image content*), so you may never see the `/image?filename=...` request there. That's why intercepting it is the easiest way to get hold of it. You can also click the **Filter settings** bar and unhide images.
{: .tip}

## Exploitation

We'll grab the image request with **Intercept** and rewrite the `filename` value before it leaves the browser.

Turn interception on under **Proxy → Intercept**.

![Burp's Intercept is on](/posts/images/path-traversal-intercept-on.png "Proxy interception enabled, holding requests before they reach the server")

Reload the product page. Keep pressing **Forward** until the held request is the one fetching the image — `GET /image?filename=14.jpg`.

![The image request held in Intercept](/posts/images/path-traversal-intercept-capture.webp "The image request captured in Intercept, ready to be modified")

Send it to Repeater (<kbd>Ctrl</kbd> + <kbd>R</kbd>) and change the `filename` value to climb three directories up and into `/etc/passwd`:

```http
GET /image?filename=../../../etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
```

The response is no longer an image — it's the contents of `/etc/passwd`, and the lab is solved:

![The response returning the contents of /etc/passwd](/posts/images/path-traversal-result.webp "The traversal payload returns the contents of /etc/passwd")

> You don't strictly need Burp for this one — because the request is a simple `GET`, you can also just edit the URL in the address bar. Burp's value is in intercepting and replaying it cleanly while you test payloads.
{: .note}

## Root cause

The image endpoint almost certainly builds a path by joining the base image directory with the user-supplied filename, and reads whatever that resolves to:

```php
// Vulnerable: filename is concatenated onto a base path with no validation
$file = "/var/www/images/" . $_GET["filename"];
readfile($file);
```

With `filename=14.jpg` this reads `/var/www/images/14.jpg`. With `filename=../../../etc/passwd` the `../` sequences walk up out of `/var/www/images/` to the filesystem root, so it reads `/etc/passwd`. The input is trusted as a path component when it should have been treated as untrusted data.

## Mitigation

The strongest fix is to **not pass user input into filesystem APIs at all** — for example, map an identifier to a known file instead of accepting a filename:

```python
# Unsafe: user input becomes part of the path
open("/var/www/images/" + filename, "rb")

# Safer: look the file up by an ID you control; user never supplies a path
FILES = {"14": "sun.jpg", "15": "team.jpg"}
open(os.path.join(IMAGE_DIR, FILES[image_id]), "rb")
```

If you must accept a filename, validate it after canonicalising the full path: resolve it (e.g. `os.path.realpath`) and confirm the result still starts with the intended base directory, and reject any input containing `../` or absolute paths.

## Key takeaways

- Any parameter that ends up as a file path is a path traversal candidate; `../` sequences let you escape the intended directory.
- `/etc/passwd` is the classic proof-of-concept target on Linux because it's world-readable and always present.
- Burp hides image responses in HTTP history by default — intercept the request (or unhide images in the filter) to work with it.
- The fix is to keep user input out of file paths: map IDs to files, or canonicalise and confine the path to a base directory.
