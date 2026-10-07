---
title: "About this blog: scope and post format"
description: "What this blog covers, the structure every write-up follows, and the formatting conventions used in posts."
date: 2026-10-07 20:00:00 +0300
categories: [Web Security]
tags: [blog, methodology]
image:
  path: /assets/img/posts/about-this-blog/cover.svg
  alt: "Terminal window summarising the write-up format: recon, exploit, root cause, mitigation"
---

This blog documents my work on cyber security. Posts are mostly lab write-ups from PortSwigger Web Security Academy, TryHackMe and HackTheBox, along with the technical notes that come out of them.

## Why write?

Solving a lab and understanding a vulnerability are not the same thing. Running a payload and seeing the success screen is easy; what really matters are these questions:

> Where and how did the application process the input so that this payload worked? How could the developer have prevented it?
{: .note}

Every write-up aims to answer those two questions.

## Post format

Each topic is covered in a single post, with each lab for that topic in its own section. The first series covers:

| Topic | Labs | Platform |
|---|---:|---|
| OS command injection | 5 | PortSwigger |
| Path traversal | 6 | PortSwigger |
| Information disclosure | 5 | PortSwigger |
| Essential skills | 2 | PortSwigger |

Each lab section has four steps:

1. **Recon:** Which request and parameter looked suspicious, and why?
2. **Exploitation:** What was changed in the request, and how did the server respond?
3. **Root cause:** What kind of code is most likely running behind the scenes?
4. **Mitigation:** How could the developer have fixed the vulnerability?

## Formatting

Code blocks are the most common element in write-ups. For example, an HTTP request:

```http
GET /image?filename=../../../etc/passwd HTTP/2
Host: LAB-ID.web-security-academy.net
Cookie: session=...
```

A terminal command:

```bash
ffuf -u https://target/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301
```

A comparison of unsafe and safer code:

```python
# Unsafe: user input goes straight to the shell
os.system("stockreport.sh " + product_id)

# Safer: no shell, arguments passed separately
subprocess.run(["stockreport.sh", product_id], shell=False)
```

Callout boxes are used for important notes:

> In Burp Suite, send a request to Repeater with <kbd>Ctrl</kbd> + <kbd>R</kbd> to replay it.
{: .tip}

> Only practice these techniques in authorized lab environments.
{: .warn}
