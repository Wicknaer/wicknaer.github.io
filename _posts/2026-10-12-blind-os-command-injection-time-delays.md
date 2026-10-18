---
# ============================================================================
#  YAZI AYARLARI (front matter)
#  Bu "---" çizgilerinin arası yazının kimlik bilgisidir. Çizgileri SİLME.
#  Satır başındaki # işareti o satırı devre dışı bırakır (yorum yapar).
# ============================================================================

title: "Blind OS command injection with time delays"   # Yazı başlığı (tırnak içinde)
description: "Detecting blind OS command injection on PortSwigger's lab by introducing time delays when there is no visible output."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-12 20:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, os-command-injection, blind, burp-suite, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli (İSTEĞE BAĞLI) ------------------------------------------
# Görseli proje kökündeki posts/images/ klasörüne koy,
# path satırını o görselin adıyla güncelle.
# Önerilen boyut 1200x630. PNG/JPG kullan (LinkedIn SVG önizlemesi göstermez).
image:
  path: /posts/images/OS_command_injection.png
  alt: "Blind OS command injection with time delays — lab cover"

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

     GÖRSEL:   ![alt metin](/posts/images/time-delays-1.png "Altta görünecek açıklama")
               - Yol her zaman /posts/images/... ile başlar
               - Tırnak içindeki metin görselin altında açıklama olur
               - Görsele tıklanınca büyür
               - Ekran görüntülerini proje kökündeki posts/images/ klasörüne koy
               - Tüm yazılar bu klasörü paylaşır: dosya adlarına laba özel önek ver
                 (örn. simple-request.png, time-delays-request.png), yoksa çakışır
               - Lab ID, session cookie gibi değerleri görsellerde karart
               - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır ve bozar

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
                | Payload | Yanıt süresi |
                |---|---|
                | ping -c 10 | ~10 sn |
========================================================================== -->

## Overview

In *blind* OS command injection, user input still reaches a system shell, but the command's output is never returned in the response. The application might run the command in the background, or simply discard its output. Because we can't read anything back, we need an indirect way to prove the command ran.

The classic technique is to inject a command that takes a predictable amount of time, such as `ping`, and watch how long the server takes to respond. If a payload that sleeps for ten seconds makes the response arrive ten seconds later, the command executed.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs. Running these payloads against anything else is illegal.
{: .warn}

## The lab

**Goal:** The feedback function runs a shell command containing the submitted details, but returns nothing useful in the response. The task is to exploit the blind vulnerability to cause a 10-second time delay.

## Recon

The lab is the same kind of shopping site, but this time the interesting feature is **Submit feedback** in the top navigation.

![The shop home page](/posts/images/time-delays-shop.webp "The lab application with a feedback feature")

![The Submit feedback navigation link](/posts/images/time-delays-nav.png "The feedback form is reachable from the top navigation")

The feedback form collects a name, email, subject and message.

![The feedback form filled with test data](/posts/images/time-delays-form.png "Submitting feedback sends name, email, subject and message to the server")

Submitting the form sends a `POST` request to `/feedback/submit`. The response is just an empty JSON object — no command output, no error, nothing to read back.

![The normal feedback request and its empty response](/posts/images/time-delays-normal.webp "A normal submission returns an empty JSON object with no useful output")

That empty response is exactly what makes this *blind*: if one of these fields is passed into a shell command, we won't see the result directly. We need to confirm execution by timing instead.

## Exploitation

Send the feedback request to Repeater so we can tamper with each field and watch the response time.

> In Burp, select the request and press <kbd>Ctrl</kbd> + <kbd>R</kbd> to send it to Repeater. The response time is shown at the bottom-right of the response panel — that's the signal we care about here.
{: .tip}

Each field is a candidate. Test them one at a time by replacing the value with a payload that forces a measurable delay. The `email` field is the vulnerable one. Inject a payload that chains a `ping` of localhost, which blocks for about ten seconds:

```http
POST /feedback/submit HTTP/2
Host: LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded

csrf=CSRF-TOKEN&name=Test&email=x||ping+-c+10+127.0.0.1||&subject=Command+Injection&message=PWNED
```

The injected value decodes to `x||ping -c 10 127.0.0.1||`. The `||` is the shell's OR operator: the bogus `x` fails, so the shell runs `ping -c 10 127.0.0.1` next, and the trailing `||` swallows the rest of the original command so it doesn't break the syntax. `ping -c 10` sends ten packets one second apart, blocking for roughly ten seconds.

When we send it, the response doesn't come back immediately — Burp sits in the **Waiting** state while the server is busy running our ping:

![The response hanging while the injected ping runs](/posts/images/time-delays-waiting.webp "Burp stays in the Waiting state while the injected ping command blocks the response")

After about ten seconds the request completes. The response body is still an empty object — but the delay itself is our proof that the command executed, and the lab is solved.

![The delayed request completing after about ten seconds](/posts/images/time-delays-exploit.webp "The request finishes only after the injected ping has run, confirming blind command execution")

> Always test each parameter separately. If you inject every field at once and see a delay, you won't know which input is actually vulnerable.
{: .note}

## Root cause

As in the simple case, the server builds a shell command from user input — but here it never sends the output back, so the bug stays invisible to normal use:

```php
// Vulnerable: the email value is concatenated into a shell command,
// and its output is discarded instead of returned.
shell_exec("/usr/bin/report_feedback '" . $email . "' '" . $subject . "'");
```

The single quotes around `$email` are meant to keep it as one argument, but the payload `x||ping -c 10 127.0.0.1||` escapes them in this lab's setup, so the shell interprets the `||` and runs our command. Because nothing is echoed back, the only observable effect is timing.

## Mitigation

The fix is the same as for any command injection: keep user input out of the shell. Call the target program directly with its arguments as a list, so metacharacters can never be interpreted:

```python
# Unsafe: user input goes to a shell, which interprets metacharacters
os.system("report_feedback '" + email + "' '" + subject + "'")

# Safer: no shell (shell=False), arguments passed as a list, input stays data
subprocess.run(["report_feedback", email, subject], shell=False)
```

Validate inputs against their expected format as defence in depth — an email field should match an email pattern and reject shell metacharacters outright.

## Key takeaways

- Blind command injection returns no output, so you confirm it indirectly — a time delay is the simplest, most reliable signal.
- `ping -c 10 127.0.0.1` is a clean ~10-second delay payload; a response that suddenly takes that long is strong evidence of execution.
- Test one parameter at a time so you know exactly which input is vulnerable.
- The mitigation never changes: pass arguments as a list, not a concatenated string, and validate input.
