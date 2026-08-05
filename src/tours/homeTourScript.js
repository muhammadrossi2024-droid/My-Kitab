// The Home screen's guided tour — started manually from Home's "Start
// Tour" button (see IntroContext/App.jsx). Runs on the generic engine in
// components/GuidedTour.jsx; see that file for what each `api.*` call does.
export const HOME_TOUR_TOTAL_STEPS = 11;

export default async function homeTourScript(api) {
  const { setDisplay, setCard, waitForNextPress, waitForSelector, waitForNthSelector, ringAndPause, tapAndSettle, tapNavStep, animateScrollTo, sleep, cancelledRef, setIsFinal } = api;

  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  setCard("Welcome", "Assalamu alaikum! Sit back and watch a quick walkthrough of My Kitab.", null);
  await waitForNextPress();
  if (cancelledRef.current) return;

  // Step 1 — tap Quran
  await tapNavStep({
    selector: '[data-tour-id="/surahs"]',
    step: 1,
    title: "Quran",
    text: "The full Qur'an, with Arabic text and English translation.",
  });
  if (cancelledRef.current) return;

  // Bridge into Step 2 — open Al-Fatihah
  const surahRow = await waitForSelector(".surah-list-item");
  if (!surahRow || cancelledRef.current) return;
  const rowRect = await ringAndPause(
    surahRow,
    "rounded",
    "Opening a Surah",
    "Let's open Al-Fatihah to see the reading view.",
    2
  );
  if (!rowRect || cancelledRef.current) return;
  await tapAndSettle(surahRow, rowRect);
  if (cancelledRef.current) return;

  // Step 2 — scroll down to Ayah 4 (visibly passing Ayahs 1-3)
  const markBtn4 = await waitForNthSelector(".mark-last-read-btn", 3);
  if (!markBtn4 || cancelledRef.current) return;
  window.scrollTo(0, 0);
  await sleep(300);
  if (cancelledRef.current) return;

  const initialRect = markBtn4.getBoundingClientRect();
  const targetY = window.scrollY + initialRect.top - (window.innerHeight / 2 - initialRect.height / 2);
  setCard("Ayah 4", "Scrolling down through Ayahs 1, 2, and 3 to reach Ayah 4…", 2);
  await animateScrollTo(targetY, () => {
    const r = markBtn4.getBoundingClientRect();
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: true });
  });
  if (cancelledRef.current) return;

  const settled4 = await api.settleAndMeasure(markBtn4);
  if (cancelledRef.current) return;
  setDisplay({ kind: "spotlight", rect: settled4, shape: "rounded", live: false });
  setCard("Ayah 4", "Here's Ayah 4 — the Mark Ayah button sits right below it.", 2);
  await waitForNextPress();
  if (cancelledRef.current) return;

  // Step 3 — tap Mark Ayah on Ayah 4
  const rect3 = await ringAndPause(
    markBtn4,
    "rounded",
    "Mark Ayah",
    "Tap this under Ayah 4 to save your place as you read.",
    3
  );
  if (!rect3 || cancelledRef.current) return;
  await tapAndSettle(markBtn4, rect3);
  if (cancelledRef.current) return;
  const markedRect = markBtn4.getBoundingClientRect();
  setDisplay({ kind: "spotlight", rect: markedRect, shape: "rounded", live: false });
  setCard("Mark Ayah", "Saved — Ayah 4 is now your last read position.", 3);
  await waitForNextPress();
  if (cancelledRef.current) return;

  // Step 4 — Continue Reading. First, a bridge back to the surah list,
  // where the Continue Reading pill now lives (it only renders once a
  // position is saved).
  const quranNavAgain = await waitForSelector('[data-tour-id="/surahs"]');
  if (!quranNavAgain || cancelledRef.current) return;
  const backRect = await ringAndPause(
    quranNavAgain,
    "circle",
    "Back to the List",
    "Let's go back to the surah list to see Continue Reading.",
    4
  );
  if (!backRect || cancelledRef.current) return;
  await tapAndSettle(quranNavAgain, backRect);
  if (cancelledRef.current) return;

  const resumeLink = await waitForSelector(".resume-reading-link");
  if (!resumeLink || cancelledRef.current) return;
  const resumeRect = await ringAndPause(
    resumeLink,
    "rounded",
    "Continue Reading",
    "This picks up right where you left off — tap it to jump back to Ayah 4.",
    4
  );
  if (!resumeRect || cancelledRef.current) return;
  await tapAndSettle(resumeLink, resumeRect);
  if (cancelledRef.current) return;

  // The reader page has its own effect that smooth-scrolls to the #ayah-N
  // hash on load — let that finish before taking over with our own
  // scroll/ring so the two don't fight each other.
  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  await sleep(1200);
  if (cancelledRef.current) return;
  const ayah4Block = document.getElementById("ayah-4");
  if (ayah4Block && !cancelledRef.current) {
    const r = await api.settleAndMeasure(ayah4Block);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Continue Reading", "And there we are — right back at Ayah 4.", 4);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 5 — scroll back up to the top of the Quran section
  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  setCard("Back to the Top", "Scrolling back up to the top of the page.", 5);
  await sleep(400);
  if (cancelledRef.current) return;
  await animateScrollTo(0, null);
  if (cancelledRef.current) return;
  await waitForNextPress();
  if (cancelledRef.current) return;

  // Step 6 — tap Mutoon
  await tapNavStep({
    selector: '[data-tour-id="/mutoon"]',
    step: 6,
    title: "Mutoon",
    text: "Classical texts for the student of knowledge, laid out page by page.",
  });
  if (cancelledRef.current) return;

  // Step 7 — tap Thikr
  await tapNavStep({
    selector: '[data-tour-id="/athkar"]',
    step: 7,
    title: "Thikr",
    text: "Morning and evening remembrances, with translations and repetition counts.",
  });
  if (cancelledRef.current) return;

  // Step 8 — tap Library
  await tapNavStep({
    selector: '[data-tour-id="/my-kitab"]',
    step: 8,
    title: "Library",
    text: "Your personal library — upload your own PDFs and search within them.",
  });
  if (cancelledRef.current) return;

  // Step 9 — tap Search
  await tapNavStep({
    selector: '[data-tour-id="/search"]',
    step: 9,
    title: "Search",
    text: "Search the Qur'an, Mutoon, and Hadith by topic or keyword.",
    thenSelector: ".search-input",
    thenTitle: "Search",
    thenText: 'Type here to search — try a concept like "patience".',
  });
  if (cancelledRef.current) return;

  // Step 10 — tap Settings
  await tapNavStep({
    selector: '[data-tour-id="/settings"]',
    step: 10,
    title: "Settings",
    text: "Your reciter, font sizes, theme, and reading preferences.",
  });
  if (cancelledRef.current) return;

  // Step 11 — Done
  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  setCard(
    "You're All Set",
    "That's everything — enjoy exploring My Kitab. You can start this tour again anytime from the Home screen.",
    11
  );
  setIsFinal(true);
}
