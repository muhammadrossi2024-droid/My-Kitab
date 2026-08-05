// Auto-launched once, right after Premium is newly activated (see
// PremiumContext's justActivatedPremium + App.jsx) — walks a brand-new
// Premium user through what they just unlocked, live, across four
// sections. Runs on the generic engine in components/GuidedTour.jsx.
//
// Deliberately non-destructive: it opens the real note editor / dua form
// to show the interaction, but never types into or saves anything, so a
// fresh account's actual notes/duas stay empty until the user does it
// themselves.
export const PREMIUM_TOUR_TOTAL_STEPS = 8;

// How long to let FlipNoteCard's 3D flip finish (see its own 0.6s
// transition) before measuring the newly-revealed back face — otherwise
// the spotlight can catch it mid-rotation.
const FLIP_SETTLE_MS = 700;

export default async function premiumTourScript(api) {
  const { setDisplay, setCard, waitForNextPress, waitForSelector, waitForNthSelector, ringAndPause, tapAndSettle, sleep, cancelledRef, setIsFinal } = api;

  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  setCard("Welcome to Premium", "Let's take a quick look at everything you've just unlocked.", null);
  await waitForNextPress();
  if (cancelledRef.current) return;

  // Step 1 — Quran note-taking
  const quranNav = await waitForSelector('[data-tour-id="/surahs"]');
  if (!quranNav || cancelledRef.current) return;
  let rect = await ringAndPause(quranNav, "circle", "Quran", "First, let's open the Quran.", 1);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(quranNav, rect);
  if (cancelledRef.current) return;

  const surahRow = await waitForSelector(".surah-list-item");
  if (!surahRow || cancelledRef.current) return;
  rect = await ringAndPause(surahRow, "rounded", "Open a Surah", "Let's open Al-Fatihah.", 1);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(surahRow, rect);
  if (cancelledRef.current) return;

  const noteIcon = await waitForSelector(".flip-note-trigger");
  if (!noteIcon || cancelledRef.current) return;
  rect = await ringAndPause(noteIcon, "circle", "Note-Taking", "Tap the note icon on any ayah…", 1, true);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(noteIcon, rect);
  if (cancelledRef.current) return;
  await sleep(FLIP_SETTLE_MS);
  if (cancelledRef.current) return;

  const quranNoteField = await waitForSelector(".note-editor-textarea");
  if (quranNoteField && !cancelledRef.current) {
    const r = await api.settleAndMeasure(quranNoteField);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Note-Taking", "…and it flips open, ready to write and tag a personal note.", 1);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 2 — Mutoon note-taking
  const mutoonNav = await waitForSelector('[data-tour-id="/mutoon"]');
  if (!mutoonNav || cancelledRef.current) return;
  rect = await ringAndPause(mutoonNav, "circle", "Mutoon", "The same note-taking works in Mutoon too.", 2);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(mutoonNav, rect);
  if (cancelledRef.current) return;

  const mutoonBookRow = await waitForSelector("a.surah-list-item.mutoon-book-item");
  if (!mutoonBookRow || cancelledRef.current) return;
  rect = await ringAndPause(mutoonBookRow, "rounded", "Open a Text", "Let's open a matn.", 2);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(mutoonBookRow, rect);
  if (cancelledRef.current) return;

  const mutoonNoteIcon = await waitForSelector(".mutoon-reader .flip-note-trigger");
  if (!mutoonNoteIcon || cancelledRef.current) return;
  rect = await ringAndPause(mutoonNoteIcon, "circle", "Note-Taking in Mutoon", "Tap it here too…", 2, true);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(mutoonNoteIcon, rect);
  if (cancelledRef.current) return;
  await sleep(FLIP_SETTLE_MS);
  if (cancelledRef.current) return;

  const mutoonNoteField = await waitForSelector(".note-editor-textarea");
  if (mutoonNoteField && !cancelledRef.current) {
    const r = await api.settleAndMeasure(mutoonNoteField);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Note-Taking in Mutoon", "…same flip, same easy note and tags.", 2);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 3 — My Library & albums
  const libraryNav = await waitForSelector('[data-tour-id="/my-kitab"]');
  if (!libraryNav || cancelledRef.current) return;
  rect = await ringAndPause(libraryNav, "circle", "My Library", "Every note you save lands here.", 3);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(libraryNav, rect);
  if (cancelledRef.current) return;

  const notesCard = await waitForSelector(".mykitab-notes-card");
  if (notesCard && !cancelledRef.current) {
    const r = await api.settleAndMeasure(notesCard, { scrollIntoView: true });
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Albums & Tags", "Notes are organized into albums here, and browsable by tag.", 3);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 4 — Upload & annotate your own PDFs
  const addPdfBtn = await waitForSelector(".mykitab-add-pdf-btn");
  if (addPdfBtn && !cancelledRef.current) {
    const r = await api.settleAndMeasure(addPdfBtn, { scrollIntoView: true });
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Upload Your Own PDFs", "Add your own PDFs here, then note and tag them the same way.", 4);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 5 — Page View (Mushaf mode)
  const quranNavAgain = await waitForSelector('[data-tour-id="/surahs"]');
  if (!quranNavAgain || cancelledRef.current) return;
  rect = await ringAndPause(quranNavAgain, "circle", "Quran", "Back to the Quran, for Page View.", 5);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(quranNavAgain, rect);
  if (cancelledRef.current) return;

  const surahRowAgain = await waitForSelector(".surah-list-item");
  if (!surahRowAgain || cancelledRef.current) return;
  rect = await ringAndPause(surahRowAgain, "rounded", "Open a Surah", "Let's open Al-Fatihah again.", 5);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(surahRowAgain, rect);
  if (cancelledRef.current) return;

  const pageViewBtn = await waitForNthSelector(".quran-view-toggle-btn", 1);
  if (!pageViewBtn || cancelledRef.current) return;
  rect = await ringAndPause(pageViewBtn, "rounded", "Page View", "Tap here to read as real Mushaf pages.", 5);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(pageViewBtn, rect);
  if (cancelledRef.current) return;

  const pageNumberEl = await waitForSelector(".mushaf-page-number");
  if (pageNumberEl && !cancelledRef.current) {
    const frame = pageNumberEl.closest(".mushaf-page-frame") || pageNumberEl;
    const r = await api.settleAndMeasure(frame);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Mushaf Page View", "The traditional 15-line Madani layout, page by page.", 5);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 6 — additional reciters
  const reciterTrigger = await waitForSelector(".reciter-select-trigger");
  if (reciterTrigger && !cancelledRef.current) {
    rect = await ringAndPause(reciterTrigger, "rounded", "More Reciters", "Tap here to see the reciter list.", 6);
    if (rect && !cancelledRef.current) {
      await tapAndSettle(reciterTrigger, rect);
      if (!cancelledRef.current) {
        const premiumOption = await waitForSelector(".reciter-option-premium");
        if (premiumOption && !cancelledRef.current) {
          const r = await api.settleAndMeasure(premiumOption, { scrollIntoView: true });
          if (cancelledRef.current) return;
          setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
          setCard("More Reciters", "7 additional reciters are now unlocked and ready to play.", 6);
          await waitForNextPress();
          if (cancelledRef.current) return;
        }
        const closeBtn = document.querySelector(".ayah-picker-close");
        closeBtn?.click();
        await sleep(200);
      }
    }
  }

  // Step 7 — custom duas (Dhikr)
  const dhikrNav = await waitForSelector('[data-tour-id="/athkar"]');
  if (!dhikrNav || cancelledRef.current) return;
  rect = await ringAndPause(dhikrNav, "circle", "Dhikr", "One more thing, over in Dhikr.", 7);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(dhikrNav, rect);
  if (cancelledRef.current) return;

  const myDuasCard = await waitForSelector('[data-tour-id="/athkar/my-duas"]');
  if (!myDuasCard || cancelledRef.current) return;
  rect = await ringAndPause(myDuasCard, "rounded", "My Duas", "Your own custom duas now live here.", 7);
  if (!rect || cancelledRef.current) return;
  await tapAndSettle(myDuasCard, rect);
  if (cancelledRef.current) return;

  const duaArabicField = await waitForSelector(".custom-dua-arabic-input");
  if (duaArabicField && !cancelledRef.current) {
    const r = await api.settleAndMeasure(duaArabicField, { scrollIntoView: true });
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Write a Dua", "Write your own dua in Arabic…", 7);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  const duaEnglishField = await waitForSelector(".note-editor-textarea");
  if (duaEnglishField && !cancelledRef.current) {
    const r = await api.settleAndMeasure(duaEnglishField);
    if (cancelledRef.current) return;
    setDisplay({ kind: "spotlight", rect: r, shape: "rounded", live: false });
    setCard("Write a Dua", "…add the English translation, then save it.", 7);
    await waitForNextPress();
    if (cancelledRef.current) return;
  }

  // Step 8 — done
  setDisplay({ kind: "center", rect: null, shape: "circle", live: false });
  setCard(
    "You're All Set",
    "That's everything Premium unlocks. Enjoy exploring My Kitab!",
    8
  );
  setIsFinal(true);
}
