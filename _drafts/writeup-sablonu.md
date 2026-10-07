---
# 1) Bu dosyayı _posts/ klasörüne kopyala.
# 2) Adını YYYY-AA-GG-konu-adi.md yap (ör. 2026-10-10-os-command-injection.md).
# 3) Aşağıdaki alanları doldur, köşeli parantezli yerleri kendi notlarınla değiştir.
title: "PortSwigger | OS command injection (5 lab)"
description: "Tek cümlelik özet: bu yazıda ne öğrenilecek?"
date: 2026-10-10 20:00:00 +0300
categories: [PortSwigger, OS Command Injection]   # ilki ana kategori (kırmızı etiket)
tags: [burp-suite, command-injection]
platform: PortSwigger Web Security Academy
difficulty: Apprentice                              # Apprentice / Practitioner / Expert
---

## Konu özeti

[Zafiyeti kendi cümlelerinle 3-4 cümlede anlat. Uygulama kullanıcı girdisini nerede, nasıl kullanıyor?]

## Lab 1: [Lab adı]

**Hedef:** [Lab açıklamasındaki görev, kendi cümlelerinle]

### Keşif

[Hangi isteği/parametreyi neden şüpheli buldun?]

![Burp'te yakalanan istek](/assets/img/posts/os-command-injection/lab1-istek.png)

### Exploitation

```http
POST /product/stock HTTP/2
Host: LAB-ID.web-security-academy.net

productId=1&storeId=[PAYLOAD]
```

[Sunucu ne döndü? Ekran görüntüsü ekle.]

### Neden çalıştı?

[Arka planda büyük ihtimalle nasıl bir kod var? Hangi karakter neyi sağladı?]

> [Bu labda öğrendiğin tek cümlelik ders.]
{: .tip}

## Lab 2: [Lab adı]

[Aynı yapı: Keşif → Exploitation → Neden çalıştı?]

## Önlem

[Geliştirici ne yapmalıydı? Mümkünse güvenli kod örneği ver.]

## Öğrendiklerim

- [Madde 1]
- [Madde 2]

<!--
Hatırlatmalar
- Ekran görüntülerini assets/img/posts/KONU-ADI/ klasörüne koy.
- Lab ID, session cookie gibi değerleri görüntülerde karart.
- HackTheBox'ta yalnızca emekli (retired) içerik yaz; flag paylaşma.
- Yayınlayınca _data/roadmap.yml içinde ilgili konunun "post" alanına yazının adresini ekle.
-->
