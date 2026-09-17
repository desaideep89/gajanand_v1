# Gajanand Cloud Kitchen website

A one-page ordering website. A customer picks dishes, fills in their name and
address, and taps **Send order on WhatsApp**. The order arrives in your WhatsApp
as a normal message, already typed out.

There is no database, no login and no server. Your WhatsApp chat list is your
order list. Hosting on GitHub Pages is free.

---

## What is in this folder

Twelve files, all at the same level. Upload all of them, exactly as they are.

| File | What it is |
|---|---|
| `index.html` | The website itself |
| `menu.json` | **Your dishes and prices.** You will edit this one. |
| `business.json` | **Your hours, fees and phone number.** You will edit this one. |
| `styles.css` | How the site looks |
| `app.js`, `i18n.js` | How the site works, and the Gujarati translations |
| `hero-640.webp`, `hero-960.webp`, `hero-1280.webp`, `hero-960.jpg` | The food photo at four sizes |
| `.nojekyll` | An empty file GitHub likes. Harmless if it goes missing. |
| `README.md` | This guide |

---

## Part 1: Putting it online (one time, about 15 minutes)

Do this once on a laptop if you can. After that everything works from a phone.

1. Go to **github.com** and create a free account.
2. Click **New repository**. Name it `gajanand`. Choose **Public**. Click
   **Create repository**.
3. On the new page click **uploading an existing file**.
4. Select **every file** in this folder and drag them all in at once. There are
   no folders to worry about. Click **Commit changes**.
5. Go to the **Settings** tab, then **Pages** in the left menu.
6. Under *Branch*, choose `main` and `/ (root)`. Click **Save**.
7. Wait about two minutes, then refresh. GitHub shows your web address, something
   like `https://yourname.github.io/gajanand/`.

That address is your website. Share it on WhatsApp, Instagram and your Google
Business listing.

### One thing to fix after step 7

Open `index.html` and find these two lines near the top:

```
<meta property="og:image" content="https://example.github.io/gajanand/hero-960.jpg">
<meta property="og:url" content="https://example.github.io/gajanand/">
```

Replace `https://example.github.io/gajanand/` with your real address from step 7.
This is what makes the food photo appear when someone shares your link on
WhatsApp. Without it the link looks plain.

---

## Part 2: Running it day to day (all from your phone)

Everything you will ever need to change lives in two files: **`menu.json`** and
**`business.json`**.

To edit a file on your phone:

1. Open your repository in the browser.
2. Tap the file name in the list.
3. Tap the **pencil** icon.
4. Make your change.
5. Scroll down, tap **Commit changes**.
6. Wait about a minute, then refresh your website.

### Mark a dish as sold out

Open `menu.json`, find the dish, and change `false` to `true`:

```
"soldOut":true
```

The dish stays on the menu but goes grey and cannot be added. Change it back to
`false` when you have stock again.

### Change a price

Open `menu.json`, find the dish, change the number after `"price":`

```
"price":140
```

Numbers only. No `₹` sign, no decimal point.

### Close the kitchen for a day

Open `business.json`:

```
"closedToday": true,
"closedMessage": "Closed today for a family function",
"closedMessageGu": "આજે પારિવારિક પ્રસંગના કારણે બંધ"
```

A red bar appears at the top of the site. Customers can still send an order and
you can confirm it when you reopen. Set `closedToday` back to `false` after.

Outside this, the site opens and closes itself automatically using `openTime`
and `closeTime`. It always uses India time, even if the customer is abroad.

### Other settings in `business.json`

| Setting | What it does |
|---|---|
| `deliveryFee` | Added to delivery orders. `30` means ₹30. |
| `minimumOrder` | Blocks orders under this amount. `0` turns it off. |
| `freeDeliveryAbove` | Free delivery over this subtotal. `0` turns it off. |
| `openTime` / `closeTime` | 24-hour clock, like `"11:00"` and `"23:00"`. |
| `phoneWhatsApp` | Where orders arrive. Country code, no `+` and no spaces. |
| `upiId` | Shown to customers paying by UPI. |
| `fssai` | Your licence number. Leave empty until it arrives. |

### The two golden rules for editing

1. **Never delete a quote mark, a comma or a bracket.** Only change what is
   between the quote marks, or the number after a colon.
2. **Check the site after every change.** If the menu shows "The menu could not
   load", you broke a comma. Go back into the file, tap **History**, and restore
   the previous version.

---

## Part 3: What the customer sees

- The site opens in English. Anyone can tap **ગુજરાતી** in the top corner to
  switch the whole site, including every dish name, to Gujarati.
- Their cart is saved on their own phone, so they can close the tab and come back.
- Nothing they type is stored on the website. It goes straight into a WhatsApp
  message to you.

### How payment works

There is no payment gateway. A customer choosing UPI gets a button that opens
their UPI app with your ID and the exact amount filled in.

**Opening a UPI app is not payment.** Always check the money has actually landed
in your PhonePe or bank app before you start cooking. The site tells the customer
this too.

---

## Part 4: Things to sort out

- **FSSAI licence number.** Legally required on a food business website in India.
  Add it to `fssai` in `business.json` as soon as it comes through.
- **Photos.** The hero photo is the one from the original build. Replace
  `hero-960.jpg` and the three `hero-*.webp` files with real photos of your food
  when you have them. Keep the same file names.
- **Instagram.** There is an empty `instagram` setting in `business.json`
  if you want to link it later.

---

## If you ever want more

The things this deliberately does not do, and what each would need:

| Want | Needs |
|---|---|
| Sales reports and order history | A server and a database. This cannot run on GitHub Pages. |
| Customers paying online properly | A payment gateway, which needs a registered business and KYC. |
| An automatic alert when an order arrives | A server, or a paid WhatsApp Business API account. |

For a kitchen this size, WhatsApp plus your own payment app does all three well
enough, for free.
