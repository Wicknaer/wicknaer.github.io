---
layout: page
title: About Me
description: I work on cyber security and document my findings in technical write-ups.
permalink: /about/
---

<div class="about">

<aside class="profile" aria-label="Profile">
  <div class="profile__badge" aria-hidden="true">BŞ</div>
  <p class="profile__name">{{ site.author }}</p>
  <p class="profile__role">{{ site.tagline }}</p>
  {% if site.social.linkedin and site.social.linkedin != "" %}
  <a class="btn btn--ghost profile__cta" href="{{ site.social.linkedin }}" target="_blank" rel="me noopener">LinkedIn <span class="btn__arrow" aria-hidden="true">→</span></a>
  {% endif %}
</aside>

<div class="prose" markdown="1">

I'm **Bahadır Şahin**, and I work on cyber security. I practice on hands-on security labs, and after each one I document on this blog how the vulnerability was found, why it was exploitable and how it could have been prevented.

> My goal is not just to show the solution, but to explain the mechanism behind the vulnerability and the defensive side as well.
{: .note}

## Ethics

Every technique described on this blog was performed only in environments where testing is explicitly permitted, such as training labs and intentionally vulnerable applications. I respect the rules of the platforms I learn on: content they ask not to be shared, including solutions to active challenges and flags, is never published. Nothing here should be used against systems you do not own or have written permission to test.

</div>

</div>
