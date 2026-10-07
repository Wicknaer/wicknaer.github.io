# 0xW1CK: Web Security Blog

Kırmızı, lacivert ve gri tonlarda, sıfırdan yazılmış bir Jekyll blogu. GitHub Pages üzerinde ücretsiz çalışır. Yazılar Markdown ile yazılır.

## Klasör yapısı

```
_config.yml          → site adı, kullanıcı adı, sosyal linkler (İLK BURAYI DÜZENLE)
_data/roadmap.yml    → 15 haftalık program ve lab ilerlemesi
_posts/              → yayınlanan yazılar (YYYY-AA-GG-baslik.md)
_drafts/             → writeup şablonu (yayınlanmaz)
_layouts/            → sayfa iskeletleri (ana sayfa, yazı, sayfa)
_includes/           → üst menü, alt bilgi, yazı satırı
assets/css/main.css  → tüm tasarım (renkler en üstte :root içinde)
assets/js/main.js    → kıvılcım animasyonu, içindekiler, kod kopyalama, arama
assets/img/posts/    → yazı ekran görüntüleri
hakkimda.md          → Hakkımda sayfası
yol-haritasi.html    → Yol haritası sayfası
blog/index.html      → Tüm yazılar + arama + filtre
```

## Kurulum (bir kerelik, ~15 dk)

1. GitHub'da **New repository** oluştur. Adı tam olarak `KULLANICIADI.github.io` olsun ve Public seç.
2. Bu klasördeki **tüm dosyaları** repoya yükle:
   - **Kolay yol:** Repo sayfasında *Add file → Upload files* seç, klasörün içeriğini sürükle-bırak yap, *Commit changes* ile kaydet.
   - **Git ile:**
     ```bash
     cd blog-klasoru
     git init
     git add .
     git commit -m "İlk sürüm"
     git branch -M main
     git remote add origin https://github.com/KULLANICIADI/KULLANICIADI.github.io.git
     git push -u origin main
     ```
3. Repo'da **Settings → Pages** bölümüne git. *Source* olarak **Deploy from a branch**, branch olarak **main** ve klasör olarak **/ (root)** seç, sonra Save'e bas.
4. **Actions** sekmesinde yeşil tik çıkmasını bekle (1-2 dk).
5. `https://KULLANICIADI.github.io` adresini aç.

> `_config.yml` içindeki `KULLANICIADI` geçen her yeri kendi GitHub kullanıcı adınla değiştirmeyi unutma.

## Yeni writeup yayınlama

1. `_drafts/writeup-sablonu.md` dosyasını kopyala ve `_posts/` klasörüne koy.
2. Adını `2026-10-10-os-command-injection.md` gibi tarih ve konu olacak şekilde ver.
3. Üstteki bilgileri (title, categories, tags, difficulty) doldur ve yazını yaz.
4. Ekran görüntülerini `assets/img/posts/konu-adi/` klasörüne koy. Yazıda şöyle kullan:
   `![açıklama](/assets/img/posts/konu-adi/lab1.png)`
5. `_data/roadmap.yml` içinde ilgili konunun `done` sayısını ve `post` adresini güncelle.
6. Değişiklikleri gönder:
   ```bash
   git add .
   git commit -m "Writeup: OS command injection"
   git push
   ```

## Markdown kısa notlar

| İstediğin | Yazacağın |
|---|---|
| Başlık | `## Başlık` (içindekilere otomatik eklenir) |
| Kod bloğu | ` ```http ` … ` ``` ` (dil adı etiket olarak görünür) |
| Satır içi kod | `` `productId` `` |
| Bilgi kutusu | `> metin` ve alt satıra `{: .note}` |
| İpucu kutusu | `> metin` ve alt satıra `{: .tip}` |
| Uyarı kutusu | `> metin` ve alt satıra `{: .warn}` |
| Tuş | `<kbd>Ctrl</kbd>` |

## Renkleri değiştirmek

`assets/css/main.css` dosyasının en üstündeki `:root` bloğunda tüm renkler tek yerde durur. Örneğin `--red` değerini değiştirirsen sitedeki tüm kırmızılar değişir.

## Yerelde denemek (isteğe bağlı)

Ruby kuruluysa şu komutlarla siteyi kendi bilgisayarında görebilirsin:

```bash
bundle install
bundle exec jekyll serve --drafts
```

Ardından `http://localhost:4000` adresini aç.
