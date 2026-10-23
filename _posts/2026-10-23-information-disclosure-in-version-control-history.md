---
# ============================================================================
#  YAZI AYARLARI (front matter) — "---" çizgilerini SİLME.
#  NOT: Önizleme konteynerinin saati UTC; date satırını günün erken bir
#       saatine koy (ör. 12:00 +0300) yoksa "gelecek tarih" sayılıp yayınlanmaz.
# ============================================================================

title: "Information disclosure in version control history"   # Yazı başlığı (tırnak içinde)
description: "PortSwigger's lab: downloading an exposed .git directory and recovering an admin password that was 'removed' in a later commit."   # Tek cümlelik özet; kartta ve Google'da görünür

date: 2026-10-23 12:00:00 +0300                  # Yayın tarihi (ileri tarih verirsen yazı yayınlanmaz)

categories: [Web Security]                       # _data/categories.yml içindeki alanlardan biri (renk buradan gelir)
tags: [portswigger, information-disclosure, git, content-discovery, practitioner]   # Serbest etiketler (küçük harf, boşluksuz)

platform: PortSwigger Web Security Academy       # Üst bilgide "Platform" olarak görünür
difficulty: Practitioner                         # Apprentice / Practitioner / Expert (renkli seviye rozeti)

# --- Kapak görseli ---------------------------------------------------------
# Tüm information disclosure yazıları aynı kategori kapağını paylaşır.
image:
  path: /posts/images/information-disclosure-cover.webp
  alt: "Information disclosure in version control history — lab cover"

# --- Güncelleme tarihi (İSTEĞE BAĞLI) --------------------------------------
# last_modified_at: 2026-10-25 18:00:00 +0300
---

<!-- ==========================================================================
     NASIL DÜZENLERİM? (bu blok ekranda GÖRÜNMEZ, sadece sana not)

     Köşeli parantezli [...] yerleri kendi cümlelerinle (İngilizce) değiştir.

     BAŞLIK:  ## / ###    METİN: **kalın** *italik* `kod`    LİSTE: "- " / "1. "
     LİNK:    [metin](https://adres)      TUŞ: <kbd>Ctrl</kbd> + <kbd>R</kbd>
     GÖRSEL:  ![alt](/posts/images/vcs-1.png "açıklama")
              - Yol /posts/images/... ile başlar; tırnaktaki metin alt açıklama olur
              - Dosya adlarına laba özel önek ver (vcs-...), yoksa çakışır
              - DİKKAT: görsel açıklamasında "|" (pipe) KULLANMA; tablo sanılır
     KOD:     ```bash ... ```  (diller: http, bash, java, sql, text)
     KUTULAR: satır altına {: .note} / {: .tip} / {: .warn}
========================================================================== -->

## Overview

Version control systems keep *everything*. Deleting a secret in a new commit doesn't erase it — the old value is still sitting in the history, one `git log` away. If a `.git` directory is accidentally deployed to a live web server, anyone can download the whole repository and read every version of every file, including the credentials someone thought they'd removed.

This lab exposes its `.git` directory. We'll grab it, walk the history, and recover an admin password that a later commit only *appeared* to delete.

> Only test on systems you own or are explicitly authorised to test, such as PortSwigger Web Security Academy labs.
{: .warn}

## The lab

**Goal:** The application leaks sensitive information through its version control history. The task is to obtain the password for the `administrator` user, then log in and delete the user `carlos`.

## Recon

The application is the usual shop. The interesting part isn't visible in the UI — it's the `.git` directory left in the web root. Browsing to `/.git` returns a directory listing of the repository's internals:

![The shop home page](/posts/images/vcs-shop.webp "The lab application")

![The exposed /.git directory listing](/posts/images/vcs-git-index.png "Browsing to /.git reveals the Git repository's internal files")

Seeing `HEAD`, `config`, `objects/`, `refs/` served over HTTP means the entire repository is downloadable.

## Downloading the repository

Mirror the `.git` directory recursively with `wget`:

```bash
wget -r https://LAB-ID.web-security-academy.net/.git/
```

![wget finishing the recursive download](/posts/images/vcs-wget.png "wget mirrors the exposed .git directory to a local folder")

## Reading the history

Move into the downloaded repository (the folder that *contains* `.git`, not `.git` itself) and look at the log. There are two commits — and the top one is a gift:

```text
commit f8c9a777...  Remove admin password from config
commit 2697b5ba...  Add skeleton admin panel
```

A commit literally titled **"Remove admin password from config"** is exactly where to look. Reading `admin.conf` reveals the credential that was supposedly removed:

![git log and the recovered admin password in admin.conf](/posts/images/vcs-history.png "git log shows the 'Remove admin password from config' commit; reading admin.conf exposes ADMIN_PASSWORD")

The file contains `ADMIN_PASSWORD=<the leaked password>`. The commit only swapped the hard-coded value for an environment variable going forward — the original value still lives in the history.

> I first tried `git checkout <old-commit>` and hit `fatal: bad object ...`. That's because a `wget` mirror of a "dumb HTTP" `.git` is often **incomplete** — not every object/ref comes down. The robust way to read a removed secret is to not touch the working tree at all: `git log -p` or `git show f8c9a777` prints the diff straight from the objects you *do* have (the deleted line shows up with a `-`). Tools like `git-dumper` can also reconstruct the repo fully.
{: .note}

## Exploitation

Go back to the lab and log in as `administrator` with the recovered password. That unlocks the admin panel, which lists the users `wiener` and `carlos`:

![The admin panel after logging in as administrator](/posts/images/vcs-admin.png "Logged in as administrator, the admin panel lists wiener and carlos")

Click **Delete** next to `carlos`. The deletion succeeds and the lab is solved:

![carlos deleted and the lab solved](/posts/images/vcs-solved.png "Deleting carlos succeeds — User deleted successfully — and the lab is marked solved")

## Root cause

Two mistakes stack up, and the second is the subtle one:

1. **The `.git` directory was deployed to the web root.** A build/deploy process copied the whole working tree — including `.git` — to the live server, exposing the entire repository.
2. **A secret was "removed" in a later commit, not rotated.** Replacing a hard-coded password with an environment variable fixes *new* code, but the old value is permanent in history. Anyone who can read the history reads the secret.

```text
git log  →  "Remove admin password from config"  →  old admin.conf still holds the password
```

## Mitigation

- **Never deploy `.git` (or `.svn`, `.hg`) to production.** Deploy build artifacts, not the repository; and block access to VCS directories at the web-server level as defence in depth.
- **A leaked secret must be rotated, not just deleted.** Once a credential has been committed, treat it as compromised: change it everywhere. Removing it in a new commit does nothing for the copy in history.
- **Keep secrets out of source entirely** (environment config / secrets manager), so they never enter the history in the first place.

## Key takeaways

- An exposed `.git` directory hands over the whole repository — every version of every file, including "deleted" secrets.
- Deleting a secret in a commit does not remove it from history; `git log` / `git show` still reveal it.
- A `wget` mirror of `.git` can be incomplete, so read history with `git log -p` / `git show` rather than `git checkout`, or reconstruct it with a dedicated tool.
- Fix it by never shipping `.git` to production, rotating any secret that was ever committed, and keeping secrets out of source.
