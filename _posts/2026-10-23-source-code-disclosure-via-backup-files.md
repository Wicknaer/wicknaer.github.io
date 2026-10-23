---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 10:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "Source code disclosure via backup files"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's information disclosure lab: finding a .bak backup of a source file served as plain text, leaking the database password."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-23 10:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, information-disclosure, content-discovery, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm information disclosure yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/information-disclosure-cover.webp
  alt: "Source code disclosure via backup files — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-25 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/backup-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (backup-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, java, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

Editors and deployment scripts love to leave copies behind: `file.bak`, `file.old`, `file~`, `file.swp`. When one of those lands in the web root, it can hand an attacker the application's **source code** — and source code gives away far more than any error message: hard-coded credentials, API keys, internal logic, even other vulnerabilities.

This lab leaves a `.bak` copy of a Java source file in a backup directory. Because the server doesn't know how to execute a `.bak` file, it serves the raw text — so we can read the source directly, including the database password.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The application leaks its source code via a backup file. The task is to find it, read the source, and submit the database password hidden inside it.

## Recon

The application is the usual shop, with nothing pointing at a backup directory.

![The shop home page](/posts/images/backup-shop.webp "The lab application; the backup directory is not linked anywhere")

So we enumerate for hidden paths with **feroxbuster**, which turns up a `/backup` directory (and even the file inside it, thanks to link extraction):

```bash
feroxbuster -u https://LAB-ID.web-security-academy.net/ --status-codes 200
```

![feroxbuster discovering the /backup directory and the .bak file](/posts/images/backup-ferox.png "Content discovery surfaces /backup and /backup/ProductTemplate.java.bak")

Browsing to `/backup` confirms it — directory listing is enabled, showing a single file, `ProductTemplate.java.bak`:

![The /backup directory listing](/posts/images/backup-index.png "The /backup directory lists ProductTemplate.java.bak")

> Backup extensions are high-value targets in content discovery. When enumerating, add them to your wordlist or use a tool mode that appends `.bak`, `.old`, `~`, `.txt`, `.zip` to known filenames — a live `app.php` is opaque, but `app.php.bak` is plain text.
{: .tip}

## Exploitation

Open `/backup/ProductTemplate.java.bak`. Because the `.bak` extension isn't mapped to the Java runtime, the server returns the file as plain text instead of executing it — so the full source is right there in the browser:

![The disclosed Java source code with the database password](/posts/images/backup-source.webp "The .bak file is served as text, exposing the source and the hard-coded database password in the connection builder")

Inside `readObject`, the class builds a database connection with hard-coded credentials:

```java
ConnectionBuilder connectionBuilder = ConnectionBuilder.from(
    "org.postgresql.Driver",
    "postgresql",
    "localhost",
    5432,
    "postgres",
    "postgres",
    "<DATABASE_PASSWORD>"          // the password is right here in the source
).withAutoCommit();
```

Submitting that password solves the lab.

> Source disclosure leaks more than secrets. This same file shows the query being built with `String.format("... WHERE id = '%s' ...", id)` — string-concatenated SQL, i.e. a SQL injection waiting to happen. Reading source is reconnaissance for your *next* attack, not just a one-off win.
{: .note}

## Root cause

Several small failures stack up:

- A **backup file was left in the web root.** A deployment or editor produced `ProductTemplate.java.bak` and nobody removed it.
- The **`.bak` extension is served as plain text.** The server executes `.java`/`.jsp` but has no handler for `.bak`, so it returns the raw source instead of running it.
- **Directory listing is enabled** on `/backup`, so the file could be found by browsing.
- **Credentials are hard-coded in source.** The database password lives in the code itself, so reading the source is enough to obtain it.

```text
/backup/ProductTemplate.java.bak   →  served as text/plain  →  source + password exposed
```

## Mitigation

- **Keep backups and temporary files out of the web root.** Build/deploy pipelines should never leave `.bak`, `.old`, `~`, or `.swp` files where the web server can serve them.
- **Deny unknown/backup extensions** at the web-server level, and **disable directory listing**.
- **Never hard-code secrets in source.** Use environment configuration or a secrets manager, so even if source leaks, the credentials don't travel with it.
- Treat source code as sensitive and keep it off the public surface entirely.

## Key takeaways

- Backup and temp extensions (`.bak`, `.old`, `~`, `.swp`) can expose source code because the server serves them as text instead of executing them.
- Leaked source is a goldmine: hard-coded credentials, keys, and clues to other bugs (here, a hard-coded DB password and a string-built SQL query).
- Enumerate with backup extensions appended, and never rely on a file being "unlinked" to keep it secret.
- Fix it by keeping backups out of the web root, disabling listing, denying backup extensions, and keeping secrets out of source.
