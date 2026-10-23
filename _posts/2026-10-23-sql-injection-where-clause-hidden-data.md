---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 13:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "SQL injection in a WHERE clause to retrieve hidden data"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's first SQL injection lab: injecting into a product category filter to break the WHERE clause and reveal unreleased products."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-23 13:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, sql-injection, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm SQL injection yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/sql-injection-cover.webp
  alt: "SQL injection in a WHERE clause to retrieve hidden data — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-25 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/sqli-where-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (sqli-where-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```sql ... ```  (diller: http, bash, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

SQL injection happens when user input is placed into a SQL query without proper handling, letting an attacker change the query's meaning. This first lab is the gentlest possible case: a product filter builds a `WHERE` clause from the category you pick, and by injecting into it we can rewrite the condition so the database returns rows it was never meant to show.

The shop only displays *released* products. The query quietly adds `AND released = 1` to hide the rest. Our goal is to break out of the intended condition and make that filter irrelevant.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The product category filter is vulnerable to SQL injection. The task is to perform an attack that causes the application to display details of **all** products in any category, both released and unreleased.

## Recon

The shop home page has a category filter — All, Clothing, Corporate gifts, Gifts, Tech gifts.

![The shop home page with category filters](/posts/images/sqli-where-shop.webp "The product category filter is the injection point")

Picking a category sends a `GET /filter?category=...` request and returns that category's products:

![Filtering by a normal category](/posts/images/sqli-where-normal.webp "Selecting a category shows its released products")

In Burp, that request is plain `GET /filter?category=Clothing,shoes and accessories`:

![The filter request in Burp](/posts/images/sqli-where-request.webp "The category value is passed straight to the server in the query string")

The category string almost certainly lands inside a SQL `WHERE` clause. If it does, we can close the string and inject our own logic.

## Exploitation

Intercept the filter request (or send it to Repeater) and change the `category` value to `' OR 1=1--`.

> In Burp, catch the request in **Proxy > Intercept** or press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it to Repeater. In the URL the payload is written `'+OR+1=1--`, which decodes to `' OR 1=1--`.
{: .tip}

![The injected payload in Intercept](/posts/images/sqli-where-intercept.webp "Injecting category=' OR 1=1-- into the filter request")

Forwarding it makes the application display **every** product — including the hidden, unreleased ones — and the lab is solved:

![All products displayed, lab solved](/posts/images/sqli-where-result.webp "The payload returns all products regardless of release status, solving the lab")

Here's why. The back-end builds a query roughly like this:

```sql
SELECT * FROM products WHERE category = 'Gifts' AND released = 1
```

Our input replaces the category value, so the query becomes:

```sql
SELECT * FROM products WHERE category = '' OR 1=1--' AND released = 1
```

Two things happen: `OR 1=1` makes the `WHERE` condition true for **every** row, and `--` starts a SQL comment that discards the rest of the line — including `AND released = 1`. With the release check commented out, all products are returned.

## Root cause

The query is built by concatenating the raw category value into the SQL string:

```sql
-- Vulnerable: user input is placed directly inside the query
"SELECT * FROM products WHERE category = '" + category + "' AND released = 1"
```

Because the input isn't separated from the query structure, a single quote lets the attacker end the string literal and append arbitrary SQL. The application trusts the category as data, but the database parses it as part of the command.

## Mitigation

Use **parameterized queries** (prepared statements) so user input is always treated as data, never as SQL syntax:

```sql
-- Safer: the value is bound as a parameter, not concatenated
SELECT * FROM products WHERE category = ? AND released = 1
```

The database then compares `category` against the literal string the user sent — quotes and all — so `' OR 1=1--` is just an odd category name that matches nothing, not executable SQL. Avoid building queries by string concatenation, and apply least-privilege database accounts as defence in depth.

## Key takeaways

- Any user input that reaches a SQL query is a potential injection point; a filter value is a classic one.
- `' OR 1=1--` is the canonical proof: `OR 1=1` makes the condition always true, and `--` comments out whatever follows (here the `AND released = 1` check).
- The fix is parameterized queries — bind input as data so it can never change the query's structure.
