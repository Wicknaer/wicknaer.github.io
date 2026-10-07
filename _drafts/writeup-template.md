---
# 1) Bu dosyayı _posts/ klasörüne kopyala.
# 2) Adını YYYY-AA-GG-konu-adi.md yap (ör. 2026-10-10-os-command-injection.md).
# 3) Aşağıdaki alanları doldur, köşeli parantezli yerleri kendi notlarınla (İngilizce) değiştir.
title: "PortSwigger | OS command injection (5 labs)"
description: "One-sentence summary: what will the reader learn from this post?"
date: 2026-10-10 20:00:00 +0300
categories: [Web Security]                        # _data/categories.yml içindeki alanlardan biri
tags: [portswigger, os-command-injection, burp-suite]
image:                                             # kapak görseli: kartlarda, yazının üstünde ve paylaşım önizlemesinde görünür
  path: /assets/img/posts/os-command-injection/cover.png   # önerilen boyut 1200x630 (PNG/JPG; LinkedIn SVG önizlemesi göstermez)
  alt: "Short description of the cover image"
platform: PortSwigger Web Security Academy
difficulty: Apprentice                              # Apprentice / Practitioner / Expert
# last_modified_at: 2026-10-12 18:00:00 +0300       # yazıyı güncellersen aç; başlıkta "Updated" olarak görünür
---

## Overview

[Explain the vulnerability in 3-4 sentences in your own words. Where and how does the application use user input?]

## Lab 1: [Lab name]

**Goal:** [The task from the lab description, in your own words]

### Recon

[Which request or parameter looked suspicious, and why?]

![Request captured in Burp](/assets/img/posts/os-command-injection/lab1-request.png)

### Exploitation

```http
POST /product/stock HTTP/2
Host: LAB-ID.web-security-academy.net

productId=1&storeId=[PAYLOAD]
```

[What did the server return? Add a screenshot.]

### Root cause

[What code is most likely running behind the scenes? Which character achieved what?]

> [The one-sentence lesson from this lab.]
{: .tip}

## Lab 2: [Lab name]

[Same structure: Recon → Exploitation → Root cause]

## Mitigation

[What should the developer have done? Include a safe code example if possible.]

## Key takeaways

- [Point 1]
- [Point 2]

<!--
Hatırlatmalar
- Ekran görüntülerini assets/img/posts/KONU-ADI/ klasörüne koy.
- Görselin altına açıklama yazmak için: ![alt text](/assets/img/posts/konu/lab1.png "Caption")
- Görsellere tıklanınca büyütülür; uzun ekran görüntüleri için ayrıca bir şey yapmana gerek yok.
- Lab ID, session cookie gibi değerleri görüntülerde karart.
- HackTheBox'ta yalnızca emekli (retired) içerik yaz; flag paylaşma.
-->
