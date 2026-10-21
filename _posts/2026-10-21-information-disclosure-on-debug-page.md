---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "Information disclosure on a debug page"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's information disclosure lab: finding a leftover phpinfo debug page and reading the SECRET_KEY environment variable."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 17:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, information-disclosure, content-discovery, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm information disclosure yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/information-disclosure-cover.webp
  alt: "Information disclosure on a debug page — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/debugpage-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (debugpage-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, python, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

Debug and diagnostic pages are great during development and dangerous in production. A page like PHP's `phpinfo()` dumps almost everything about the environment — PHP version, loaded modules, file paths, and, critically, **environment variables**. If secrets are stored in the environment, a forgotten `phpinfo` page hands them straight to anyone who finds it.

This lab leaves exactly such a page accessible. The job is to locate it and read a secret out of it.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The application exposes a debug page that discloses sensitive information. The task is to find it and submit the value of the `SECRET_KEY` environment variable.

## Recon

The application is the usual shop, but the debug page isn't linked anywhere in the UI.

![The shop home page](/posts/images/debugpage-shop.webp "The lab application; the debug page is not linked from here")

So we look for hidden content. A directory brute-forcer such as **feroxbuster** against the site quickly turns up a non-obvious path, `/cgi-bin`:

```bash
feroxbuster -u https://LAB-ID.web-security-academy.net/ --status-codes 200
```

![feroxbuster discovering the /cgi-bin path](/posts/images/debugpage-ferox.webp "Content discovery surfaces the /cgi-bin directory")

> PortSwigger's intended route is to spot a link to the debug page in an HTML comment in the page source. Content discovery is a reliable alternative and the more realistic habit — always enumerate for paths the UI never advertises.
{: .tip}

Browsing to `/cgi-bin` shows a directory listing with a single file, `phpinfo.php`:

![The /cgi-bin directory listing](/posts/images/debugpage-cgi-index.png "The /cgi-bin directory lists phpinfo.php")

## Exploitation

Open `/cgi-bin/phpinfo.php`. It's a full PHP info page — version, build, configuration, the lot:

![The phpinfo debug page](/posts/images/debugpage-phpinfo.webp "The phpinfo.php page dumps the full PHP environment")

Scroll down to the **Environment** section, which lists every environment variable the process can see. Among them is `SECRET_KEY`:

![The SECRET_KEY environment variable disclosed by phpinfo](/posts/images/debugpage-secret.png "The Environment table in phpinfo discloses the SECRET_KEY value, along with USER and other variables")

Submitting that `SECRET_KEY` value solves the lab.

## Root cause

Two separate mistakes combine here:

1. A **debug page was left reachable in production.** `phpinfo()` exists to help developers; it has no business being deployed on a live site, and it isn't access-controlled.
2. A **secret was stored in an environment variable that the page prints.** `phpinfo` deliberately lists environment variables, so any secret in the environment is exposed the moment the page is reachable.

```php
// phpinfo.php — fine locally, a disaster in production
<?php phpinfo(); ?>
```

On top of that, directory listing is enabled on `/cgi-bin`, which made the page trivial to find even without the intended HTML-comment hint.

## Mitigation

- **Remove debug/diagnostic pages from production builds** (`phpinfo`, status dashboards, test endpoints). If one is ever needed, put it behind authentication and network restrictions.
- **Disable directory listing** so unlinked files can't be enumerated by browsing.
- **Don't expose secrets through pages that print the environment.** Even with env-based config, ensure diagnostic output can't be served to users, and prefer a secrets manager over plain environment variables for sensitive values.

## Key takeaways

- A leftover `phpinfo` (or any debug) page is a one-stop information leak: versions, paths, and every environment variable.
- Secrets in environment variables are only as safe as the pages that can read the environment — a reachable `phpinfo` exposes them directly.
- Enumerate for unlinked paths (content discovery); the UI rarely shows you everything that's deployed.
- Fix it by stripping debug pages from production, disabling directory listing, and keeping secrets out of anything that can be served to a client.
