---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 13:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "SQL injection: querying the version on MySQL and Microsoft"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's UNION SQL injection lab for MySQL/Microsoft: reading @@version, and why the comment is # with no FROM dual needed."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-24 13:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, sql-injection, union, mysql, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm SQL injection yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/sql-injection-cover.webp
  alt: "SQL injection: querying the version on MySQL and Microsoft — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-26 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/sqli-mysql-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (sqli-mysql-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```sql ... ```  (diller: http, bash, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

This is the same UNION attack as the [Oracle version lab](/blog/sql-injection-querying-database-version-oracle/), but against **MySQL / Microsoft** — which changes a couple of details of syntax rather than the idea:

- The version is read from **`@@version`** (works on both MySQL and Microsoft SQL Server).
- The comment character is **`#`** on MySQL (or `-- ` with a trailing space). We'll use `#` here.
- There is **no `FROM dual`** requirement — unlike Oracle, MySQL and Microsoft are happy to `SELECT` literals with no `FROM` clause.

The method is unchanged: confirm the column count and a text column, then select the version.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The product category filter is vulnerable to SQL injection. The task is to use a UNION attack to retrieve and display the database version string. The lab banner names the target version (`8.0.42-0ubuntu0.20.04.1`), confirming it's MySQL.

## Recon

Same injection point as before — the `GET /filter?category=...` endpoint. The banner tells us exactly which string to surface.

![The shop home page with the lab hint](/posts/images/sqli-mysql-shop.png "The banner asks us to retrieve the MySQL version string via the category filter")

![The normal filter request in Burp](/posts/images/sqli-mysql-request.webp "The category filter request is our injection point; the hint names the MySQL version")

## Exploitation

Catch the filter request in **Proxy > Intercept** so we can edit `category` before it's sent.

![Burp's Intercept is on](/posts/images/sqli-mysql-intercept.png "Interception enabled to inject into the category value")

### Step 1 — confirm the columns

Select two string literals to confirm the column count and that both columns accept text. No `FROM` needed here, and we close the statement with `#`:

```sql
' UNION SELECT 'abc','def'#
```

![Two text columns confirmed](/posts/images/sqli-mysql-columns.png "' UNION SELECT 'abc','def'# returns abc and def — two columns, both text")

### Step 2 — read the version

Swap the literals for `@@version` in the first column, padding the second with `NULL`:

```sql
' UNION SELECT @@version, NULL#
```

![The version query payload in Burp](/posts/images/sqli-mysql-payload.webp "' UNION SELECT @@version, NULL# reads the MySQL version")

The response shows the MySQL version string, and the lab is solved:

![The MySQL version displayed, lab solved](/posts/images/sqli-mysql-result.png "The version 8.0.42-0ubuntu0.20.04.1 appears in the output")

> Quick comparison with the [Oracle lab](/blog/sql-injection-querying-database-version-oracle/): Oracle needs `SELECT BANNER FROM v$version` (with `FROM dual` for literals); MySQL/Microsoft just use `SELECT @@version` and need no `FROM`. Knowing the per-database syntax is what turns "SQL injection" into "SQL injection against *this* database".
{: .note}

## Root cause

As before, the category value is concatenated into the query, so a `'` lets us close the string and append a `UNION SELECT`:

```sql
-- Vulnerable: category is pasted into the query
"SELECT name, description FROM products WHERE category = '" + category + "' AND released = 1"
```

Our payload turns it into two combined selects — the products plus our `@@version` row — and the application prints the UNION'd result, so the version is displayed.

## Mitigation

The fix is the same across every database and every SQL injection: **parameterized queries**, so the input is bound as data and can't introduce a `UNION` or a comment.

```sql
-- Safer: the value is bound, not concatenated
SELECT name, description FROM products WHERE category = ? AND released = 1
```

Run the database account with least privilege as defence in depth.

## Key takeaways

- The UNION method is identical across databases — only the syntax changes.
- MySQL/Microsoft: read the version from `@@version`, comment with `#` (or `-- ` with a trailing space), and no `FROM` is required.
- Oracle differs: `v$version` and a mandatory `FROM dual`. Fingerprinting the database first tells you which syntax to use.
- The fix is parameterized queries plus least-privilege database accounts.
