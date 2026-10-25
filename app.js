const $ = (id) => document.getElementById(id);

let VERBS = [];
let knownSet = new Set(); // session-only: verbs you marked as known (hidden)
let currentQuestion = null;
let answered = false;
let correctCount = 0;
let attemptedCount = 0;

const PRONOUNS_PRESENT = [
  { labelHe: "אני (ז)", presentKey: "ms" },
  { labelHe: "אני (נ)", presentKey: "fs" },
  { labelHe: "אתה", presentKey: "ms" },
  { labelHe: "את", presentKey: "fs" },
  { labelHe: "הוא", presentKey: "ms" },
  { labelHe: "היא", presentKey: "fs" },
  { labelHe: "אנחנו", presentKey: "mp" },
  { labelHe: "אתם", presentKey: "mp" },
  { labelHe: "אתן", presentKey: "fp" },
  { labelHe: "הם", presentKey: "mp" },
  { labelHe: "הן", presentKey: "fp" },
];

const PRONOUNS_PAST = [
  { labelHe: "אני", pastKey: "ani" },
  { labelHe: "אתה", pastKey: "ata" },
  { labelHe: "את", pastKey: "at" },
  { labelHe: "הוא", pastKey: "hu" },
  { labelHe: "היא", pastKey: "hi" },
  { labelHe: "אנחנו", pastKey: "anachnu" },
  { labelHe: "אתם", pastKey: "atem" },
  { labelHe: "אתן", pastKey: "aten" },
  { labelHe: "הם", pastKey: "hem" },
  { labelHe: "הן", pastKey: "hen" },
];

const PRONOUNS_FUTURE = [
  { labelHe: "אני", futureKey: "ani" },
  { labelHe: "אתה", futureKey: "ata" },
  { labelHe: "את", futureKey: "at" },
  { labelHe: "הוא", futureKey: "hu" },
  { labelHe: "היא", futureKey: "hi" },
  { labelHe: "אנחנו", futureKey: "anachnu" },
  { labelHe: "אתם", futureKey: "atem" },
  { labelHe: "אתן", futureKey: "aten" },
  { labelHe: "הם", futureKey: "hem" },
  { labelHe: "הן", futureKey: "hen" },
];

function randInt(n){ return Math.floor(Math.random() * n); }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = randInt(i+1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickRandom(arr){ return arr[randInt(arr.length)]; }

function getEnabledModes(){
  const modes = [];
  if ($("toggleEnHe").checked) modes.push("EN_TO_HE");
  if ($("toggleHeEn").checked) modes.push("HE_TO_EN");
  if ($("toggleFuture").checked) modes.push("FUTURE");
  if ($("togglePast").checked) modes.push("PAST");
  return modes;
}

const BINYAN_TOGGLES = ["togglePaal","togglePiel","toggleHifil","toggleHitpael","toggleNifal"];
const BINYAN_MAP = {togglePaal:"Paal",togglePiel:"Piel",toggleHifil:"Hifil",toggleHitpael:"Hitpael",toggleNifal:"Nifal"};

function getEnabledBinyanim(){
  const set = new Set();
  for (const id of BINYAN_TOGGLES){
    if ($(id).checked) set.add(BINYAN_MAP[id]);
  }
  return set;
}

function remainingVerbs(){
  const bin = getEnabledBinyanim();
  return VERBS.filter(v => !knownSet.has(v.id) && bin.has(v.binyan));
}

function updateProgress(){
  // Progress = Known / Total (session-only)
  const total = VERBS.length || 1;
  const known = knownSet.size;
  const pct = Math.max(0, Math.min(100, Math.round((known / total) * 100)));
  const bar = $("progressBar");
  if (bar) bar.style.width = pct + "%";
}

function updateScore(){
  const el = $("score");
  if (el) el.textContent = "Score: " + correctCount + "/" + attemptedCount;
}

function openResults(){
  const overlay = $("resultsOverlay");
  if (!overlay) return;

  const scoreEl = $("resultsScore");
  const accEl = $("resultsAcc");

  const scoreText = correctCount + "/" + attemptedCount;
  const acc = attemptedCount ? Math.round((correctCount / attemptedCount) * 100) : 0;

  if (scoreEl) scoreEl.textContent = "Score: " + scoreText;
  if (accEl) accEl.textContent = "Accuracy: " + acc + "%";

  overlay.classList.remove("hidden");
  try{ $("closeResultsBtn").focus(); }catch(e){}
}

function closeResults(){
  const overlay = $("resultsOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function showToast(text){
  const t = $("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=> t.classList.add("hidden"), 1200);
}

function resultsText(){
  const scoreText = correctCount + "/" + attemptedCount;
  const acc = attemptedCount ? Math.round((correctCount / attemptedCount) * 100) : 0;
  return `כל הכבוד!\nScore: ${scoreText}\nAccuracy: ${acc}%`;
}

async function shareResults(){
  const text = resultsText();
  const url = window.location.href;

  if (navigator.share){
    try{
      await navigator.share({ text: text + "\n" + url });
      return;
    }catch(e){
      // fall back to copy
    }
  }

  try{
    await navigator.clipboard.writeText(text + "\n" + url);
    showToast("Copied");
  }catch(e){
    window.prompt("Copy your results:", text + "\n" + url);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function isHebrew(s){ return /[\u0590-\u05FF]/.test(s || ""); }
function heSpan(word, extraClass=""){ 
  const cls = ["rtl", extraClass].filter(Boolean).join(" ");
  return `<span class="${cls}">${escapeHtml(word)}</span>`;
}

function phraseHe(pronoun, verbForm){
  const text = `${pronoun} ${verbForm}`.trim();
  return `<span class="rtl">${escapeHtml(text)}</span>`;
}

function rootHtml(verb){
  const r = (verb && verb.root) ? String(verb.root).trim() : "";
  if (!r) return `<div class="rootLine">Root: <span class="rootValue">—</span></div>`;
  return `<div class="rootLine">Root: <span class="rootValue rtl">${escapeHtml(r)}</span></div>`;
}

function normalizeEn(s){ return String(s || "").trim().toLowerCase().replace(/\s+/g," "); }

function buildMCQOptions(correct, distractors, count){
  const opts = new Set([correct]);
  const pool = shuffle(distractors);
  for (const d of pool){
    if (opts.size >= count) break;
    opts.add(d);
  }
  return shuffle([...opts]);
}

// Build MCQ options as {value, display} pairs for niqqud support
function buildMCQPairs(correctVal, correctDisp, distractorPairs, count){
  const seen = new Set([correctVal]);
  const result = [{value: correctVal, display: correctDisp}];
  const pool = shuffle(distractorPairs);
  for (const d of pool){
    if (result.length >= count) break;
    if (!seen.has(d.value)){
      seen.add(d.value);
      result.push(d);
    }
  }
  return shuffle(result);
}

function getNiqqudForm(verb, tense, key){
  if (!verb) return "";
  if (tense === "inf") return verb.infinitive_niqqud || "";
  if (tense === "present") return (verb.present_niqqud && verb.present_niqqud[key]) ? verb.present_niqqud[key] : "";
  if (tense === "past") return (verb.past_niqqud && verb.past_niqqud[key]) ? verb.past_niqqud[key] : "";
  if (tense === "future") return (verb.future_niqqud && verb.future_niqqud[key]) ? verb.future_niqqud[key] : "";
  return "";
}

function pickSameVerbMixedFormPairs(verb, correctVal, correctDisp, mode){
  const presKeys = ["ms","fs","mp","fp"];
  const personKeys = ["ani","ata","at","hu","hi","anachnu","atem","aten","hem","hen"];

  function presPairs(){ return verb.present ? presKeys.map(k => ({value: verb.present[k], display: getNiqqudForm(verb,"present",k) || verb.present[k]})).filter(p=>p.value) : []; }
  function pastPairs(){ return verb.past ? personKeys.map(k => ({value: verb.past[k], display: getNiqqudForm(verb,"past",k) || verb.past[k]})).filter(p=>p.value) : []; }
  function futPairs(){ return verb.future ? personKeys.map(k => ({value: verb.future[k], display: getNiqqudForm(verb,"future",k) || verb.future[k]})).filter(p=>p.value) : []; }

  let pool = [];
  if (mode === "FUTURE") {
    pool = [...futPairs(), ...shuffle(pastPairs()).slice(0, 6), ...shuffle(presPairs()).slice(0, 2)];
  } else if (mode === "PAST") {
    pool = [...pastPairs(), ...shuffle(futPairs()).slice(0, 6), ...shuffle(presPairs()).slice(0, 2)];
  } else {
    pool = [...presPairs(), ...shuffle(pastPairs()).slice(0, 4), ...shuffle(futPairs()).slice(0, 4)];
  }

  // deduplicate by value
  const seen = new Set();
  pool = pool.filter(p => { if (!p.value || seen.has(p.value)) return false; seen.add(p.value); return true; });
  const distractors = pool.filter(p => p.value !== correctVal);
  return buildMCQPairs(correctVal, correctDisp, distractors, 4);
}

function makeQuestion(){
  const pool = remainingVerbs();
  if (pool.length === 0){
    return {
      type: "DONE",
      modeLabel: "Done",
      promptHtml: "🎉 Session complete",
      subpromptHtml: "You marked all verbs as known for this session. Press “Reset” to start over.",
    };
  }

  const modes = getEnabledModes();
  const mode = modes.length ? pickRandom(modes) : "EN_TO_HE";

  const v = pickRandom(pool);

  if (mode === "EN_TO_HE"){
    const meaningAll = v.en.join(" / ");
    const promptHtml = `<span>${escapeHtml(meaningAll)}</span>`;
    const subpromptHtml = `Translate to Hebrew (infinitive).`;
    const correct = v.infinitive;
    const correctDisp = v.infinitive_niqqud || v.infinitive;

    const distractorPairs = VERBS.filter(x=>x.id!==v.id).map(x=>({value: x.infinitive, display: x.infinitive_niqqud || x.infinitive}));
    const options = buildMCQPairs(correct, correctDisp, distractorPairs, 4);

    const answerLine = heSpan(correctDisp, "bigHeb");

    return { type:"Q", mode:"EN_TO_HE", modeLabel:"EN → HE", verb:v, promptHtml, subpromptHtml, correct, options,
      accept: (ans)=> ans === correct,
      showAnswer: () => `${answerLine}${rootHtml(v)}`
    };
  }

  if (mode === "HE_TO_EN"){
    const infDisp = v.infinitive_niqqud || v.infinitive;
    const promptHtml = `${heSpan(infDisp, "bigHeb")}${rootHtml(v)}`;
    const subpromptHtml = `Translate to English.`;
    const correct = v.en.join(" / ");

    const distractors = shuffle(VERBS.filter(x=>x.id!==v.id).map(x=>x.en.join(" / "))).slice(0, 80);
    const options = buildMCQOptions(correct, distractors, 4);

    return { type:"Q", mode:"HE_TO_EN", modeLabel:"HE → EN", verb:v, promptHtml, subpromptHtml, correct, options,
      accept: (ans)=> normalizeEn(ans) === normalizeEn(correct),
      showAnswer: () => escapeHtml(v.en.join(" / "))
    };
  }

  if (mode === "FUTURE"){
    if (!v.future || Object.keys(v.future).length === 0) return makeQuestion();
    const p = pickRandom(PRONOUNS_FUTURE);
    const correct = v.future[p.futureKey];
    if (!correct) return makeQuestion();
    const correctDisp = getNiqqudForm(v, "future", p.futureKey) || correct;

    const infDisp = v.infinitive_niqqud || v.infinitive;
    const enHint = v.en.join(" / ");
    const promptHtml = `${heSpan(infDisp, "bigHeb")}<div class="enHint">${escapeHtml(enHint)}</div>${rootHtml(v)}`;
    const subpromptHtml =
      `<div class="kicker">Future tense — choose the correct form for:</div>` +
      `${heSpan(p.labelHe, "pronounBig")}`;

    const options = pickSameVerbMixedFormPairs(v, correct, correctDisp, "FUTURE");

    const show = phraseHe(p.labelHe, correctDisp);

    return { type:"Q", mode:"FUTURE", modeLabel:"Future", verb:v, promptHtml, subpromptHtml, correct, options,
      accept: (ans)=> ans === correct,
      showAnswer: () => `${show}${rootHtml(v)}`
    };
  }

  if (!v.past || Object.keys(v.past).length === 0) return makeQuestion();
  const p = pickRandom(PRONOUNS_PAST);
  const correct = v.past[p.pastKey];
  if (!correct) return makeQuestion();
  const correctDisp = getNiqqudForm(v, "past", p.pastKey) || correct;

  const infDisp = v.infinitive_niqqud || v.infinitive;
  const enHint = v.en.join(" / ");
  const promptHtml = `${heSpan(infDisp, "bigHeb")}<div class="enHint">${escapeHtml(enHint)}</div>${rootHtml(v)}`;
  const subpromptHtml =
    `<div class="kicker">Past tense — choose the correct form for:</div>` +
    `${heSpan(p.labelHe, "pronounBig")}`;

  const options = pickSameVerbMixedFormPairs(v, correct, correctDisp, "PAST");

  const show = phraseHe(p.labelHe, correctDisp);

  return { type:"Q", mode:"PAST", modeLabel:"Past", verb:v, promptHtml, subpromptHtml, correct, options,
    accept: (ans)=> ans === correct,
    showAnswer: () => `${show}${rootHtml(v)}`
  };
}

function renderQuestion(q){
  currentQuestion = q;
  answered = false;

  $("modePill").textContent = q.modeLabel;
  $("binyanPill").textContent = (q.verb && q.verb.binyan) ? q.verb.binyan : "";
  $("prompt").innerHTML = q.promptHtml || "";
  $("subprompt").innerHTML = q.subpromptHtml || "";

  $("feedback").classList.add("hidden");
  $("feedback").innerHTML = "";
  $("nextBtn").classList.add("hidden");
  $("showBtn").classList.toggle("hidden", q.type !== "Q");
  $("knownBtn").classList.toggle("hidden", q.type !== "Q");

  $("mcq").classList.add("hidden");

  if (q.type === "DONE"){
    updateProgress();
    return;
  }

  $("mcq").innerHTML = "";
  for (const opt of q.options){
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";

    // opt can be a string or {value, display} pair
    const val = typeof opt === "object" ? opt.value : opt;
    const disp = typeof opt === "object" ? opt.display : opt;

    const isHe = isHebrew(disp);
    const makeBig = isHe && (q.mode === "FUTURE" || q.mode === "PAST" || q.mode === "EN_TO_HE");
    btn.innerHTML = isHe ? heSpan(disp, makeBig ? "choiceHeb" : "") : escapeHtml(disp);
    btn.dataset.value = val;

    btn.addEventListener("click", () => onAnswer(val, btn));
    $("mcq").appendChild(btn);
  }
  $("mcq").classList.remove("hidden");

  updateProgress();
}

function showFeedback(ok, messageHtml, smallHtml){
  const fb = $("feedback");
  fb.classList.remove("hidden");
  fb.classList.toggle("ok", ok);
  fb.classList.toggle("bad", !ok);
  fb.innerHTML = `<div>${messageHtml}</div>` + (smallHtml ? `<div class="small">${smallHtml}</div>` : "");
  $("nextBtn").classList.remove("hidden");
  try{ $("nextBtn").focus(); }catch(e){}
}

function markChoices(correct){
  const buttons = $("mcq").querySelectorAll("button.choice");
  buttons.forEach(b=>{
    if (b.dataset.value === correct) b.classList.add("correct");
  });
}

function onAnswer(answer, clickedBtn=null){
  if (answered || currentQuestion.type !== "Q") return;
  answered = true;

  const ok = currentQuestion.accept(answer);

  attemptedCount += 1;
  if (ok) correctCount += 1;
  updateScore();
  if (clickedBtn){
    clickedBtn.classList.add(ok ? "correct" : "wrong");
    markChoices(currentQuestion.correct);
  }

  if (ok){
    showFeedback(true, "✅ Correct!", `Answer: ${currentQuestion.showAnswer()}`);
  } else {
    showFeedback(false, "❌ Not quite.", `Correct answer: ${currentQuestion.showAnswer()}`);
  }
}

function onShow(){
  if (currentQuestion.type !== "Q") return;
  if (!answered){
    answered = true;
    showFeedback(false, "ℹ️ Answer shown.", `Correct answer: ${currentQuestion.showAnswer()}`);
  }
}

function onNext(){ renderQuestion(makeQuestion()); }

function onKnown(){
  if (currentQuestion.type !== "Q") return;
  if (currentQuestion.verb && currentQuestion.verb.id){
    knownSet.add(currentQuestion.verb.id);
  }
  updateProgress();
  renderQuestion(makeQuestion());
}

function onReset(){
  knownSet = new Set();
  updateProgress();
  renderQuestion(makeQuestion());
}

async function init(){
  $("nextBtn").addEventListener("click", onNext);
  $("showBtn").addEventListener("click", onShow);
  $("knownBtn").addEventListener("click", onKnown);
  $("resetBtn").addEventListener("click", onReset);

  const finishBtn = $("finishBtn");
  if (finishBtn) finishBtn.addEventListener("click", openResults);
  const closeBtn = $("closeResultsBtn");
  if (closeBtn) closeBtn.addEventListener("click", closeResults);
  const shareBtn = $("shareResultsBtn");
  if (shareBtn) shareBtn.addEventListener("click", shareResults);
  const overlay = $("resultsOverlay");
  if (overlay) overlay.addEventListener("click", (e)=>{ if (e.target && e.target.id === "resultsOverlay") closeResults(); });

  ["toggleEnHe","toggleHeEn","toggleFuture","togglePast"].forEach(id=>{
    $(id).addEventListener("change", ()=> renderQuestion(makeQuestion()));
  });
  BINYAN_TOGGLES.forEach(id=>{
    $(id).addEventListener("change", ()=> renderQuestion(makeQuestion()));
  });

  const res = await fetch("verbs.json", { cache: "no-store" });
  VERBS = await res.json();

  updateProgress();
  renderQuestion(makeQuestion());
}

init().catch(err=>{
  console.error(err);
  $("prompt").textContent = "Failed to load verbs.json";
  $("subprompt").textContent = String(err);
});
