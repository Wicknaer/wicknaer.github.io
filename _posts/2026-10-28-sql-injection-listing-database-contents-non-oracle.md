---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 13:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "SQL injection: listing the database contents on non-Oracle databases"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's UNION SQL injection lab: enumerating tables and columns through information_schema, then dumping admin credentials to log in."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-28 13:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, sql-injection, union, information-schema, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm SQL injection yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/sql-injection-cover.webp
  alt: "SQL injection: listing the database contents on non-Oracle databases — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-30 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/sqli-contents-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (sqli-contents-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```sql ... ```  (diller: http, bash, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

The earlier UNION labs read a single fixed value — the database version. This one is the first **chain**: we don't know the credentials, we don't even know the table or column names, so we have to *ask the database about itself* first, and only then read the data.

The tool for that is **`information_schema`** — a set of views every standard SQL database (MySQL, Microsoft, PostgreSQL) exposes that describes its own structure. `information_schema.tables` lists every table; `information_schema.columns` lists every column. We use the UNION technique we already know, but point it at these catalog views to discover where the user credentials live, then dump them.

The lab banner says the database is **not Oracle**, which simply means `information_schema` exists (Oracle uses different system views) and literals need no `FROM dual`.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The product category filter is vulnerable to SQL injection. Retrieve the usernames and passwords from the database, then log in as the `administrator` user.

![The lab start page](/posts/images/sqli-contents-lab.png "The SQL injection, listing database contents lab, not yet solved")

## Recon

Same injection point as the whole series — the `GET /filter?category=...` endpoint. We intercept the normal request so we can edit the `category` value before it's sent.

![The normal filter request in Burp](/posts/images/sqli-contents-request.webp "The category filter request is our injection point")

## Exploitation

The plan is a four-link chain: **count the columns → find the users table → find its column names → dump the credentials.**

### Step 1 — confirm the columns

As always, start by confirming the column count and that both columns accept text. No `FROM` is needed on a non-Oracle database:

```sql
' UNION SELECT 'abc','def'--
```

![Two text columns confirmed](/posts/images/sqli-contents-columns.png "' UNION SELECT 'abc','def'-- returns abc and def — two text columns")

![The columns payload in Burp](/posts/images/sqli-contents-columns-burp.webp "The abc/def payload URL-encoded in the category parameter")

### Step 2 — find the users table

We don't know the table name, so ask `information_schema.tables` for every table in the database. Put the table name in the first column and pad the second with `NULL`:

```sql
' UNION SELECT table_name, NULL FROM information_schema.tables--
```

Scanning the output, one table name stands out among the system tables — a randomised `users_` table:

![The table list from information_schema](/posts/images/sqli-contents-tables.png "The results list every table; users_dvzvsv is the credentials table")

> The table has a random suffix (`users_dvzvsv`) on purpose — PortSwigger randomises it per lab so you can't hard-code a guess. This is exactly why you enumerate `information_schema` instead of assuming the table is called `users`.
{: .note}

### Step 3 — find the column names

Now ask `information_schema.columns` for the columns of *that* specific table, filtering with a `WHERE` clause:

```sql
' UNION SELECT column_name, NULL FROM information_schema.columns WHERE table_name='users_dvzvsv'--
```

The table has three columns — and the username/password ones also carry random suffixes:

![The column names for the users table](/posts/images/sqli-contents-columnnames.png "The columns are email, username_fodrgr and password_oeciar")

![The column-name payload in Burp](/posts/images/sqli-contents-columnnames-burp.webp "Querying information_schema.columns filtered to the users table")

### Step 4 — dump the credentials

We now know the table and the exact column names. Select the username and password columns straight out of the real table:

```sql
' UNION SELECT username_fodrgr, password_oeciar FROM users_dvzvsv--
```

Every user's credentials come back in the output, administrator included:

![The dumped usernames and passwords](/posts/images/sqli-contents-creds.png "administrator, wiener and carlos with their plaintext passwords")

![The credential-dump payload in Burp](/posts/images/sqli-contents-creds-burp.webp "Selecting the real username and password columns from the users table")

### Step 5 — log in

Take the `administrator` password from the output and log in through the normal login form:

![Logging in as administrator](/posts/images/sqli-contents-login.png "Signing in with the stolen administrator credentials")

We're in as administrator, and the lab is solved:

![Logged in as administrator, lab solved](/posts/images/sqli-contents-result.png "The My Account page confirms we're logged in as administrator")

## Root cause

Same flaw as the rest of the series — the category value is concatenated into the query, so a `'` closes the string and lets us append a `UNION SELECT`:

```sql
-- Vulnerable: category is pasted into the query
"SELECT name, description FROM products WHERE category = '" + category + "' AND released = 1"
```

What's new here is only *what we select*. Because the application reflects whatever rows the query returns, we can point the UNION at the database's own catalog (`information_schema`) to map its structure, then at the real user table to read the secrets — all without any prior knowledge of the schema.

## Mitigation

- **Parameterized queries** remain the core fix — bound input can never introduce a `UNION` or close a string, so none of this chain is possible.

```sql
-- Safer: the value is bound, not concatenated
SELECT name, description FROM products WHERE category = ? AND released = 1
```

- **Never store passwords in plaintext.** Even with a SQL injection, dumping the table should yield only salted password *hashes* (bcrypt/argon2), which can't be replayed into the login form.
- **Least privilege:** the application's database account shouldn't be able to read `information_schema` or unrelated tables in the first place.

## Key takeaways

- When you don't know the schema, enumerate it: `information_schema.tables` for table names, `information_schema.columns` for column names.
- This is a chain, not a single trick — column count → table name → column names → data. Each step feeds the next.
- Lab identifiers are randomised (`users_dvzvsv`, `password_oeciar`) precisely so you enumerate rather than guess.
- Plaintext passwords turned a data leak into full account takeover; hashing and least-privilege would have blunted both.
