# RSVP Wedding Website — GitHub Pages Template

This ZIP is a clean, GitHub Pages-ready recreation of the wedding RSVP page.

## Files

- `index.html` — all page content
- `style.css` — layout, colors, responsive design, animations
- `config.js` — RSVP endpoint + wedding countdown date
- `script.js` — countdown, FAQ, animations, RSVP logic
- `images/` — put your own photos here
- `.nojekyll` — tells GitHub Pages to serve the files directly

## 1. Add your images

Put your images inside the `images` folder using these exact names:

- `hero.png` — main full-screen cover photo
- `story.jpg` — couple/story photo
- `venue.jpg` — church/venue photo
- `footer.jpg` — footer background photo

Recommended:
- Hero/footer: landscape, at least 1600px wide
- Story/venue: portrait or vertical-friendly photos
- JPG or WebP is best for smaller file size

If an image is missing, the site still shows a green/neutral fallback background.

## 2. Connect RSVP responses

The form is intentionally NOT connected to the old RSVP database.

Open `config.js` and change:

```js
const RSVP_ENDPOINT = "";
```

to your SheetDB endpoint, for example:

```js
const RSVP_ENDPOINT = "https://sheetdb.io/api/v1/xxxxxxxxxxxx";
```

Your SheetDB/Google Sheet should have columns matching:

- Name
- Attendance
- Guest Type
- Family Members
- Message

## 3. Upload to GitHub

Create a new GitHub repository, then upload all files from this folder into the repository root.

The important part is that `index.html` must be at the top level of the repository.

## 4. Turn on GitHub Pages

In your repository:

1. Open **Settings**
2. Open **Pages**
3. Under **Build and deployment**, choose **Deploy from a branch**
4. Branch: `main`
5. Folder: `/ (root)`
6. Click **Save**

GitHub will give you a public link similar to:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## 5. Change text

All wedding wording is inside `index.html`.

The countdown date is inside `config.js`:

```js
const WEDDING_DATE = "2026-12-05T15:00:00+08:00";
```

`+08:00` is Philippine time.

## Notes

- No build tool or npm install is needed.
- It works as a normal static website.
- Google Fonts require an internet connection.
- Test your RSVP endpoint before sharing the link publicly.


## Mobile-first architecture

This version is true mobile-first CSS:

- Phone styles are the default.
- Tablet enhancements start at `@media (min-width: 640px)`.
- Desktop enhancements start at `@media (min-width: 900px)`.
- Wide desktop refinements start at `@media (min-width: 1180px)`.
- Touch targets, RSVP cards, navigation, and sticky mobile form actions are optimized for phones first.

## Family member limit

The RSVP allows a maximum of 2 family members. Each added person can be removed with the × button.
