---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
# ============================================================================

title: "Blind OS command injection with output redirection"   # Yazı başlığı (tırnak içinde)
description: "Exploiting blind OS command injection on PortSwigger's lab by redirecting command output to a readable file in the web root."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-13 20:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, os-command-injection, blind, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli (İSTEĞE BAĞLI) ------------------------------------------
# Görseli proje kökündeki posts/images/ klasörüne koy,
# path satırını o görselin adıyla güncelle.
# Önerilen boyut 1200x630. PNG/JPG kullan (LinkedIn SVG önizlemesi göstermez).
image:
  path: /posts/images/OS_command_injection.png
  alt: "Blind OS command injection with output redirection — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# Yazıyı sonradan güncellersen alttaki satırın # işaretini kaldır;
# üst bilgide "Updated" tarihi olarak görünür.
# last_modified_at: 2026-10-15 18:00:00 +0300
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

     GÖRSEL:   ![alt metin](/posts/images/output-redirection-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, time-delays-request.png), yoksa çakışır
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

     TABLO:
                | Adım | Komut |
                |---|---|
                | Çıktıyı yaz | whoami > out.txt |
========================================================================== -->

## Overview

This is another *blind* OS command injection: the injected command runs, but its output never appears in the response. Causing a time delay proves execution, but it doesn't let us *read* a command's output.

Output redirection solves that. If the server has a directory that is both writable by the web user and reachable over HTTP, we can redirect a command's output into a file there, then simply request that file in the browser and read the result.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Running these payloads against anything else is illegal.
{: .warn}

## The lab

**Goal:** The feedback function runs a shell command containing the submitted details but returns nothing. The task is to execute `whoami` and retrieve the output by redirecting it to a file we can then read.

## Recon

The application is the same shop, with the same **Submit feedback** form that sends a `POST` to `/feedback/submit`.

![The shop home page](/posts/images/output-redirection-shop.webp "The lab application with a feedback feature")

![The feedback form filled with test data](/posts/images/output-redirection-form.png "The feedback form sends name, email, subject and message to the server")

As before, a normal submission returns an empty JSON object — no output, so the injection is blind.

![The normal feedback request and its empty response](/posts/images/output-redirection-normal.webp "A normal submission returns an empty JSON object, confirming the blind condition")

The important difference in this lab is how product images are served. Each product page loads its picture through an `/image?filename=...` endpoint rather than a static path.

![A product page served by the application](/posts/images/output-redirection-product.webp "Products display an image loaded through the server")

Requesting that endpoint directly confirms it reads files from a folder on the server and returns their contents:

![The image endpoint serving a file by name](/posts/images/output-redirection-image-endpoint.webp "The /image endpoint returns a file from the server by its filename")

That folder — `/var/www/images/` — is served over HTTP, and the web user can write to it. So if we redirect a command's output into a file there, we can read it back through `/image?filename=...`.

## Exploitation

Send the feedback request to Repeater and inject into the vulnerable `email` field, exactly as in the time-delay lab.

> In Burp, select the request and press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it to Repeater, then edit the `email` value and replay with **Send**.
{: .tip}

Instead of a delay, inject a command that writes the output of `whoami` into a file inside the writable image folder:

```http
POST /feedback/submit HTTP/2
Host: LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded

csrf=CSRF-TOKEN&name=Test&email=||whoami>/var/www/images/output.txt||&subject=Command+Injection&message=PWNED
```

The injected value decodes to `||whoami>/var/www/images/output.txt||`. The leading `||` makes the shell run `whoami` (the original command before it produces no useful status), `>` redirects that command's output into `output.txt`, and the trailing `||` absorbs the rest of the original command. The response is an empty object as usual — nothing to see here yet.

![The injected command writing whoami output to a file](/posts/images/output-redirection-write.webp "The injected command redirects whoami output into a file in the writable image folder")

Now read the file back through the image endpoint by requesting `/image?filename=output.txt` in the browser. The server returns the contents of our file — the output of `whoami`:

![Reading the output file through the image endpoint](/posts/images/output-redirection-read.png "Requesting the output file through the image endpoint reveals the whoami result")

The username is returned, so the command executed and we recovered its output. The lab is solved.

## Root cause

The feedback value reaches a shell, as in every command injection, and the application still discards the command's own output. What makes this exploitable *for reading* is a second weakness: a directory that is both web-writable and web-served.

```php
// Vulnerable: email is concatenated into a shell command
shell_exec("/usr/bin/report_feedback '" . $email . "' '" . $subject . "'");

// Separately risky: the image endpoint returns any file from a writable folder
readfile("/var/www/images/" . $_GET["filename"]);
```

The injection lets us run commands; the image endpoint lets us read any file we can drop into `/var/www/images/`. Combining the two turns a blind bug into a readable one.

## Mitigation

The primary fix is unchanged: keep user input out of the shell by passing arguments as a list instead of building a command string.

```python
# Unsafe: user input goes to a shell, which interprets metacharacters
os.system("report_feedback '" + email + "' '" + subject + "'")

# Safer: no shell (shell=False), arguments passed as a list, input stays data
subprocess.run(["report_feedback", email, subject], shell=False)
```

The output-redirection angle adds two more lessons: application processes shouldn't have write access to web-served directories, and file-serving endpoints must restrict which files they return (resolve and confine the path, use an allowlist of filenames) so a dropped file can't simply be requested back.

## Key takeaways

- When a time delay confirms blind injection but you need the actual output, look for a directory that is both writable and reachable over HTTP.
- Redirect command output into a file there with `>`, then read it back through the file-serving endpoint.
- Two weaknesses combine here: command injection plus an over-permissive, web-writable, web-served folder.
- The mitigations are independent: pass arguments as a list to avoid the shell, and never let application processes write into directories the web server will serve.
