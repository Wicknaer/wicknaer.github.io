---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "Information disclosure in error messages"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's information disclosure lab: triggering a stack trace with invalid input to leak the application's framework version."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-21 16:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, information-disclosure, burp-suite, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm information disclosure yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/information-disclosure-cover.webp
  alt: "Information disclosure in error messages — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-23 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/infoerr-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (infoerr-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, python, sql, text, java)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

Information disclosure is when an application reveals data that should stay private — not always user data, but often technical details that help an attacker: internal file paths, server software, source code, or framework versions. One of the most common sources is **verbose error messages**. When an unexpected input makes the application throw, a misconfigured server may return the full stack trace instead of a generic error page.

This lab leaks exactly that: feeding the product page a value it can't parse produces a stack trace that names the framework and its version.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The application discloses sensitive information in error messages. The task is to find and submit the version of the framework the application is using.

## Recon

The application is the usual shop. Each product has a page reached by a numeric `productId`.

![The shop home page](/posts/images/infoerr-shop.webp "The lab application, listing products")

![A product page](/posts/images/infoerr-product.webp "Product pages are addressed by a numeric productId")

A normal request, `GET /product?productId=1`, returns the product page with a `200 OK` — nothing unusual:

![The normal product request](/posts/images/infoerr-normal.webp "A valid productId returns the product page normally")

The interesting part is that `productId` is clearly meant to be a number. What happens if it isn't one?

## Exploitation

Send the product request to Repeater and replace the numeric `productId` with a non-numeric value, such as `blablabla`.

> In Burp, send the request to Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd>, change the `productId` value, and hit **Send** to see the error response.
{: .tip}

```http
GET /product?productId=blablabla HTTP/2
Host: LAB-ID.web-security-academy.net
```

The application tries to parse the value as an integer, fails, and returns a `500 Internal Server Error` with a full Java stack trace. At the very bottom of that trace it prints the framework and version:

![The stack trace disclosing the framework version](/posts/images/infoerr-result.webp "An invalid productId throws a NumberFormatException; the stack trace ends with the framework version, Apache Struts 2 2.3.31")

The trace starts with `java.lang.NumberFormatException: For input string: "blablabla"` and ends with `Apache Struts 2 2.3.31`. Submitting that version solves the lab.

## Root cause

The product handler converts `productId` straight to an integer with no validation and no exception handling, and the server is configured to return detailed errors:

```java
// Vulnerable: unvalidated input parsed directly; exceptions bubble up to a verbose error page
int id = Integer.parseInt(request.getParameter("productId"));
Product product = productService.get(id);
```

When `productId` isn't numeric, `Integer.parseInt` throws a `NumberFormatException`. Because nothing catches it and the server shows full stack traces, the response exposes the internal exception chain — and crucially the framework version string, `Apache Struts 2 2.3.31`. That version is a gift to an attacker: they can now look up known vulnerabilities for that exact release.

## Mitigation

Error handling and error *display* are two separate problems, and both need fixing:

- **Never return stack traces to clients in production.** Configure the framework/web server to show a generic error page and log the details server-side instead.
- **Validate and handle input.** Check that `productId` is an integer before using it, and catch parsing errors to return a clean `400`/`404` rather than a `500` with a trace.

```java
// Safer: validate, handle the error, and never leak internals
if (!productId.matches("\\d+")) {
    return notFound();              // clean response, no stack trace
}
int id = Integer.parseInt(productId);
```

Keeping frameworks patched and up to date matters too — but the first line of defence is simply not telling attackers which version you run.

## Key takeaways

- Verbose error messages are a classic information disclosure source; a single unparseable value can reveal the whole stack.
- A leaked framework version (here `Apache Struts 2 2.3.31`) lets an attacker search for known exploits against that exact release.
- Fix it on two fronts: suppress detailed errors in production (generic page + server-side logging) and validate/handle input so it never throws in the first place.
