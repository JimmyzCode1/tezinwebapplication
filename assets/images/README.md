# Saxion Deventer VR Portal - Custom Images Folder

You can drop your own images in this folder to customize the website.

## Suggested Assets:
1. **Meta Quest 3 Image**: Place a picture of the Meta Quest 3 as `quest3.jpg` (or `.png`).
2. **Meta Quest 2 Image**: Place a picture of the Meta Quest 2 as `quest2.png` (or `.jpg`).
3. **Hero Banner Image**: If you want a custom background image for the main banner, place it here as `banner_bg.jpg`.

## How to replace in HTML:
In `index.html`, look for the comment lines starting with `<!-- To use your own image: ... -->`.
Simply swap the SVG code block with:
```html
<img src="assets/images/quest3.jpg" alt="Meta Quest 3" class="headset-img">
```

We have already added support for `.headset-img` inside `style.css` so that it will automatically fit and scale with the hover animations!
