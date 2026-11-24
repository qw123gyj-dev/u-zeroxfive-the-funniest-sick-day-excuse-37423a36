// The Funniest Sick-Day Excuse.
//
// A program that writes ONE line of text, 1 to 200 characters, to
// $MAKEFUN_OUTPUT_DIR/entry.txt (fallback: /output/entry.txt): a funny
// reason to call in sick that someone could actually send to their boss,
// and nothing else.
//
// The program holds fourteen hand-written candidate excuses, ranks them
// with a small deterministic scorer built on the judge's own brief, and
// writes the winner. The judge weighs, most important first:
//   1. A reason to call in sick that a boss might half believe and a
//      coworker would laugh at; loses to any reason that gets a bigger
//      laugh. So every candidate pairs a real, mundane ailment or injury
//      with a laugh device -- usually the injured body part behaving like
//      a bureaucrat, a lawyer, or a victorious enemy.
//   2. A fresh idea rather than a worn excuse about a fever, a dog or a
//      dead grandmother. None of the candidates uses any of those, or any
//      other stock sick-day prop (flu, cold, migraine, funeral).
//   3. It lands on one read, with the twist or the funniest word arriving
//      near the end. Every candidate is built as setup, then payoff: the
//      last clause carries the joke.
//   4. It sounds like a real person typing a message, not a joke built for
//      a contest. Every candidate opens the way a real text to a boss
//      opens -- "Sorry", "Can't make it in", "I'm out today" -- and is
//      written in the first person, with contractions.
//   5. It wastes no words: every part of the line is doing work. No filler
//      words, no throat-clearing, no second joke stapled on after the
//      first one lands.
//
// Node 22+, standard library only, no network, fully deterministic: the
// same output on every run. The winning line is chosen by score alone,
// with ties broken toward the shorter line and then the earliest
// candidate, so the pick cannot change between runs.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The gate: 1 to 200 characters, exactly one line, no trailing newline.
const MAX_CHARS = 200;
const MIN_CHARS = 1;

type Candidate = { text: string };

// ---------------------------------------------------------------------------
// Candidates
//
// Every line is written by hand for this bounty. Each one is a text message
// a real person could plausibly send a boss: a mundane, believable mishap
// (a sneeze, socks, a goose, an eye test, a snooze button) with the laugh
// arriving in the final clause, where a body part or an object starts
// behaving like a person with a grievance. No fevers, no dogs, no dead
// grandmothers, no funerals, no flu.
// ---------------------------------------------------------------------------
const CANDIDATES: Candidate[] = [
  {
    // A sneeze is the most believable injury there is, and the back
    // answering it with a formal complaint is the joke. The payoff --
    // "can't stand up straight" -- lands on the last word.
    text: "Sorry, can't come in — I sneezed so hard my back filed a formal complaint and now I can't stand up straight.",
  },
  {
    // Putting on socks is the most adult way to injure a back, and
    // needing a day to grieve about it is the twist: the injury is small,
    // the mourning is enormous, and the whole thing is true.
    text: "I'm off today — my back went out while I was putting on socks, which is the most adult injury possible and I need a day to grieve.",
  },
  {
    // A goose chase is half believable because geese really are like
    // that. Revised: the line used to end on the ankle ("ice my dignity
    // and my ankle"), which put the joke before the last word; now the
    // dignity is iced last, so the funniest word ends the line.
    text: "Can't make it in — I went for a run, got chased by a goose, and now I have to ice my ankle and my dignity.",
  },
  {
    // Eye dilation is a real, boring medical fact; the payoff is the
    // whole world turning into a watercolour, laptop included. Revised:
    // the line used to run past the payoff ("including my laptop"), so
    // the funniest word sat mid-line; now the laptop is folded into the
    // middle and the watercolour ends the line.
    text: "Sorry, can't come in — the optician dilated my eyes and now the whole world, laptop included, looks like a watercolour.",
  },
  {
    // The snooze button is the smallest possible enemy, and losing a
    // fight to it is the joke. "The snooze button won" is five words
    // that carry the whole line, and they sit at the very end.
    text: "Sorry, I'm out today — I pulled a muscle reaching for the snooze button and the doctor says the snooze button won.",
  },
  {
    // Food poisoning is believable; a stomach declaring independence
    // is not, and that gap is the joke. Ninety-three characters, one
    // clause of setup, one clause of secession, done.
    text: "I'm off sick — I ate a petrol station sushi at 2am and my stomach has filed for independence.",
  },
  {
    // Winning against a jar of pickles should be a triumph; the shoulder
    // filing a formal complaint turns the victory into a defeat. Same
    // legal-personification device as the sneeze line, different body
    // part, different crime.
    text: "Can't come in — I opened a jar of pickles, won the jar, and now my shoulder has filed a formal complaint.",
  },
  {
    // Sunburn through a window is a real thing that really happens, and
    // "a lobster that works in IT" is the image a coworker repeats at
    // lunch. The job detail in the last four words is the twist.
    text: "Sorry, I'm out — I got sunburned through my office window and now I look like a lobster that works in IT.",
  },
  {
    // A head stuck in a turtleneck is slapstick, but the fire brigade
    // treating it as a two-person job is what sells it: an official
    // response to an undignified problem, reported deadpan.
    text: "I can't come in — I got my head stuck in a turtleneck and the fire brigade says it's a two-person job now.",
  },
  {
    // The chair is fine and the human is not: the repair succeeded and
    // the repairer failed, which is the exact shape of a household
    // injury story, and the last five words are the whole punchline.
    text: "Sorry, can't make it — I tried to fix my desk chair at home and now the chair is fine and I am not.",
  },
  {
    // A banana peel in your own kitchen is the oldest pratfall there is,
    // which is why the knee pressing charges feels fresh: the injury
    // escalates to a lawsuit in the final clause, and nobody saw it
    // coming from a banana.
    text: "I'm out today — I slipped on a banana peel in my own kitchen and my knee is pressing charges.",
  },
  {
    // Wisdom teeth really do arrive unannounced and really do hurt; the
    // joke is the tooth bringing the whole jaw with it, as if it were
    // moving house. Short, plain, and the twist is the last clause.
    text: "Can't come in — my wisdom tooth decided to arrive today and it's bringing the whole jaw with it.",
  },
  {
    // A twitching eye after a printer jam is the office worker's injury,
    // and the twitch graduating to morse code is the escalation. The
    // boss has seen the printer jam; the morse code is the surprise.
    text: "Sorry, I'm off — my eye hasn't stopped twitching since the printer jammed, and now it twitches in morse code.",
  },
  {
    // Flat-pack furniture defeats everyone; the joke is admitting defeat
    // in the language of a treaty negotiation. "Negotiating the
    // surrender" is the funniest phrase in the line, and it ends it.
    text: "I'm out sick — I built a flat-pack wardrobe, the wardrobe won, and my shoulder is still negotiating the surrender.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons
//
// The scorer reads each candidate the way the judge's brief reads it:
// believability first, then freshness, then the landing, then the voice,
// then the economy. Every list below is explicit, so the score of any line
// can be recomputed by hand from the words on the page.
// ---------------------------------------------------------------------------

// Words naming a real ailment or injury: the half-believable half of
// criterion 1. A line needs at least one to be a sick-day excuse at all.
const AILMENT_WORDS = [
  "back", "ankle", "eye", "eyes", "stomach", "shoulder", "jaw", "knee",
  "muscle", "tooth", "head", "sunburned",
];

// Words naming the mundane cause: the setup the boss can picture. A cause
// plus an ailment is what makes the line half believable instead of invented.
const CAUSE_WORDS = [
  "sneezed", "socks", "goose", "optician", "snooze", "sushi", "pickles",
  "window", "turtleneck", "chair", "banana", "printer", "wardrobe",
  "run", "fix",
];

// Laugh devices: the words that do the comic work. Three families:
// the body part as a bureaucrat or litigant, the inanimate object as a
// victorious enemy, and the injury escalated into an image nobody expects.
const LAUGH_WORDS = [
  "formal complaint", "pressing charges", "filed for independence",
  "negotiating the surrender", "won", "grieve", "dignity", "watercolour",
  "morse code", "two person job", "lobster", "fine and i am not",
  "bringing the whole jaw", "most adult injury",
];

// The worn excuses the brief names, and their close cousins. Any one of
// these in a line drops its freshness to the floor: the judge has read
// every one of them a hundred times.
const BANNED_WORDS = [
  "fever", "flu", "cold", "cough", "dog", "puppy", "grandma",
  "grandmother", "grandad", "grandfather", "dead", "died", "funeral",
  "migraine", "headache", "vomit", "throwing up",
];

// Payoff words: the twist, or the funniest word. The scorer looks for
// them in the final clause, because criterion 3 wants the laugh to arrive
// near the end, not up front.
const PAYOFF_WORDS = [
  "grieve", "won", "charges", "independence", "complaint", "dignity",
  "watercolour", "morse", "lobster", "surrender", "not", "job now",
  "with it", "straight",
];

// Openers and markers of a real person typing a message to a boss:
// an apology or a plain statement, first person, contractions.
const VOICE_OPENERS = ["sorry", "can't make it", "i'm off", "i'm out", "can't come in"];
const VOICE_MARKERS = ["i'm", "i ", "my ", "can't", "sorry", "today"];

// Filler words that do no work. A line carrying one has wasted a word.
const FILLER_WORDS = [
  "just", "really", "very", "actually", "basically", "literally",
  "quite", "somewhat", "honestly", "well,",
];

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

// Normalise text for matching: lower case, punctuation and hyphens
// become spaces, runs of space collapse, and the result is padded with a
// space at each end. This matters because a word at the end of a line
// ("grieve.") or before a comma ("socks,") is still that word, and a
// scorer that missed it would rank lines on punctuation, not on jokes.
// Apostrophes are kept, so contractions ("can't", "i'm") still match.
function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[.,;:!?—–\-"“”()]+/g, " ")
    .replace(/\s+/g, " ")} `;
}

// Count how many distinct entries of `words` occur in `text`, matching
// whole words (or whole phrases) case-insensitively, on the normalised
// text, so a word followed by a full stop or a comma still counts.
function countHits(text: string, words: string[]): number {
  const lower = normalize(text);
  let hits = 0;
  for (const w of words) {
    const needle = ` ${w} `;
    if (lower.includes(needle)) hits += 1;
  }
  return hits;
}

// The final clause: everything from the last sentence break (an em dash,
// a comma before the last clause, or the last "and") to the end. The
// twist has to live here for the line to land in one read.
function finalClause(text: string): string {
  const lower = text.toLowerCase();
  const markers = [" — ", ", and ", " and ", "; "];
  let cut = 0;
  for (const m of markers) {
    const idx = lower.lastIndexOf(m);
    if (idx > cut) cut = idx + m.length;
  }
  return text.slice(cut);
}

// The last three words of the line: where the funniest word should sit.
function lastWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.slice(-n).join(" ");
}

// ---------------------------------------------------------------------------
// The scorer
//
// Weights follow the judge's own order: believability plus laugh first,
// then freshness, then the landing, then the voice, then the economy.
// Each criterion scores 0 to 1; the total is the weighted sum plus a
// small landing bonus for a payoff word inside the last three words.
// ---------------------------------------------------------------------------

type Score = {
  total: number;
  believableLaugh: number;
  freshness: number;
  landing: number;
  voice: number;
  tightness: number;
  bonus: number;
};

// Criterion 1 (weight 0.35): half believable AND funny. Half of it is the
// believable half -- a real ailment caused by a mundane thing the boss can
// picture -- and half is the laugh -- a comic device doing visible work.
// A line with no ailment scores 0 here and can never win, because it is
// not a sick-day excuse at all.
function scoreBelievableLaugh(text: string): number {
  const ailment = countHits(text, AILMENT_WORDS) > 0 ? 1 : 0;
  const cause = Math.min(1, countHits(text, CAUSE_WORDS) / 2);
  const laugh = Math.min(1, countHits(text, LAUGH_WORDS) / 2);
  const believable = 0.5 * ailment + 0.5 * cause;
  return 0.5 * believable + 0.5 * laugh;
}

// Criterion 2 (weight 0.25): freshness. A clean line scores 1; any worn
// excuse -- fever, dog, dead grandmother, or their cousins -- drops it
// to 0.2, because the judge has read that excuse a hundred times.
function scoreFreshness(text: string): number {
  return countHits(text, BANNED_WORDS) > 0 ? 0.2 : 1;
}

// Criterion 3 (weight 0.20): lands in one read. Half of it is a payoff
// word sitting in the final clause, half is the payoff sitting in the
// last three words -- the funniest word arriving near the end.
function scoreLanding(text: string): number {
  const tail = finalClause(text);
  const inTail = countHits(tail, PAYOFF_WORDS) > 0 ? 1 : 0;
  const inLastThree = countHits(lastWords(text, 3), PAYOFF_WORDS) > 0 ? 1 : 0;
  return 0.5 * inTail + 0.5 * inLastThree;
}

// Criterion 4 (weight 0.10): sounds like a real person typing a message.
// A boss-text opener plus first-person markers and contractions.
function scoreVoice(text: string): number {
  const lower = text.toLowerCase();
  const opener = VOICE_OPENERS.some((o) => lower.startsWith(o) || lower.includes(`— ${o}`) || lower.includes(o))
    ? 1
    : 0;
  const markers = Math.min(1, countHits(text, VOICE_MARKERS) / 3);
  return 0.5 * opener + 0.5 * markers;
}

// Criterion 5 (weight 0.10): wastes no words. A line with no filler
// scores 1; each filler word costs a fifth. Length for its own sake does
// not count, so length is never rewarded or punished here -- only filler.
function scoreTightness(text: string): number {
  const filler = countHits(text, FILLER_WORDS);
  return Math.max(0, 1 - 0.2 * filler);
}

function scoreCandidate(text: string): Score {
  const believableLaugh = scoreBelievableLaugh(text);
  const freshness = scoreFreshness(text);
  const landing = scoreLanding(text);
  const voice = scoreVoice(text);
  const tightness = scoreTightness(text);
  // Landing bonus: +0.05 when the funniest word is inside the last three
  // words, so a line that ends on its joke edges out one that ends past it.
  const bonus =
    countHits(lastWords(text, 3), PAYOFF_WORDS) > 0 ? 0.05 : 0;
  const total =
    0.35 * believableLaugh +
    0.25 * freshness +
    0.20 * landing +
    0.10 * voice +
    0.10 * tightness +
    bonus;
  return { total, believableLaugh, freshness, landing, voice, tightness, bonus };
}

// ---------------------------------------------------------------------------
// Gate
//
// The sealed scorer checks that entry.txt is UTF-8 text of 1 to 200
// characters, not only white space. We check the same thing here before
// writing, and again after reading the file back, so a bad line can never
// be submitted by accident.
// ---------------------------------------------------------------------------

function gateCheck(text: string): string | null {
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    return `length ${text.length} outside ${MIN_CHARS}-${MAX_CHARS}`;
  }
  if (text.trim().length === 0) return "only white space";
  if (text !== text.trim()) return "leading or trailing white space";
  if (text.includes("\n") || text.includes("\r")) return "more than one line";
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Score every candidate, then pick the winner: highest total, ties
  // broken toward the shorter line, then the earliest candidate.
  const scored = CANDIDATES.map((c, i) => ({ index: i, text: c.text, score: scoreCandidate(c.text) }));
  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.index - b.index;
  });

  // Print the whole table, so the choice can be checked by hand.
  for (const s of scored) {
    const sc = s.score;
    console.log(
      `#${s.index + 1} ${sc.total.toFixed(3)} ` +
        `(believable+laugh ${sc.believableLaugh.toFixed(2)}, ` +
        `fresh ${sc.freshness.toFixed(2)}, land ${sc.landing.toFixed(2)}, ` +
        `voice ${sc.voice.toFixed(2)}, tight ${sc.tightness.toFixed(2)}, ` +
        `bonus ${sc.bonus.toFixed(2)}) [${s.text.length} chars] ${s.text}`,
    );
  }

  const winner = scored[0];
  const problem = gateCheck(winner.text);
  if (problem) {
    throw new Error(`winner failed the gate: ${problem}: ${winner.text}`);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.text, "utf8");

  // Read it back and verify byte for byte: exactly the winner, exactly
  // one line, inside the gate. If the read-back differs, fail loudly
  // instead of submitting a line nobody checked.
  const back = readFileSync(outPath, "utf8");
  if (back !== winner.text) {
    throw new Error(`read-back mismatch: wrote ${winner.text.length} chars, read ${back.length}`);
  }
  const backProblem = gateCheck(back);
  if (backProblem) {
    throw new Error(`read-back failed the gate: ${backProblem}`);
  }

  console.log(`\nWinner (#${winner.index + 1}, ${winner.text.length} chars): ${winner.text}`);
  console.log(`Wrote ${outPath}`);
}

main();
