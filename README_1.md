# Hebrew Verb Trainer

A practice tool for Hebrew verb conjugation: translate EN ↔ HE, drill past and future tenses, filter by binyan.

**Live:** https://hebrewverbs.pages.dev

The current list has 158 verbs across Pa'al, Pi'el, Hif'il, Hitpa'el and Nif'al. Each verb comes with present, past and future forms, with and without niqqud. All forms are checked against [Pealim](https://www.pealim.com). New verbs are added regularly.

## Using it on your site

Feel free to take the code and use it. A link back is appreciated.

**Embed it.** You always get the latest version, including newly added verbs:

```html
<iframe src="https://hebrewverbs.pages.dev" width="100%" height="700" style="border:0"></iframe>
```

**Copy the code.** It's plain HTML, CSS and JS, with no build step and no dependencies: just open `index.html`. To get notified about updates, click **Watch → Custom → Releases**.

## Files

| File | Contents |
|---|---|
| `index.html`, `style.css`, `app.js` | the trainer itself |
| `verbs.json` | verb data: infinitive, translation, binyan, root, and all forms with and without niqqud |

## `verbs.json` format

```json
{
  "id": "lelamed",
  "infinitive": "ללמד",
  "infinitive_niqqud": "לְלַמֵּד",
  "en": ["teach"],
  "binyan": "Piel",
  "root": "למד",
  "present": { "ms": "...", "fs": "...", "mp": "...", "fp": "..." },
  "past":   { "ani": "...", "ata": "...", "at": "...", "hu": "...", "hi": "...",
              "anachnu": "...", "atem": "...", "aten": "...", "hem": "...", "hen": "..." },
  "future": { "...": "same keys as past" }
}
```

Each of `infinitive`, `present`, `past` and `future` has a matching `_niqqud` field that holds the same forms with vowel points.

---

**По-русски.** Тренажёр спряжения ивритских глаголов: 158 глаголов, настоящее, прошедшее и будущее время с огласовками, формы сверены с Pealim. Сайт: https://hebrewverbs.pages.dev. Код можно свободно брать или встроить тренажёр к себе через iframe.
