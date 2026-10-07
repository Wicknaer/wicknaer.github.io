---
title: "Merhaba, bu blog neden var?"
description: "Web güvenliği çalışmalarına başlarken neden yazdığımı ve yazıların nasıl bir düzende ilerleyeceğini anlatıyorum."
date: 2026-10-07 20:00:00 +0300
categories: [Günlük]
tags: [başlangıç, plan]
---

Bugün 15 haftalık web güvenliği programının ilk günü. Takım liderim her hafta bir konu ve bir lab listesi veriyor; benim işim bu labları çözmek ve her konu için burada bir **writeup** yayınlamak.

## Neden yazıyorum?

Bir labı çözmek ile onu anlamak aynı şey değil. Payload'ı kopyalayıp "Congratulations" ekranını görmek kolay; asıl soru şu:

> Uygulama girdimi nerede, nasıl işledi de bu payload çalıştı? Geliştirici bunu nasıl önleyebilirdi?
{: .note}

Her yazıda bu iki soruya cevap vermeye çalışacağım.

## Yazılar nasıl ilerleyecek?

Her konu için tek bir yazı yazacağım ve o konudaki tüm lablar yazının içinde ayrı bölümler olacak. İlk hafta şöyle görünüyor:

| Konu | Lab | Platform |
|---|---:|---|
| OS command injection | 5 | PortSwigger |
| Path traversal | 6 | PortSwigger |
| Information disclosure | 5 | PortSwigger |
| Essential skills | 2 | PortSwigger |

Her lab bölümü dört adımdan oluşacak:

1. **Keşif:** Hangi isteği, hangi parametreyi neden şüpheli buldum?
2. **Exploitation:** Burp'te ne değiştirdim, sunucu ne döndü?
3. **Neden çalıştı:** Arka planda büyük ihtimalle nasıl bir kod var?
4. **Önlem:** Geliştirici ne yapmalıydı?

## Bu blog neleri gösterebiliyor?

Writeup'larda en çok kod bloklarına ihtiyacım olacak. Örneğin bir HTTP isteği:

```http
GET /image?filename=../../../etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
Cookie: session=...
```

Ya da bir terminal komutu:

```bash
ffuf -u https://hedef/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301
```

Ya da güvenli ve güvensiz kodun karşılaştırması:

```python
# Güvensiz: kullanıcı girdisi doğrudan kabuğa gidiyor
os.system("stockreport.sh " + product_id)

# Daha güvenli: kabuk yok, argümanlar ayrı
subprocess.run(["stockreport.sh", product_id], shell=False)
```

Önemli uyarılar için kutular kullanacağım:

> Burp'te bir isteği tekrar göndermek için <kbd>Ctrl</kbd> + <kbd>R</kbd> ile Repeater'a at.
{: .tip}

> Bu teknikleri yalnızca izin verilmiş lab ortamlarında dene.
{: .warn}

İlk gerçek writeup birkaç gün içinde geliyor. [Yol haritasından](/yol-haritasi/) ilerlememi takip edebilirsin.
