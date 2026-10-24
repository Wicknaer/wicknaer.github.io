---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "SQL injection: querying the database version on Oracle"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's UNION-based SQL injection lab: confirming two text columns and reading the Oracle version banner from v$version."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-24 12:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, sql-injection, union, oracle, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm SQL injection yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/sql-injection-cover.webp
  alt: "SQL injection: querying the database version on Oracle — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-26 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/sqli-oracle-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (sqli-oracle-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```sql ... ```  (diller: http, bash, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

This is the first **UNION attack** in the series. A `UNION SELECT` lets us bolt our own query onto the application's and have its rows appear in the normal output — but only if two rules are met: our `SELECT` must return the **same number of columns**, and the column we put our data in must hold a **compatible type**.

So every UNION attack starts the same way: figure out the column count, find a column that accepts text, then select whatever we want. Here the target is the database version string, and the database is **Oracle** — which has two quirks worth knowing: its version lives in a view called `v$version`, and every `SELECT` *must* read from a table, so we append `FROM dual` (a built-in dummy table) whenever we aren't selecting from a real one.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The product category filter is vulnerable to SQL injection. The task is to use a UNION attack to retrieve and display the database version string.

## Recon

The shop's category filter is the injection point — the same `GET /filter?category=...` endpoint as the earlier SQLi labs. The lab banner even hands us the target: it wants the Oracle version strings displayed.

![The shop home page with the lab hint](/posts/images/sqli-oracle-shop.png "The lab banner asks us to retrieve the Oracle version strings via the category filter")

![The normal filter request in Burp](/posts/images/sqli-oracle-request.webp "The category filter request — our injection point — returns the product list")

## Exploitation

Catch the filter request in **Proxy > Intercept** so we can edit the `category` value before it reaches the server.

![Burp's Intercept is on](/posts/images/sqli-oracle-intercept.png "Interception enabled, holding the request so we can inject into the category value")

### Step 1 — confirm the columns

A UNION needs the right column count and a text-friendly column. We can confirm both at once by selecting two string literals from `dual`:

```sql
' UNION SELECT 'abc','def' FROM dual--
```

![Testing two text columns with FROM dual](/posts/images/sqli-oracle-columns.webp "' UNION SELECT 'abc','def' FROM dual-- confirms two columns, both accepting text")

It works, so the query returns **two** columns and **both** accept text. (On Oracle, note the mandatory `FROM dual` — without a `FROM`, the `SELECT` is a syntax error.)

### Step 2 — read the version

Now swap the literals for the Oracle version view. The banner lives in `v$version`, so select `BANNER` into the first column and pad the second with `NULL`:

```sql
' UNION SELECT BANNER, NULL FROM v$version--
```

![The version query payload in Burp](/posts/images/sqli-oracle-payload.webp "' UNION SELECT BANNER, NULL FROM v$version-- reads the Oracle version banner")

The response now lists the Oracle version banners alongside the products, and the lab is solved:

![The Oracle version banners displayed, lab solved](/posts/images/sqli-oracle-result.png "The database version strings (Oracle Database 11g Express Edition 11.2.0.2.0, etc.) appear in the output")

> Version queries differ per database — handy to keep in mind, because the next lab targets MySQL/Microsoft:
> - **Oracle:** `SELECT banner FROM v$version` (needs `FROM dual` for literals)
> - **MySQL / Microsoft:** `SELECT @@version`
> - **PostgreSQL:** `SELECT version()`
{: .note}

## Root cause

The category value is concatenated into the query, so a `'` lets us close the string and append a `UNION SELECT`:

```sql
-- Vulnerable: category is pasted into the query
"SELECT name, description FROM products WHERE category = '" + category + "' AND released = 1"
```

With our payload the query becomes two combined selects — the product rows plus our `v$version` rows — and the application prints both. Because the output reflects whatever rows come back, the UNION'd data (the version banner) is shown directly.

## Mitigation

The fix is the same for every SQL injection: **parameterized queries**, so input is bound as data and can never introduce a `UNION` or close a string literal.

```sql
-- Safer: the value is bound, so ' UNION SELECT ... is just a category name
SELECT name, description FROM products WHERE category = ? AND released = 1
```

As defence in depth, run the application's database account with least privilege so it can't read system views like `v$version` in the first place.

## Key takeaways

- Every UNION attack follows the same order: **find the column count → find a text column → select your data.**
- Oracle specifics: the version is in `v$version`, and every `SELECT` needs a `FROM` — use `FROM dual` for literals.
- `' UNION SELECT 'abc','def' FROM dual--` is a neat one-shot check: it confirms the column count *and* that the columns accept text.
- The fix is parameterized queries, plus least-privilege DB accounts so system views aren't readable.
