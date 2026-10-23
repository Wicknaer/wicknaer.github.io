---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 11:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "Authentication bypass via information disclosure"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's lab: using the TRACE method to reveal a trusted IP-authorization header, then spoofing it to reach a local-only admin panel."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-23 11:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, information-disclosure, burp-suite, access-control, apprentice]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Apprentice                           # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm information disclosure yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/information-disclosure-cover.webp
  alt: "Authentication bypass via information disclosure — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-25 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/authbypass-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (authbypass-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```http ... ```  (diller: http, bash, java, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

Information disclosure isn't always about reading a secret value. Sometimes the leaked detail is about *how the application makes a decision* — and that's enough to walk around a control. In this lab the admin panel is restricted to "local" users, and a debugging HTTP method (`TRACE`) leaks the exact header the server trusts to decide whether you're local. Once we know the header, we just send it ourselves.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The admin panel is only available to local users and discloses the way it checks for this. The task is to bypass that check, reach the admin panel, and delete the user `carlos`.

## Recon

The application is the usual shop, with an `Admin panel` link in the navigation.

![The shop home page](/posts/images/authbypass-shop.webp "The lab application, with an admin panel link")

Browsing to `/admin` doesn't work — it says the panel is restricted:

![The admin panel refusing access](/posts/images/authbypass-admin-blocked.png "/admin responds: Admin interface only available to local users")

In Burp, a plain `GET /admin` confirms it with a `401 Unauthorized`:

![GET /admin returning 401](/posts/images/authbypass-401.webp "A normal request to /admin is rejected with 401 Unauthorized")

So the server somehow decides we're *not* a local user. The question is: based on what?

## Disclosing the trusted header with TRACE

`TRACE` is an HTTP debugging method: the server echoes the exact request it received straight back in the response body. If a front-end proxy added any headers along the way, the echo shows them — including ones the client never sent.

Send a `TRACE /admin` request. The echoed request contains a header we didn't add: `X-Custom-IP-Authorization`, set to our real public IP.

![TRACE revealing the X-Custom-IP-Authorization header](/posts/images/authbypass-trace.webp "TRACE echoes the request and reveals X-Custom-IP-Authorization set to the client's IP")

That's the whole secret. A front-end component stamps every request with `X-Custom-IP-Authorization: <your IP>`, and the back-end uses that header to decide whether you're "local". Since the value is just a header, we can set it to a loopback address and look local.

> `TRACE` is perfect for spotting headers injected by proxies/load balancers. If it's enabled, it hands you the back-end's view of your request — a quick way to discover trusted internal headers you'd otherwise never see.
{: .tip}

## Exploitation

Rather than edit one request at a time, add a Burp **Match and Replace** rule that appends the header to *every* request: set a request-header rule with a blank match and the replacement `X-Custom-IP-Authorization: 127.0.0.1`.

![The Burp Match and Replace rule adding the header](/posts/images/authbypass-match-replace.png "A Match and Replace rule injects X-Custom-IP-Authorization: 127.0.0.1 into every request")

With the loopback address in place, the back-end now treats us as local. Reloading `/admin` loads the admin panel, listing the users `wiener` and `carlos`:

![The admin panel now accessible](/posts/images/authbypass-users.png "With the spoofed header, /admin loads the Users panel showing wiener and carlos")

Click **Delete** next to `carlos`. The panel confirms the deletion and the lab is solved:

![carlos deleted and the lab solved](/posts/images/authbypass-solved.png "Deleting carlos succeeds — User deleted successfully — and the lab is marked solved")

## Root cause

Two mistakes line up:

1. **The server authorises based on a spoofable header.** `X-Custom-IP-Authorization` is meant to be set by a trusted front-end, but the back-end trusts it unconditionally — and anyone who can set the header (once they know its name) can claim to be local.
2. **`TRACE` is enabled and echoes internal headers.** That's the information disclosure: it told us the exact header name to forge. Without it, the header would have been an unknown.

```text
TRACE /admin   →  response echoes "X-Custom-IP-Authorization: <your IP>"
   →  forge "X-Custom-IP-Authorization: 127.0.0.1"
      →  back-end thinks you're local  →  admin access
```

## Mitigation

- **Don't make authorization decisions from client-controllable headers.** If a header must carry trust (e.g. a real client IP from a load balancer), the back-end has to strip any incoming copy and only accept it from the trusted hop — never from the client.
- **Disable the `TRACE` method** in production; it has no legitimate use on a live app and readily leaks internal request details.
- **Derive the client IP from the connection / a verified proxy chain**, not from an arbitrary header an attacker can send.

## Key takeaways

- Information disclosure can leak *logic*, not just data: here it revealed which header the app trusts for access control.
- `TRACE` echoes the back-end's view of your request, exposing headers added by front-end proxies — a fast way to find trusted internal headers.
- Any authorization based on a client-settable header is bypassable the moment the attacker learns the header's name.
- Fix it by not trusting client headers for authz, disabling `TRACE`, and sourcing the client IP from the connection rather than a spoofable header.
