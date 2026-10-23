---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 14:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "SQL injection allowing login bypass"    # Yazı başlığı (tırnak içinde)
description: "PortSwigger's SQL injection lab: commenting out the password check in the login query to sign in as administrator without a password."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-23 14:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, sql-injection, authentication, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm SQL injection yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/sql-injection-cover.webp
  alt: "SQL injection allowing login bypass — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-25 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/sqli-login-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (sqli-login-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```sql ... ```  (diller: http, bash, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

A login form usually checks two things at once: that the username exists and that the password matches. If the back-end builds that check as a single SQL query by pasting the inputs into a string, an attacker can **comment out the password half of the condition** and authenticate as any user they can name — no password required.

This lab is that attack in its purest form. We know the username (`administrator`); we just need the query to stop caring about the password.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The login function is vulnerable to SQL injection. The task is to log in as the `administrator` user without knowing the password.

## Recon

The shop has a login page reached from **My account**.

![The shop home page](/posts/images/sqli-login-shop.webp "The lab application, with a My account / login link")

![The login form](/posts/images/sqli-login-form.png "A standard username and password login form")

Submitting the form sends a `POST /login` with `username` and `password`. Both values almost certainly go into a single SQL query that checks the credentials together — which is exactly what makes a login bypass possible.

## Exploitation

In the username field, enter `administrator'--` and put anything in the password field.

> You can type the payload straight into the form, or catch the `POST /login` request in **Proxy > Intercept** (or Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd>) and set `username=administrator'--`. The password can be any value — it's about to be ignored.
{: .tip}

![Entering the payload in the login form](/posts/images/sqli-login-attempt.png "Username set to administrator'-- with an arbitrary password")

![The injected login request in Burp](/posts/images/sqli-login-intercept.webp "The POST /login request carries username=administrator'-- ; the Inspector shows the payload")

Submitting it logs us straight in as **administrator**, and the lab is solved:

![Logged in as administrator, lab solved](/posts/images/sqli-login-result.png "The account page confirms we're logged in as administrator")

Here's the mechanism. The back-end builds a query like this:

```sql
SELECT * FROM users WHERE username = 'administrator' AND password = 'blablabla'
```

Our username value ends the string early and comments out the rest:

```sql
SELECT * FROM users WHERE username = 'administrator'--' AND password = 'blablabla'
```

The `'` closes the username literal, and `--` turns `' AND password = '...'` into a comment. The query now only asks "is there a user named administrator?" — which is true — so the application logs us in as that user without ever checking the password.

## Root cause

The credential check is one query built by concatenating the inputs:

```sql
-- Vulnerable: username and password are pasted straight into the query
"SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
```

Because the username isn't separated from the SQL structure, a single quote plus `--` lets the attacker drop the password condition entirely. The application treats "did a row come back?" as "are the credentials valid?", so commenting out the password check is enough to authenticate.

## Mitigation

- **Use parameterized queries** so the inputs can never alter the query's structure:

```sql
-- Safer: values are bound as parameters, not concatenated
SELECT * FROM users WHERE username = ? AND password = ?
```

- **Don't verify passwords in the SQL query.** Look the user up by username, then compare the submitted password against a stored **hash** (bcrypt/argon2) in application code. That way the password never participates in the SQL condition at all, and a commented-out clause reveals nothing.

## Key takeaways

- A login that checks username and password in one concatenated query can be bypassed by commenting out the password half.
- `administrator'--` ends the username string and turns the password check into a comment — the query returns the admin row, so the app logs you in.
- Fix it with parameterized queries, and verify passwords against a stored hash in code rather than inside the SQL `WHERE` clause.
