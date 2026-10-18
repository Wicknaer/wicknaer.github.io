---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
# ============================================================================

title: "OS command injection: simple case"      # Yazı başlığı (tırnak içinde)
description: "Walkthrough of PortSwigger's simple OS command injection lab: spotting the stock-check parameter and running whoami on the server."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-11 20:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, os-command-injection, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli (İSTEĞE BAĞLI) ------------------------------------------
# Görseli proje kökündeki posts/images/ klasörüne koy,
# path satırını o görselin adıyla güncelle.
# Önerilen boyut 1200x630. PNG/JPG kullan (LinkedIn SVG önizlemesi göstermez).
image:
  path: /posts/images/OS_command_injection.png
  alt: "OS command injection, simple case — lab cover"

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

     GÖRSEL:   ![alt metin](/posts/images/simple-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, time-delays-request.png), yoksa çakışır
               - Lab ID, session cookie gibi değerleri görsellerde karart

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
                | Payload | Sonuç |
                |---|---|
                | `| whoami` | peter |
========================================================================== -->

## Overview

OS command injection (also called shell injection) happens when a web application builds an operating-system command out of user input and hands it to a system shell without proper sanitisation. If an attacker can smuggle shell metacharacters into that input, the shell treats them as syntax rather than data, and any command they append runs with the privileges of the web application.

This first lab is the simplest possible case: the injected command's output comes straight back in the HTTP response, so we can see the result immediately.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Running these payloads against anything else is illegal.
{: .warn}

## The lab

**Goal:** The application has a "Check stock" feature that runs a shell command on the server. The task is to exploit the vulnerability to execute the `whoami` command and retrieve the name of the current user.

## Recon

The lab is a shopping site. Any product page has a stock checker that asks for a location and returns how many units are available.

![The shop home page](/posts/images/simple-shop.webp "The vulnerable shopping application")

Opening a product and scrolling down reveals the feature we care about: a store/location dropdown next to a **Check stock** button.

![Product page with the stock checker](/posts/images/simple-product.webp "Each product exposes a Check stock feature")

![The location dropdown and Check stock button](/posts/images/simple-check-stock.png "Picking a store and checking stock sends a request to the server")

Clicking **Check stock** sends a `POST` request to `/product/stock` with two parameters, `productId` and `storeId`. With normal input (`storeId=1`) the server simply returns a number — the stock count.

![The original request and its stock-count response](/posts/images/simple-request-normal.webp "A normal stock check: storeId=1 returns the stock number 62")

The returned value isn't echoed HTML or a database lookup result — it's the raw output of a command line tool. That strongly suggests the `storeId` value is being passed into a shell command on the server (something like a stock-report script). If that value isn't sanitised, we can break out of the intended argument and append our own command.

## Exploitation

Right-click the stock-check request in the proxy history and send it to Repeater so we can tamper with it freely.

> In Burp, select the request and press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it straight to Repeater, then <kbd>Ctrl</kbd> + <kbd>Space</kbd> (or **Send**) to replay it after each edit.
{: .tip}

In Repeater, change the `storeId` value from `1` to `1|whoami`. The pipe (`|`) is a shell metacharacter: the server runs `whoami` as part of the command line, and its output is returned in place of the stock number.

```http
POST /product/stock HTTP/2
Host: LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded

productId=1&storeId=1|whoami
```

The response no longer contains a stock count. Instead it returns the output of `whoami` — the name of the OS user the web server runs as:

![The injected whoami command returning the server user](/posts/images/simple-exploit.webp "Injecting whoami through storeId returns the current user, confirming command execution")

The command executed and the lab is solved. The same injection point would run any command available to that shell user.

## Root cause

Behind the stock checker, the server almost certainly builds a command string by concatenating user input directly into it, then runs it through a shell:

```php
// Vulnerable: storeId is concatenated straight into a shell command
$output = shell_exec("stockreport.sh " . $productId . " " . $storeId);
echo $output;
```

When `storeId` is `1`, the shell runs `stockreport.sh 1 1`. When it is `1|whoami`, the shell sees a pipe and runs a second command, and the output of `whoami` is what gets returned. The vulnerability exists because the input is treated as part of the command *syntax*, not as inert data.

Characters like `|`, `&`, `;`, `&&`, `||`, a newline, and `$(...)` / backticks are all shell metacharacters that let an attacker chain or substitute commands.

## Mitigation

The most robust fix is to **avoid calling the shell with user input altogether**. Where possible, use a language API that does the job natively instead of shelling out. If you must call an external binary, pass the arguments as a separate list so no shell is involved and the input can never be interpreted as syntax:

```python
# Unsafe: user input goes to a shell, which interprets metacharacters
os.system("stockreport.sh " + product_id + " " + store_id)

# Safer: no shell (shell=False), arguments passed as a list, input stays data
subprocess.run(["stockreport.sh", product_id, store_id], shell=False)
```

As defence in depth, validate input against a strict allowlist — here `productId` and `storeId` should only ever be integers, so reject anything that isn't.

## Key takeaways

- When a response contains the raw output of a command line tool, suspect that user input is reaching a shell.
- A single shell metacharacter such as `|` is enough to turn a harmless parameter into arbitrary command execution.
- The fix is to keep user input out of the shell entirely — pass arguments as a list, not as a concatenated string — and to validate input against a strict allowlist.
