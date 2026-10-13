import { FREE_RECIPES_PER_MONTH, PLANS } from "./plans";

/**
 * Dedicated landing pages, one per search intent ("hands-free cooking", "voice kitchen timer"…).
 * Each is rendered by app/[slug]/page.tsx and linked from the footer and the sitemap. Keep every
 * page about one thing, with its own wording: near-duplicate pages rank worse than none.
 */

export type LandingSection = {
  heading: string;
  /** Paragraphs. */
  body?: string[];
  /** Cards, rendered after the paragraphs. */
  items?: { title: string; body: string }[];
  /** Voice phrases and what they do. */
  commands?: [string, string][];
};

export type LandingPage = {
  slug: string;
  group: "feature" | "compare";
  /** Short label for the footer and "related" links. */
  navLabel: string;
  /** Browser tab and search result title (the site name is appended). */
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  /** A word or phrase inside `headline` to set in italic clay. */
  highlight?: string;
  intro: string;
  sections: LandingSection[];
  faqs: { q: string; a: string }[];
  /** Slugs of pages to link at the bottom. */
  related: string[];
  /** Built-in recipe ids to suggest trying. */
  recipes: string[];
  /** Small print, e.g. where facts about other products come from. */
  note?: string;
};

const free = `${FREE_RECIPES_PER_MONTH} new recipes a month`;
const Free = free[0].toUpperCase() + free.slice(1);
const price = `${PLANS.monthly.price} a month or ${PLANS.yearly.price} a year`;

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "hands-free-cooking",
    group: "feature",
    navLabel: "Hands-free cooking",
    title: "Hands-Free Cooking: Follow Any Recipe Without Touching Your Phone",
    description:
      "Cook hands-free with any recipe. Lemme Cook shows one step at a time, moves on when you say “next”, sets timers by voice and keeps your screen on. Free, in your browser.",
    eyebrow: "Hands-free cooking",
    headline: "Cook without touching your phone",
    highlight: "touching your phone",
    intro:
      "Hands-free cooking means getting through a recipe while your hands are busy with dough, raw chicken or a hot pan. Lemme Cook turns any recipe into a voice-guided cook mode: you say “next”, it shows the next step. Nothing to download and no account to make.",
    sections: [
      {
        heading: "Why cooking with a phone is so annoying",
        body: [
          "A recipe on a phone fights you the whole time. The screen locks after thirty seconds, so you unlock it with a floury knuckle. The page is a wall of ads and a life story, so you scroll with your wrist and lose your place. You wash your hands four times to check one quantity.",
          "The fix is not a better recipe site. It is a different way of reading: one step at a time, in big type, controlled by your voice. That is what hands-free cooking is, and it works with the recipes you already use.",
        ],
      },
      {
        heading: "How hands-free cooking works in Lemme Cook",
        items: [
          {
            title: "1. Bring any recipe",
            body: "Paste a link from a food blog, a big recipe site, TikTok, Instagram or YouTube, or paste the recipe text. Lemme Cook pulls out the ingredients and steps and drops everything else.",
          },
          {
            title: "2. Set out your ingredients",
            body: "Tick off ingredients as you gather them. Halve or double the recipe first if you need to and every quantity updates.",
          },
          {
            title: "3. Start cooking and talk",
            body: "Tap Start cooking once and allow the microphone. From then on you say “next”, “back”, “repeat” or “set a timer for 10 minutes”. The screen stays awake until you are done.",
          },
        ],
      },
      {
        heading: "What you can say",
        commands: [
          ["“Next” / “Done”", "Go to the next step"],
          ["“Back”", "Go to the previous step"],
          ["“Go to step 4”", "Jump to any step"],
          ["“Read aloud”", "Hear the current step"],
          ["“Ingredients”", "Show the ingredient list"],
          ["“Set a timer for 10 minutes”", "Start a kitchen timer"],
          ["“How long is left?”", "Check your timers"],
        ],
      },
      {
        heading: "Built for real kitchens",
        body: [
          "Kitchens are loud. Lemme Cook listens for a short list of cooking commands rather than trying to transcribe everything, which makes it far more reliable with an extractor fan running. If you want it to ignore conversation completely, turn on the wake word and start commands with “chef”.",
          "Once the on-device voice model has loaded, recognition runs locally in your browser. If voice is not available on your device, you can still tap the right side of the screen for next and the left for back, or swipe.",
        ],
      },
    ],
    faqs: [
      {
        q: "What does hands-free cooking mean?",
        a: "Following a recipe without touching your phone, tablet or laptop. You control the recipe by voice, with commands like “next”, “back” and “set a timer”, so your hands stay free for the food.",
      },
      {
        q: "Do I need a smart speaker or a special device?",
        a: "No. Lemme Cook runs in the browser on the phone, tablet or laptop you already have. It uses the device's microphone for commands and its speaker for reading steps aloud.",
      },
      {
        q: "Does it work with my own recipes?",
        a: "Yes. Paste a link to almost any recipe page or social video, or paste the recipe text from a note or a message. Family recipes typed into a note work too.",
      },
      {
        q: "Is hands-free cooking with Lemme Cook free?",
        a: `Yes. You can cook ${free} for free with no account, and the built-in recipes are always free. Premium (${price}) removes the monthly limit.`,
      },
      {
        q: "Will my screen turn off while I cook?",
        a: "No. While you are in cook mode, Lemme Cook asks the browser to keep the screen awake, so the recipe is still there when you look up.",
      },
    ],
    related: ["voice-controlled-recipes", "cook-mode", "voice-kitchen-timer", "read-recipes-aloud"],
    recipes: ["d-garlic-butter-pasta", "d-lemon-herb-chicken", "d-fudgy-brownies"],
  },

  {
    slug: "voice-controlled-recipes",
    group: "feature",
    navLabel: "Voice-controlled recipes",
    title: "Voice-Controlled Recipes: Say “Next” and Keep Cooking",
    description:
      "Control any recipe with your voice. Say “next”, “back”, “go to step 4” or “repeat” and Lemme Cook moves through the steps for you. Works with any recipe link or text, free in your browser.",
    eyebrow: "Voice control",
    headline: "Recipes that listen to you",
    highlight: "listen to you",
    intro:
      "A voice-controlled recipe is one you move through by speaking instead of tapping. Lemme Cook understands a small set of natural phrases, shows one step at a time in large type, and waits for you to say “next”. It works with the recipe you already picked, from any site.",
    sections: [
      {
        heading: "Every command you need, and nothing you don't",
        body: [
          "General-purpose assistants try to understand anything, which is exactly why they mishear “next” as “text” when the pan is sizzling. Lemme Cook listens for cooking commands only. That narrow vocabulary is what makes it dependable in a noisy kitchen.",
        ],
        commands: [
          ["“Next” / “Done”", "Go to the next step"],
          ["“Back”", "Go to the previous step"],
          ["“Go to step 4”", "Jump straight to any step"],
          ["“Read aloud” / “Repeat”", "Hear the current step spoken"],
          ["“Stop” / “Quiet”", "Stop reading"],
          ["“Ingredients”", "Show the ingredient list"],
          ["“Close”", "Hide the list again"],
          ["“Set a timer for 10 minutes”", "Start a kitchen timer"],
          ["“How long is left?”", "Check your timers"],
          ["“Cancel timer”", "Stop the latest timer"],
          ["“Help”", "Show this list"],
        ],
      },
      {
        heading: "Optional wake word",
        body: [
          "If people are talking in the kitchen, turn on the wake word and Lemme Cook ignores everything that does not start with “chef”: “chef, next”, “chef, set a timer for five minutes”. Say “chef” on its own and the next thing you say counts as the command. Premium cooks can pick their own wake word.",
        ],
      },
      {
        heading: "How voice recognition works",
        body: [
          "Lemme Cook starts with the speech recognition built into your browser, so it works the moment you allow the microphone. In the background it downloads a small on-device voice model. Once that is ready, recognition runs locally, the microphone stays open for the whole recipe, and there is no per-phrase restart or “ding”.",
          "The microphone is only on while you are cooking a recipe, and one tap turns it off. When Lemme Cook reads a step aloud it ignores its own voice, so it never follows a command it spoke itself.",
        ],
      },
      {
        heading: "When voice isn't an option",
        body: [
          "Some browsers and devices do not support speech recognition. Everything else still works: tap the right side of the screen for the next step, the left for the previous one, or swipe. Timers written into a step, like “simmer for 20 minutes”, become one-tap buttons.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which voice commands does Lemme Cook understand?",
        a: "Next, done, back, go to step (number), read aloud, repeat, stop, quiet, ingredients, close, set a timer for (time), how long is left, cancel timer and help. Say “help” while cooking to see the list.",
      },
      {
        q: "Do voice commands work in other languages?",
        a: "Voice commands are in English. Reading steps aloud works in many languages, including Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean and Chinese, using the voices on your device.",
      },
      {
        q: "Does it need an internet connection for voice control?",
        a: "Once the on-device voice model has downloaded, recognition happens in your browser. The built-in recipes work offline too.",
      },
      {
        q: "Will it react to the TV or other people talking?",
        a: "It only acts on recognised cooking commands, and long sentences are ignored as background chatter. For a busy kitchen, turn on the wake word so only phrases starting with “chef” count.",
      },
      {
        q: "Is my voice sent anywhere?",
        a: "With the on-device model, no. Before it has loaded, the browser's own speech recognition is used, which on some platforms is processed by the browser vendor.",
      },
    ],
    related: ["hands-free-cooking", "read-recipes-aloud", "voice-kitchen-timer", "lemme-cook-vs-smart-speakers"],
    recipes: ["d-chicken-stir-fry", "d-egg-fried-rice", "d-shrimp-tacos"],
  },

  {
    slug: "read-recipes-aloud",
    group: "feature",
    navLabel: "Read recipes aloud",
    title: "Read Recipes Aloud: A Recipe Reader That Speaks Each Step",
    description:
      "Have any recipe read aloud, step by step. Say “read aloud” and Lemme Cook speaks the current step in a natural voice, in English and many other languages. Free recipe reader in your browser.",
    eyebrow: "Recipe reader",
    headline: "Hear your recipe, one step at a time",
    highlight: "one step at a time",
    intro:
      "Lemme Cook is a recipe reader: paste any recipe and it will read each step aloud when you ask. You keep your eyes on the pan and your hands on the food, and the recipe keeps pace with you instead of the other way round.",
    sections: [
      {
        heading: "Reading on your terms",
        body: [
          "Lemme Cook never starts talking on its own. Say “read aloud” or “repeat” and it speaks the step you are on. Say “stop” or “quiet” and it stops mid-sentence. Say “next” and it moves on, ready to read the next step when you want it.",
          "That matters because a recipe is not a podcast. You need the step for the sauté while you sauté, and then you need silence while you taste.",
        ],
      },
      {
        heading: "Natural voices, many languages",
        items: [
          {
            title: "Uses the best voice on your device",
            body: "Phones and laptops ship with good text-to-speech voices. Lemme Cook picks the most natural one available for the recipe's language, so a French recipe is read with a French voice.",
          },
          {
            title: "Detects the recipe's language",
            body: "Paste a recipe in Spanish, German, Italian, Portuguese, Russian, Japanese, Korean or Chinese and it is read in that language. The voice commands themselves stay in English.",
          },
          {
            title: "Reads units the way you cook",
            body: "Switch the recipe to metric or US units and the spoken step matches what is on screen.",
          },
        ],
      },
      {
        heading: "Who reads recipes aloud?",
        body: [
          "Anyone who has had to re-read a step three times with wet hands. It also helps people with low vision or dyslexia, cooks who learn better by listening, and anyone cooking a long recipe where losing your place is the main risk. Big type on screen and a spoken step together mean you never have to lean in to read.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can Lemme Cook read any recipe aloud?",
        a: "Yes. Paste a recipe link or the recipe text, start cooking and say “read aloud” on any step. The built-in recipes work the same way.",
      },
      {
        q: "Does it read the whole recipe at once?",
        a: "No, it reads the step you are on, when you ask. You control the pace with “next”, “back” and “repeat”.",
      },
      {
        q: "Which languages can it read?",
        a: "Any language your device has a voice for. That usually includes English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean and Chinese.",
      },
      {
        q: "Does reading aloud cost anything?",
        a: `No. It uses the text-to-speech built into your device, so it is free and works offline. Free accounts can open ${free}; Premium (${price}) removes that limit.`,
      },
      {
        q: "Can I make it read the ingredients?",
        a: "Say “ingredients” to bring up the list on screen at any point. Steps are what get read aloud.",
      },
    ],
    related: ["voice-controlled-recipes", "accessible-cooking", "hands-free-cooking", "cook-mode"],
    recipes: ["d-chickpea-curry", "d-red-lentil-soup", "d-banana-bread"],
  },

  {
    slug: "voice-kitchen-timer",
    group: "feature",
    navLabel: "Voice kitchen timer",
    title: "Voice Kitchen Timer: Set Cooking Timers by Voice, Inside the Recipe",
    description:
      "Set kitchen timers by voice while you cook. Say “set a timer for 10 minutes”, run several at once, ask how long is left, and tap the times written in any recipe step. Free, no app needed.",
    eyebrow: "Timers",
    headline: "Timers you set by talking",
    highlight: "by talking",
    intro:
      "A kitchen timer should not need clean hands. In Lemme Cook you say “set a timer for 10 minutes” and a countdown appears on the recipe you are cooking. Run several at once, ask how long is left, and cancel one without touching the screen.",
    sections: [
      {
        heading: "Timers that live in the recipe",
        body: [
          "Stand-alone timer apps make you leave the recipe, and smart speakers make you remember which timer was for what. Lemme Cook keeps every timer on the cook screen, labelled, counting down next to the step you are on.",
        ],
        items: [
          {
            title: "Set by voice",
            body: "“Set a timer for 10 minutes”, “timer, 45 seconds”, “set a 1 hour timer”. Minutes, seconds and hours all work, with or without a label.",
          },
          {
            title: "Or tap the time in the step",
            body: "When a step says “simmer for 20 minutes” or “bake for 25 minutes”, those times appear as buttons. One tap starts a timer named after the step.",
          },
          {
            title: "Several at once",
            body: "Pasta water, the sauce and the garlic bread each get their own countdown. Ask “how long is left?” and you hear them all.",
          },
          {
            title: "Clear alarm",
            body: "When time is up you get a tone and a banner on screen, even if you have moved on to another step.",
          },
        ],
      },
      {
        heading: "Timer commands",
        commands: [
          ["“Set a timer for 10 minutes”", "Start a 10-minute countdown"],
          ["“Set a timer for 1 hour 30 minutes”", "Longer timers work too"],
          ["“How long is left?”", "Hear the remaining time on every timer"],
          ["“Cancel timer”", "Stop the most recent timer"],
        ],
      },
      {
        heading: "Why not just use the phone's clock app?",
        body: [
          "You can, but you have to unlock the phone, switch apps, type a time, and then find your way back to the step you were on. By then the garlic has caught. Voice timers inside the recipe remove every one of those steps, and the screen never locks while you cook.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I set a timer by voice?",
        a: "While cooking a recipe in Lemme Cook, say “set a timer for 10 minutes”. The timer appears on screen straight away. You can say minutes, seconds or hours.",
      },
      {
        q: "Can I run more than one timer?",
        a: "Yes, as many as you need. Each one shows its own countdown. “How long is left?” reads them all back and “cancel timer” stops the latest one.",
      },
      {
        q: "Will the timer still go off if my screen turns off?",
        a: "Lemme Cook keeps the screen awake while you cook, so the timer and the recipe stay visible. If you leave the page, the browser may pause it, so keep the recipe open.",
      },
      {
        q: "Does the timer work without voice?",
        a: "Yes. Any time written into a step becomes a tap-to-start button, so you can use timers even on a browser without speech recognition.",
      },
      {
        q: "Is the voice timer free?",
        a: `Yes. Timers are part of every recipe you cook, including the ${free} you get for free.`,
      },
    ],
    related: ["hands-free-cooking", "voice-controlled-recipes", "cook-mode", "read-recipes-aloud"],
    recipes: ["d-soft-scrambled-eggs", "d-smashed-potatoes", "d-chocolate-chip-cookies"],
  },

  {
    slug: "tiktok-recipes",
    group: "feature",
    navLabel: "Cook TikTok and Instagram recipes",
    title: "Cook TikTok, Instagram and YouTube Recipes Step by Step",
    description:
      "Turn a TikTok, Instagram Reel, Facebook post or YouTube Short into a step-by-step recipe you can cook by voice. Paste the link and Lemme Cook writes out the ingredients and steps. Free.",
    eyebrow: "Social video recipes",
    headline: "From a 30-second video to a recipe you can actually follow",
    highlight: "actually follow",
    intro:
      "Video recipes are great for inspiration and terrible for cooking. You cannot pause a Reel with wet hands, and the ingredient amounts flash past in half a second. Paste the link into Lemme Cook and it becomes a written recipe with a voice-guided cook mode.",
    sections: [
      {
        heading: "What happens when you paste a link",
        items: [
          {
            title: "Caption first",
            body: "Most creators put the full recipe in the caption. Lemme Cook reads it and sorts it into ingredients and steps, skipping the hashtags.",
          },
          {
            title: "Then the creator's blog",
            body: "If the caption just says “full recipe on my site”, Lemme Cook follows that link and reads the recipe there.",
          },
          {
            title: "Then the video itself",
            body: "If the recipe is only spoken in a TikTok, Lemme Cook listens to the video and writes the ingredients and steps out for you, so you can check them before you start.",
          },
          {
            title: "You get the last word",
            body: "A caption that is only half a recipe opens in an editor so you can finish it, then cook it by voice like any other.",
          },
        ],
      },
      {
        heading: "Supported links",
        body: [
          "TikTok videos, Instagram posts and Reels, Facebook posts, and YouTube videos and Shorts. Ordinary recipe sites and food blogs work too, so the creator's own website is never a dead end.",
          "Instagram and Facebook sometimes refuse to show a post to anyone who is not logged in. When that happens, copy the caption text and paste it instead. Lemme Cook will still find the recipe in it.",
        ],
      },
      {
        heading: "Then cook it hands-free",
        body: [
          "Once the recipe is written out it works like any other in Lemme Cook. Check off the ingredients, scale it for the number of people you are feeding, and tap Start cooking. Say “next” to move through the steps, “set a timer” when a step needs one, and “read aloud” to hear a step without looking down.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I cook a recipe from TikTok?",
        a: "Copy the video's link from the share button, paste it into Lemme Cook and tap go. The recipe appears as a list of ingredients and steps, ready to cook with voice control.",
      },
      {
        q: "Does it work with Instagram Reels?",
        a: "Yes. Paste the Reel or post link. If Instagram will not show the post without a login, copy the caption and paste the text instead.",
      },
      {
        q: "What if the recipe is only said out loud in the video?",
        a: "For TikTok videos, Lemme Cook can listen to the audio and write out the ingredients and steps it hears. Always read them through before cooking, as spoken amounts can be vague.",
      },
      {
        q: "Does it work with YouTube Shorts?",
        a: "Yes. Paste a YouTube or Shorts link and Lemme Cook reads the recipe from the video description, or from the creator's site if the description links to one.",
      },
      {
        q: "Is there a limit?",
        a: `Free cooks can open ${free}; the built-in recipes are always free. Premium (${price}) removes the limit.`,
      },
    ],
    related: ["hands-free-cooking", "cook-mode", "scale-recipes", "voice-controlled-recipes"],
    recipes: ["d-shrimp-tacos", "d-egg-fried-rice", "d-smashed-potatoes"],
  },

  {
    slug: "cook-mode",
    group: "feature",
    navLabel: "Cook mode for any recipe",
    title: "Cook Mode for Any Recipe: Screen Stays On, One Step at a Time",
    description:
      "Add a cook mode to any recipe website. Lemme Cook keeps your phone screen on, shows one step at a time in big type, and lets you move through steps by voice. Works with any recipe link.",
    eyebrow: "Cook mode",
    headline: "The cook mode every recipe should have",
    highlight: "every recipe",
    intro:
      "Some recipe sites have a “cook mode” button that stops the screen from sleeping. Most do not, and even the good ones still make you scroll. Lemme Cook gives every recipe the same cook mode: screen awake, one big step at a time, voice control, and timers built in.",
    sections: [
      {
        heading: "Why your phone screen turns off while cooking",
        body: [
          "Phones lock after a short idle time to save battery. That is fine for reading on the sofa and maddening with a recipe, because you are busy for exactly the time the screen is counting down. Changing the system setting means remembering to change it back.",
          "Lemme Cook uses the browser's screen wake lock while you are in cook mode, and releases it when you finish. You do not touch any settings, and your phone goes back to normal afterwards.",
        ],
      },
      {
        heading: "What cook mode does",
        items: [
          {
            title: "Screen stays on",
            body: "From the moment you open a recipe until you leave it, your phone or tablet will not dim or lock.",
          },
          {
            title: "One step at a time",
            body: "Each step fills the screen in large type you can read from across the counter. The step number and total are always visible, so you know where you are.",
          },
          {
            title: "Voice or touch",
            body: "Say “next”, tap the right side of the screen, or swipe. Whatever your hands allow.",
          },
          {
            title: "Timers from the text",
            body: "“Bake for 25 minutes” becomes a one-tap timer. Or set one by voice.",
          },
          {
            title: "Ingredients on call",
            body: "Say “ingredients” to pull up the list mid-recipe, with the scaling you chose, and “close” to hide it again.",
          },
          {
            title: "No ads, no scrolling",
            body: "Only the ingredients and the steps make it into cook mode. Everything else on the page stays on the page.",
          },
        ],
      },
      {
        heading: "Works with the recipe sites you already use",
        body: [
          "Most recipe sites publish their recipes in a standard format that Lemme Cook can read, including the big names and most food blogs. Paste the link and you are in cook mode in a few seconds. If a site blocks the link, copy the recipe from the page and paste the text. Social videos from TikTok, Instagram and YouTube work too.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I keep my phone screen on while cooking?",
        a: "Open the recipe in Lemme Cook. While it is open, the browser is asked to keep the screen awake, so it will not dim or lock. When you leave the recipe, the normal screen timeout returns.",
      },
      {
        q: "Does cook mode work on iPhone and Android?",
        a: "Yes. It runs in Safari, Chrome and other modern browsers on iPhone, iPad, Android phones and tablets, and on laptops. Add it to your home screen to open it like an app.",
      },
      {
        q: "Can I use cook mode without the microphone?",
        a: "Yes. Tap the right side of the screen for the next step and the left for the previous one, or swipe. The screen stays on either way.",
      },
      {
        q: "Does it work with any recipe website?",
        a: "Almost any site that publishes proper recipes. If a site refuses the link, paste the recipe text instead and it works the same.",
      },
      {
        q: "Is cook mode free?",
        a: `Yes. Cook ${free} free with no account; Premium (${price}) removes the limit.`,
      },
    ],
    related: ["hands-free-cooking", "voice-kitchen-timer", "lemme-cook-vs-recipe-apps", "tiktok-recipes"],
    recipes: ["d-lemon-herb-chicken", "d-beef-chili", "d-spaghetti-bolognese"],
  },

  {
    slug: "scale-recipes",
    group: "feature",
    navLabel: "Scale and convert recipes",
    title: "Scale Any Recipe: Halve, Double and Convert Between Metric and US Units",
    description:
      "Scale any recipe to half, double or a custom amount and every quantity is recalculated into kitchen-friendly fractions. Convert cups to grams and °F to °C. Then cook it by voice.",
    eyebrow: "Scaling and units",
    headline: "The right amount for the people you're feeding",
    highlight: "right amount",
    intro:
      "Recipes are written for a number of people you are not cooking for, in units you do not have measuring tools for. Lemme Cook rescales every ingredient when you change the servings, converts between metric and US measures, and keeps the spoken steps in sync.",
    sections: [
      {
        heading: "Scaling that understands recipes",
        body: [
          "Doubling “1½ tsp” should give you “1 tbsp” not “3 tsp”, and halving “1 cup” should say “½ cup” not “0.5 cup”. Lemme Cook understands fractions, decimals with a comma, ranges like “2 to 3 cloves” and quantities written as “2,5 dl”, and writes the result the way a cookbook would.",
        ],
        items: [
          {
            title: "Preset and custom multipliers",
            body: "Choose ½×, 1×, 1½× or 2×, or type your own, like 3× for a crowd or ⅓× for one.",
          },
          {
            title: "Servings follow",
            body: "The yield updates too, so “4 servings” becomes “8 servings” and you can check it at a glance.",
          },
          {
            title: "Ingredients and steps stay in step",
            body: "Pull up the ingredient list mid-recipe with “ingredients” and it shows the scaled amounts.",
          },
        ],
      },
      {
        heading: "Metric and US conversion",
        body: [
          "Switch a recipe to metric and “1 cup milk” becomes “240 ml milk”, “350°F” becomes “180°C” and “1 lb” becomes “450 g”. Switch to US and it goes the other way. Spoons are left alone, because a teaspoon is a teaspoon everywhere.",
          "Conversions are rounded to amounts you can actually measure, and they apply in the steps as well as the ingredient list, so “read aloud” says the number you see. Unit conversion is a Premium feature; scaling is free for everyone.",
        ],
      },
      {
        heading: "Then cook it hands-free",
        body: [
          "Scaling happens on the ingredient screen before you start. Once you tap Start cooking, every quantity in the steps matches, and you move through the recipe by saying “next”, with voice timers and read-aloud ready when you need them.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I halve or double a recipe?",
        a: "Open the recipe in Lemme Cook and, on the ingredient list, pick ½× or 2×. Every quantity and the number of servings update immediately. Tap the custom option for any other multiplier.",
      },
      {
        q: "Does it convert cups to grams?",
        a: "It converts cups to millilitres, since cups measure volume. Weight units such as ounces and pounds convert to grams and kilograms, and oven temperatures convert between °F and °C.",
      },
      {
        q: "Will the fractions make sense?",
        a: "Yes. Results are rounded to normal kitchen fractions like ⅓, ½ and ¾, and small spoon amounts are kept as teaspoons and tablespoons.",
      },
      {
        q: "Does scaling work with recipes I paste?",
        a: "Yes, with any recipe from a link, a social video or pasted text, as long as the ingredient lines have quantities.",
      },
      {
        q: "Is scaling free?",
        a: `Scaling is free. Unit conversion between metric and US is part of Premium (${price}).`,
      },
    ],
    related: ["cook-mode", "hands-free-cooking", "tiktok-recipes", "voice-controlled-recipes"],
    recipes: ["d-fluffy-pancakes", "d-mac-and-cheese", "d-greek-salad"],
  },

  {
    slug: "accessible-cooking",
    group: "feature",
    navLabel: "Accessible cooking",
    title: "Accessible Cooking: Voice-Guided Recipes for Low Vision, Dyslexia and Limited Mobility",
    description:
      "Cook more independently with big type, spoken steps and voice control. Lemme Cook reads any recipe aloud, moves on when you say “next”, and sets timers by voice. Free, in your browser.",
    eyebrow: "Accessibility",
    headline: "Recipes you can hear, see and control by voice",
    highlight: "hear, see and control",
    intro:
      "Recipe websites assume you can read small text, scroll precisely and tap tiny buttons with clean hands. Lemme Cook takes any recipe and presents it the way accessible software should: one large step at a time, read aloud on request, with voice commands for everything you would otherwise tap.",
    sections: [
      {
        heading: "Who it helps",
        items: [
          {
            title: "Low vision",
            body: "Each step fills the screen in large type with strong contrast, and “read aloud” speaks it. You never have to zoom into a page or find a link.",
          },
          {
            title: "Dyslexia and reading fatigue",
            body: "Hearing a step while seeing it in big, uncluttered text takes the strain out of a long recipe. “Repeat” plays it again as many times as you need.",
          },
          {
            title: "Limited mobility or dexterity",
            body: "“Next”, “back”, “go to step 3” and “set a timer” replace scrolling, tapping and typing. Large tap targets on either side of the screen work as a fallback.",
          },
          {
            title: "Cooking with one hand, or none free",
            body: "Carers, parents with a baby on one arm, and anyone with an injury can get through a recipe without putting anything down.",
          },
        ],
      },
      {
        heading: "Designed to be forgiving",
        body: [
          "Commands are short, natural words rather than exact phrases. “Next”, “done”, “go on” and similar all move forward. Mishearing is handled gently: an unrecognised phrase shows a hint rather than doing something unexpected, and nothing is ever triggered by the app's own voice.",
          "The screen stays on for as long as the recipe is open, so there is no rush to get back to it before it locks. If voice is not available on a device, the whole recipe is still usable by touch, with tap zones that cover each half of the screen.",
        ],
      },
      {
        heading: "Any recipe, not a special catalogue",
        body: [
          "Accessibility should not mean a smaller choice of food. Paste a link from any recipe site, a social video or a typed note, and it gets the same large-type, spoken, voice-controlled treatment. Family recipes typed into a note work just as well as a published one.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Lemme Cook work with a screen reader?",
        a: "It is built with standard, labelled controls so screen readers can use it. For cooking, most people find the built-in “read aloud” and voice commands quicker than navigating with a screen reader, because the current step is spoken directly.",
      },
      {
        q: "Can I make the text bigger?",
        a: "Steps already use large type that adapts to the length of the step. Your browser's zoom and text size settings apply on top of that.",
      },
      {
        q: "Do I have to touch the screen at all?",
        a: "After tapping Start cooking once and allowing the microphone, no. Steps, timers, the ingredient list and reading aloud are all available by voice.",
      },
      {
        q: "What if I have trouble speaking clearly?",
        a: "Commands are single words where possible, and the app only needs to catch the command word, not a full sentence. Touch controls remain available throughout.",
      },
      {
        q: "Is it free?",
        a: `Yes. ${Free} are free with no account, and the built-in recipes are always free.`,
      },
    ],
    related: ["read-recipes-aloud", "voice-controlled-recipes", "hands-free-cooking", "cook-mode"],
    recipes: ["d-tomato-soup", "d-overnight-oats", "d-french-toast"],
  },

  {
    slug: "lemme-cook-vs-smart-speakers",
    group: "compare",
    navLabel: "vs. Alexa and Google Nest",
    title: "Lemme Cook vs Alexa and Google Nest for Step-by-Step Recipes",
    description:
      "Smart speakers can read recipes, but only from their own sources and only on their hardware. Lemme Cook gives any recipe voice control on the phone you already have. An honest comparison.",
    eyebrow: "Comparison",
    headline: "Do you need a smart speaker to cook by voice?",
    highlight: "smart speaker",
    intro:
      "Alexa and Google Assistant were many people's first taste of cooking by voice. They are good at timers and conversions. For following an actual recipe step by step, the picture is more mixed, and in Google's case the feature has largely gone. Here is how they compare with Lemme Cook, which runs in your browser.",
    sections: [
      {
        heading: "Where things stand",
        items: [
          {
            title: "Google Nest Hub and Assistant",
            body: "In early 2024 Google removed step-by-step recipes, the cookbook and recipe videos from Assistant on its smart displays. You can still ask it to search for a recipe, but it no longer walks you through one.",
          },
          {
            title: "Amazon Echo Show",
            body: "Echo Show devices can walk through recipes from Amazon's partner sources with commands like “next step”. Availability depends on your region and which partner features are enabled, and it reads from those sources rather than from the page you found.",
          },
          {
            title: "Lemme Cook",
            body: "Works with any recipe link, social video or pasted text, shows each step on the screen of the device you already own, and takes voice commands for steps, timers and reading aloud. No extra hardware.",
          },
        ],
      },
      {
        heading: "The differences that matter in the kitchen",
        items: [
          {
            title: "Your recipe vs. their catalogue",
            body: "A speaker reads from the sources it has deals with. Lemme Cook reads the recipe you chose, whether it came from a blog, a TikTok, or a note from your mum.",
          },
          {
            title: "Seeing the step",
            body: "On an audio-only speaker you cannot glance at the step; you have to ask again. Lemme Cook shows the step in large type and reads it only when you ask.",
          },
          {
            title: "Where you cook",
            body: "A speaker lives in one room. Your phone goes to the barbecue, the holiday rental and your friend's kitchen.",
          },
          {
            title: "Privacy",
            body: "Smart speakers listen for a wake word all day. Lemme Cook's microphone is on only while you are cooking a recipe, and recognition runs on your device once its voice model has loaded.",
          },
          {
            title: "Where speakers still win",
            body: "If you only want to shout “ten minute timer” from across the room without opening anything, a speaker is hard to beat. Both can live happily in the same kitchen.",
          },
        ],
      },
      {
        heading: "Side by side",
        commands: [
          ["Works with any recipe link", "Lemme Cook: yes · Speakers: partner sources"],
          ["Shows each step on screen", "Lemme Cook: yes · Echo Show: yes · Audio-only speakers: no"],
          ["Needs extra hardware", "Lemme Cook: no · Speakers: yes"],
          ["Timers by voice", "Both"],
          ["Scales servings and converts units", "Lemme Cook: yes · Speakers: unit conversion on request"],
          ["Microphone always listening", "Lemme Cook: only while cooking · Speakers: always"],
          ["Price", `Lemme Cook: free for ${free} · Speakers: the device`],
        ],
      },
    ],
    faqs: [
      {
        q: "Can Google Nest Hub still read recipes step by step?",
        a: "Not as it used to. Google removed step-by-step recipes and the cookbook from Assistant on smart displays in early 2024. It can still search for recipes.",
      },
      {
        q: "Can Alexa read a recipe from any website?",
        a: "Alexa walks through recipes from Amazon's partner sources on Echo Show devices. For a recipe from an arbitrary blog or a TikTok video, you need something like Lemme Cook that reads the page or caption itself.",
      },
      {
        q: "Can I use Lemme Cook and a smart speaker together?",
        a: "Yes. Many people keep the speaker for music and quick timers and use Lemme Cook on their phone or tablet for the recipe itself.",
      },
      {
        q: "Does Lemme Cook need any device beyond my phone?",
        a: "No. It runs in the browser on a phone, tablet or laptop and uses that device's microphone and speaker.",
      },
    ],
    related: ["voice-controlled-recipes", "hands-free-cooking", "lemme-cook-vs-recipe-apps", "best-voice-cooking-apps"],
    recipes: ["d-garlic-butter-pasta", "d-chicken-stir-fry", "d-hummus"],
    note: "Details about other products come from their public announcements and help pages as of October 2026 and may have changed since.",
  },

  {
    slug: "lemme-cook-vs-recipe-apps",
    group: "compare",
    navLabel: "vs. recipe manager apps",
    title: "Lemme Cook vs Recipe Manager Apps (Paprika, Mela, Crouton, SideChef)",
    description:
      "Recipe managers are built for saving and organising recipes. Lemme Cook is built for the twenty minutes you spend cooking one. How cook modes, voice control and pricing compare.",
    eyebrow: "Comparison",
    headline: "Recipe managers organise recipes. This one cooks them with you.",
    highlight: "cooks them with you",
    intro:
      "Apps like Paprika, Mela and Crouton are excellent at collecting recipes, planning meals and writing shopping lists. Their cook modes are a bonus feature. Lemme Cook starts from the other end: it does one thing, guiding you through a recipe by voice, and it works on any recipe without saving it to a library first.",
    sections: [
      {
        heading: "What each is for",
        items: [
          {
            title: "Paprika",
            body: "A long-standing recipe manager for saving recipes from the web, meal planning and groceries. Its cook view keeps the screen on, crosses off ingredients and turns times in the directions into tap-to-start timers. We found no voice control for moving between steps.",
          },
          {
            title: "Mela",
            body: "A polished recipe manager for Apple devices with a cook mode in large type, timers with Live Activities and the option to cook several recipes side by side. We found no voice navigation.",
          },
          {
            title: "Crouton",
            body: "An Apple recipe manager whose hands-free mode is unusual: on Face ID devices you wink right for the next step and left to go back. Timers start from the step text.",
          },
          {
            title: "SideChef",
            body: "A recipe platform with its own library of guided recipes, step photos and videos, hands-free voice commands and integrations with some appliances. Voice guidance applies to recipes from its catalogue.",
          },
          {
            title: "Lemme Cook",
            body: "No library to maintain. Paste any recipe link, social video or text and cook it by voice: “next”, “back”, “set a timer”, “read aloud”. Runs in the browser, keeps the screen on, scales servings and converts units.",
          },
        ],
      },
      {
        heading: "Choosing between them",
        body: [
          "If your problem is “I save recipes everywhere and can never find them”, buy a recipe manager and be happy. They are good at that, and several let you keep the screen on while you cook.",
          "If your problem is “I am standing at the stove with raw chicken on my hands and the page just scrolled”, you want voice control over the recipe in front of you, from whatever source it came from. That is Lemme Cook. The two are not exclusive: paste a link from your recipe manager's share sheet and cook it by voice.",
        ],
      },
      {
        heading: "Side by side",
        commands: [
          ["Voice commands for steps", "Lemme Cook: yes · SideChef: own recipes · Paprika, Mela: not found · Crouton: wink"],
          ["Any recipe link or pasted text", "Lemme Cook, Paprika, Mela, Crouton: yes · SideChef: own library"],
          ["Reads steps aloud on request", "Lemme Cook: yes, many languages"],
          ["Keeps screen on", "All"],
          ["Timers from step text", "Lemme Cook, Paprika, Crouton: yes"],
          ["Recipe library, meal plans, grocery lists", "Paprika, Mela, Crouton, SideChef: yes · Lemme Cook: recent recipes only"],
          ["Install", "Lemme Cook: none, works in the browser · Others: app store"],
          ["Price", `Lemme Cook: free for ${free}, Premium ${price} · Others: one-off or subscription`],
        ],
      },
    ],
    faqs: [
      {
        q: "Does Paprika have voice control?",
        a: "Based on its published feature list and reviews, Paprika's cook view keeps the screen on and offers tap-to-start timers, but we found no voice commands for moving between steps.",
      },
      {
        q: "Can I use Lemme Cook with recipes saved in another app?",
        a: "Yes. Share or copy the recipe's link, or copy its text, and paste it into Lemme Cook. It becomes a voice-guided recipe in a few seconds.",
      },
      {
        q: "Does Lemme Cook save my recipes?",
        a: "Recipes you cook are kept on your device under Recently cooked, so you can reopen them. It is not a full recipe manager with folders, meal plans or grocery lists.",
      },
      {
        q: "Which is cheaper?",
        a: `Lemme Cook is free for ${free} and the built-in recipes, with Premium at ${price}. Recipe managers are typically a one-off purchase per platform or a subscription; check their current prices.`,
      },
    ],
    related: ["cook-mode", "voice-controlled-recipes", "lemme-cook-vs-smart-speakers", "best-voice-cooking-apps"],
    recipes: ["d-pesto-pasta", "d-lemon-salmon", "d-chocolate-chip-cookies"],
    note: "Details about other apps come from their app store listings, websites and published reviews as of October 2026. Features change; check each app before deciding.",
  },

  {
    slug: "best-voice-cooking-apps",
    group: "compare",
    navLabel: "Best voice cooking apps",
    title: "Best Voice-Controlled Cooking Apps for Hands-Free Recipes",
    description:
      "A plain guide to apps that let you cook by voice: what to look for, what each does, and why the one in your browser might be the right place to start. Includes Lemme Cook, SideChef, Echo Show and more.",
    eyebrow: "Guide",
    headline: "What to look for in a voice cooking app",
    highlight: "voice cooking app",
    intro:
      "Hands-free cooking apps have multiplied, and the app store descriptions all sound alike. This guide explains the things that actually separate them, then runs through the main options, including ours. We have tried to be fair; the small print at the bottom says where the facts come from.",
    sections: [
      {
        heading: "Five questions to ask",
        items: [
          {
            title: "Does it work with my recipes?",
            body: "Some apps only guide you through their own catalogue. Others import from any site, and the best also handle TikTok, Instagram and YouTube links and plain pasted text.",
          },
          {
            title: "Is voice control for steps, or just timers?",
            body: "“Set a timer” is table stakes. You want “next”, “back”, “repeat”, “go to step 5” and “read aloud”, and you want them to work with an extractor fan running.",
          },
          {
            title: "Does it read steps aloud, and in my language?",
            body: "Spoken steps let you keep your eyes on the pan. Check that it reads in the recipe's language, not only English.",
          },
          {
            title: "Does the screen stay on?",
            body: "Without a wake lock you are back to unlocking the phone with your elbow.",
          },
          {
            title: "What does it cost, and where does it run?",
            body: "Some need a smart display. Some are iPhone only. Some are subscriptions. A browser app runs everywhere you already have a browser.",
          },
        ],
      },
      {
        heading: "The options",
        items: [
          {
            title: "Lemme Cook (browser, free to start)",
            body: `Paste any recipe link, social video or text and cook it by voice with “next”, timers and read-aloud in many languages. Keeps the screen on, scales servings, converts units. ${Free} free with no account; Premium ${price}.`,
          },
          {
            title: "SideChef (iOS and Android)",
            body: "A large library of guided recipes with step photos and videos, hands-free voice commands and some appliance integrations. Best if you are happy cooking from its catalogue.",
          },
          {
            title: "Amazon Echo Show",
            body: "Walks through recipes from Amazon's partner sources on the display, with commands like “next step”. Needs the device; availability varies by region.",
          },
          {
            title: "Recipe managers with cook modes (Paprika, Mela, Crouton)",
            body: "Strong on saving and organising recipes, with screen-on cook views and tap-to-start timers. Voice navigation of steps is generally not a feature; Crouton offers wink navigation on Face ID devices.",
          },
          {
            title: "Newer voice-first apps",
            body: "A wave of small apps (StepChef, Cookie Voice Recipes, YellChef and others) focus on voice or sound-triggered step navigation, often iPhone only and often with in-app purchases. Worth a look if you want a native app and are on iOS.",
          },
        ],
      },
      {
        heading: "Our recommendation",
        body: [
          "Start with something that works with the recipes you already have, on the device already in your kitchen, before buying hardware or a subscription. For most people that means opening a browser app, pasting tonight's recipe and saying “next”. If you find you want a recipe library and meal plans as well, add a recipe manager alongside it.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best free voice cooking app?",
        a: `Lemme Cook is free for ${free} and its built-in recipes, with no account, and it runs in the browser on any phone. Several native apps have free tiers too; check what the free tier includes.`,
      },
      {
        q: "Do voice cooking apps work on Android?",
        a: "Lemme Cook and SideChef do. Many of the newer voice-first apps are iPhone only, so check the listing.",
      },
      {
        q: "Can any of these cook a recipe from TikTok?",
        a: "Lemme Cook imports TikTok, Instagram, Facebook and YouTube links directly, and can transcribe a TikTok where the recipe is only spoken. Most others need the recipe on a website or typed in.",
      },
      {
        q: "Do I need a smart speaker?",
        a: "No. A phone or tablet with a microphone is enough for voice-controlled cooking. Smart displays are a nice extra for timers and music.",
      },
    ],
    related: ["lemme-cook-vs-smart-speakers", "lemme-cook-vs-recipe-apps", "hands-free-cooking", "voice-controlled-recipes"],
    recipes: ["d-garlic-butter-pasta", "d-beef-chili", "d-banana-bread"],
    note: "Information about other apps comes from their app store listings, websites and published reviews as of October 2026, and we have not independently tested each one. Features and prices change.",
  },
];

export function getLandingPage(slug: string) {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
