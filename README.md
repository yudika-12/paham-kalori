## ✨ Features

| Feature | What it does |
|---|---|
| 📸 **Food scanning** | Take a photo or upload an image → AI calculates calories, protein, carbs & fat plus micronutrients (sodium, fiber, sugar, iron & vitamin C) |
| 🎯 **Daily calorie target** | Set from your profile & goal (based on your BMI/BMR/TDEE) |
| 📊 **Dashboard** | Calorie ring vs target + macro bars (carbs/protein/fat) & micro stats, plus one-tap intake alerts & a quick "Record Food" button |
| 🔔 **Intake notifications** | A friendly alert when you're still short on protein or calories, with food suggestions to close the gap |
| 📈 **History + chart** | Daily timeline log you can edit/delete + weekly/monthly calorie chart with target line & achievement grade |
| 💬 **AI Coach "Buddy"** | Floating chat for questions about meals, exercise, and healthy habits |
| 👤 **Profile** | Manage your personal data, goals & health metrics |

## 🌐 Open the app

Open **[paham-kalori.vercel.app](https://paham-kalori.vercel.app)** in any browser — works on both mobile and desktop:

- **Mobile:** just open it in Safari/Chrome. You can "Add to Home Screen" for an app-like experience.
- **Camera scan:** when you snap a food photo, the browser will ask for camera/gallery permission once — allow it (the site uses HTTPS).

## 📖 How to use

1. **Sign up** → create an account, then fill in a short profile & calorie target.
2. **Scan / Record food** → take a photo or upload food → AI recognizes it, estimates calories + macros and saves the entry automatically. You can also type a food name.
3. **Dashboard** → see your calorie progress today (ring), macro bars, and micro stats. The "Record Food" button is at the bottom.
4. **History** → review daily entries, check the weekly/monthly chart, edit & delete anything wrong.
5. **Profile** → review your BMI & calorie metrics, and update your details or sign out.
6. **Chat** → ask the AI coach "Buddy" about meals, exercise, or healthy habits.

## 🔐 Privacy & disclaimer

- Your password is encrypted, and your data is only visible to you (each profile is private to its owner).
- AI calorie estimates are approximate — they are **not** a substitute for professional medical advice.

## 🛠 Tech

- **Frontend:** Next.js (App Router) + Tailwind CSS + shadcn-style UI + dark mode
- **Backend:** Hono (Node.js) + Prisma, PostgreSQL (Neon)
- **AI:** Gemini for food recognition, calorie/nutrition estimates & chat responses (Server-Sent Events)
- **Auth:** NextAuth with a custom login/register API
- **Deploy:** Single Vercel project — [paham-kalori.vercel.app](https://paham-kalori.vercel.app) (Hono API runs as Next.js route handlers, no separate backend)
