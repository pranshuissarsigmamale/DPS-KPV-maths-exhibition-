/* =========================================================
   INTERACTIVE MATHS HUB
   Main JavaScript
   ========================================================= */

"use strict";

/* =========================================================
   1. GLOBAL CONFIGURATION
   ========================================================= */

const APP_CONFIG = {
    quizQuestions: 20,
    speedDuration: 60,
    maxLives: 3,

    difficulty: {
        easy: {
            label: "Easy",
            multiplier: 1
        },
        medium: {
            label: "Medium",
            multiplier: 1.5
        },
        hard: {
            label: "Hard",
            multiplier: 2
        }
    },

    levels: [
        {
            name: "Beginner",
            minXP: 0
        },
        {
            name: "Number Ninja",
            minXP: 500
        },
        {
            name: "Algebra Master",
            minXP: 1200
        },
        {
            name: "Geometry Pro",
            minXP: 2500
        },
        {
            name: "Maths Legend",
            minXP: 5000
        }
    ]
};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const defaultState = {
    xp: 0,
    level: "Beginner",

    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,

    currentStreak: 0,
    bestStreak: 0,

    lives: APP_CONFIG.maxLives,

    dailyXP: 0,
    dailyGoal: 100,

    badges: [],

    chapterStats: {},

    difficulty: "medium",
    difficultyLocked: false,

    quizScore: 0,
    speedHighScore: 0,

    questionsAnsweredToday: 0,
    lastActiveDate: "",

    quizActive: false,
    speedActive: false
};

let appState = loadState();


/* =========================================================
   3. DOM HELPER
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $all(selector) {
    return document.querySelectorAll(selector);
}

function safeText(selector, value) {
    const element = $(selector);

    if (element) {
        element.textContent = value;
    }
}

function safeValue(selector, value) {
    const element = $(selector);

    if (element) {
        element.value = value;
    }
}


/* =========================================================
   4. LOCAL STORAGE
   ========================================================= */

function loadState() {
    try {
        const saved = localStorage.getItem("interactiveMathsHubState");

        if (!saved) {
            return structuredClone
                ? structuredClone(defaultState)
                : JSON.parse(JSON.stringify(defaultState));
        }

        const parsed = JSON.parse(saved);

        return {
            ...defaultState,
            ...parsed
        };
    } catch (error) {
        console.warn("Could not load saved progress:", error);

        return {
            ...defaultState
        };
    }
}

function saveState() {
    try {
        localStorage.setItem(
            "interactiveMathsHubState",
            JSON.stringify(appState)
        );
    } catch (error) {
        console.warn("Could not save progress:", error);
    }
}


/* =========================================================
   5. DATE MANAGEMENT
   ========================================================= */

function getToday() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}

function checkDailyReset() {
    const today = getToday();

    if (appState.lastActiveDate !== today) {
        appState.dailyXP = 0;
        appState.questionsAnsweredToday = 0;
        appState.lastActiveDate = today;

        saveState();
    }
}


/* =========================================================
   6. LEVEL SYSTEM
   ========================================================= */

function calculateLevel() {
    let currentLevel = APP_CONFIG.levels[0];

    for (const level of APP_CONFIG.levels) {
        if (appState.xp >= level.minXP) {
            currentLevel = level;
        }
    }

    appState.level = currentLevel.name;

    return currentLevel;
}

function getNextLevel() {
    const currentIndex = APP_CONFIG.levels.findIndex(
        level => level.name === appState.level
    );

    if (
        currentIndex === -1 ||
        currentIndex >= APP_CONFIG.levels.length - 1
    ) {
        return null;
    }

    return APP_CONFIG.levels[currentIndex + 1];
}


/* =========================================================
   7. XP SYSTEM
   ========================================================= */

function calculateXP(difficulty, streak = appState.currentStreak) {
    const difficultyData =
        APP_CONFIG.difficulty[difficulty] ||
        APP_CONFIG.difficulty.medium;

    let baseXP = 10;

    if (difficulty === "easy") {
        baseXP = 10;
    }

    if (difficulty === "medium") {
        baseXP = 15;
    }

    if (difficulty === "hard") {
        baseXP = 25;
    }

    let streakBonus = 0;

    if (streak >= 3) {
        streakBonus = Math.min(streak * 2, 30);
    }

    return Math.round(
        baseXP * difficultyData.multiplier + streakBonus
    );
}

function addXP(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
        return;
    }

    const oldLevel = appState.level;

    appState.xp += Math.round(amount);
    appState.dailyXP += Math.round(amount);

    calculateLevel();

    if (oldLevel !== appState.level) {
        showNotification(
            `🎉 Level Up! You are now a ${appState.level}!`
        );
    }

    checkBadges();
    saveState();
    updateDashboard();
}


/* =========================================================
   8. STREAK SYSTEM
   ========================================================= */

function registerCorrectAnswer() {
    appState.currentStreak++;

    if (appState.currentStreak > appState.bestStreak) {
        appState.bestStreak = appState.currentStreak;
    }
}

function registerWrongAnswer() {
    appState.currentStreak = 0;

    if (appState.lives > 0) {
        appState.lives--;
    }
}


/* =========================================================
   9. STATISTICS
   ========================================================= */

function getAccuracy() {
    if (appState.totalQuestions <= 0) {
        return 0;
    }

    return Math.round(
        (appState.correctAnswers /
            appState.totalQuestions) *
            100
    );
}

function updateChapterStats(chapter, correct) {
    if (!chapter) {
        return;
    }

    if (!appState.chapterStats[chapter]) {
        appState.chapterStats[chapter] = {
            answered: 0,
            correct: 0
        };
    }

    appState.chapterStats[chapter].answered++;

    if (correct) {
        appState.chapterStats[chapter].correct++;
    }
}

function getChapterAccuracy(chapter) {
    const stats = appState.chapterStats[chapter];

    if (!stats || stats.answered === 0) {
        return 0;
    }

    return Math.round(
        (stats.correct / stats.answered) * 100
    );
}

function getStrongestChapter() {
    const chapters = Object.keys(appState.chapterStats);

    if (!chapters.length) {
        return "Not enough data";
    }

    return chapters.reduce((best, chapter) => {
        if (!best) {
            return chapter;
        }

        return getChapterAccuracy(chapter) >
            getChapterAccuracy(best)
            ? chapter
            : best;
    }, "");
}

function getWeakestChapter() {
    const chapters = Object.keys(appState.chapterStats);

    if (!chapters.length) {
        return "Not enough data";
    }

    return chapters.reduce((worst, chapter) => {
        if (!worst) {
            return chapter;
        }

        return getChapterAccuracy(chapter) <
            getChapterAccuracy(worst)
            ? chapter
            : worst;
    }, "");
}


/* =========================================================
   10. DASHBOARD
   ========================================================= */

function updateDashboard() {
    calculateLevel();

    const accuracy = getAccuracy();
    const nextLevel = getNextLevel();

    safeText("#xpDisplay", appState.xp);
    safeText("#currentXP", appState.xp);

    safeText("#levelDisplay", appState.level);
    safeText("#currentLevel", appState.level);

    safeText("#accuracyDisplay", `${accuracy}%`);
    safeText("#accuracy", `${accuracy}%`);

    safeText(
        "#questionsSolved",
        appState.totalQuestions
    );

    safeText(
        "#correctAnswers",
        appState.correctAnswers
    );

    safeText(
        "#incorrectAnswers",
        appState.incorrectAnswers
    );

    safeText(
        "#streakDisplay",
        appState.currentStreak
    );

    safeText(
        "#bestStreak",
        appState.bestStreak
    );

    safeText(
        "#dailyXP",
        appState.dailyXP
    );

    safeText(
        "#dailyGoal",
        appState.dailyGoal
    );

    safeText(
        "#strongestChapter",
        getStrongestChapter()
    );

    safeText(
        "#weakestChapter",
        getWeakestChapter()
    );

    safeText(
        "#speedHighScore",
        appState.speedHighScore
    );

    if (nextLevel) {
        safeText(
            "#nextLevel",
            nextLevel.name
        );

        safeText(
            "#nextLevelXP",
            nextLevel.minXP
        );
    }

    updateXPProgress();
    updateDailyProgress();
    updateLivesDisplay();
}

function updateXPProgress() {
    const currentLevelIndex =
        APP_CONFIG.levels.findIndex(
            level => level.name === appState.level
        );

    if (currentLevelIndex === -1) {
        return;
    }

    const current =
        APP_CONFIG.levels[currentLevelIndex];

    const next =
        APP_CONFIG.levels[currentLevelIndex + 1];

    let percentage = 100;

    if (next) {
        const range =
            next.minXP - current.minXP;

        const progress =
            appState.xp - current.minXP;

        percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    (progress / range) * 100
                )
            );
    }

    const bars = $all(
        "#xpProgress, .xp-progress-bar"
    );

    bars.forEach(bar => {
        bar.style.width = `${percentage}%`;
    });
}

function updateDailyProgress() {
    const percentage = Math.max(
        0,
        Math.min(
            100,
            (appState.dailyXP /
                Math.max(appState.dailyGoal, 1)) *
                100
        )
    );

    const bars = $all(
        "#dailyProgress, .daily-progress-bar"
    );

    bars.forEach(bar => {
        bar.style.width = `${percentage}%`;
    });
}

function updateLivesDisplay() {
    const livesElements =
        $all(".life, .quiz-life");

    livesElements.forEach((element, index) => {
        if (index < appState.lives) {
            element.classList.add("active");
        } else {
            element.classList.remove("active");
        }
    });
}


/* =========================================================
   11. BADGES
   ========================================================= */

const BADGES = [
    {
        id: "first-answer",
        name: "First Step",
        description: "Answer your first question.",
        condition: () =>
            appState.totalQuestions >= 1
    },

    {
        id: "ten-correct",
        name: "Getting Sharp",
        description: "Answer 10 questions correctly.",
        condition: () =>
            appState.correctAnswers >= 10
    },

    {
        id: "fifty-correct",
        name: "Math Machine",
        description: "Answer 50 questions correctly.",
        condition: () =>
            appState.correctAnswers >= 50
    },

    {
        id: "streak-five",
        name: "Hot Streak",
        description: "Reach a 5-question streak.",
        condition: () =>
            appState.bestStreak >= 5
    },

    {
        id: "streak-ten",
        name: "Unstoppable",
        description: "Reach a 10-question streak.",
        condition: () =>
            appState.bestStreak >= 10
    },

    {
        id: "daily-goal",
        name: "Daily Champion",
        description: "Complete your daily XP goal.",
        condition: () =>
            appState.dailyXP >= appState.dailyGoal
    },

    {
        id: "speed-20",
        name: "Speed Demon",
        description: "Score 20+ in Speed Challenge.",
        condition: () =>
            appState.speedHighScore >= 20
    }
];

function checkBadges() {
    BADGES.forEach(badge => {
        if (
            badge.condition() &&
            !appState.badges.includes(badge.id)
        ) {
            appState.badges.push(badge.id);

            showNotification(
                `🏅 Badge unlocked: ${badge.name}`
            );
        }
    });

    saveState();
    renderBadges();
}

function renderBadges() {
    const container =
        $("#badgesContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    BADGES.forEach(badge => {
        const unlocked =
            appState.badges.includes(badge.id);

        const card =
            document.createElement("div");

        card.className =
            `badge-card ${
                unlocked ? "unlocked" : "locked"
            }`;

        card.innerHTML = `
            <div class="badge-icon">
                ${unlocked ? "🏅" : "🔒"}
            </div>

            <div class="badge-name">
                ${escapeHTML(badge.name)}
            </div>

            <div class="badge-description">
                ${escapeHTML(badge.description)}
            </div>
        `;

        container.appendChild(card);
    });
}


/* =========================================================
   12. DIFFICULTY SYSTEM
   ========================================================= */

function setDifficulty(level) {
    if (!APP_CONFIG.difficulty[level]) {
        return;
    }

    if (appState.difficultyLocked) {
        showNotification(
            "🔒 Difficulty is locked for this quiz."
        );

        return;
    }

    appState.difficulty = level;

    updateDifficultyUI();
    saveState();
}

function updateDifficultyUI() {
    $all(
        "[data-difficulty]"
    ).forEach(button => {
        const selected =
            button.dataset.difficulty ===
            appState.difficulty;

        button.classList.toggle(
            "active",
            selected
        );
    });

    safeText(
        "#selectedDifficulty",
        APP_CONFIG.difficulty[
            appState.difficulty
        ].label
    );
}

function lockDifficulty() {
    if (appState.difficultyLocked) {
        return;
    }

    const confirmed = window.confirm(
        `⚠️ Lock difficulty to ${
            APP_CONFIG.difficulty[
                appState.difficulty
            ].label
        }?

You will not be able to change it during this quiz.`
    );

    if (!confirmed) {
        return;
    }

    appState.difficultyLocked = true;

    updateDifficultyUI();
    saveState();

    showNotification(
        "🔒 Difficulty locked."
    );
}

function unlockDifficulty() {
    appState.difficultyLocked = false;

    saveState();

    showNotification(
        "🔓 Difficulty unlocked."
    );
}


/* =========================================================
   13. QUESTION BANK
   ========================================================= */

const QUESTION_BANK = [

    /* EASY */

    {
        question: "What is 7 + 8?",
        options: ["13", "14", "15", "16"],
        answer: 2,
        difficulty: "easy",
        chapter: "Numbers"
    },

    {
        question: "What is 9 × 6?",
        options: ["45", "54", "63", "72"],
        answer: 1,
        difficulty: "easy",
        chapter: "Numbers"
    },

    {
        question: "What is half of 50?",
        options: ["20", "25", "30", "35"],
        answer: 1,
        difficulty: "easy",
        chapter: "Fractions"
    },

    {
        question: "How many sides does a triangle have?",
        options: ["2", "3", "4", "5"],
        answer: 1,
        difficulty: "easy",
        chapter: "Geometry"
    },

    {
        question: "What is 100 ÷ 10?",
        options: ["5", "10", "20", "100"],
        answer: 1,
        difficulty: "easy",
        chapter: "Numbers"
    },

    /* MEDIUM */

    {
        question: "Solve: 3x + 5 = 20",
        options: ["3", "5", "7", "10"],
        answer: 1,
        difficulty: "medium",
        chapter: "Algebra"
    },

    {
        question: "What is 25% of 200?",
        options: ["25", "40", "50", "75"],
        answer: 2,
        difficulty: "medium",
        chapter: "Percentages"
    },

    {
        question: "What is the area of a rectangle 8 cm × 5 cm?",
        options: ["13 cm²", "26 cm²", "40 cm²", "80 cm²"],
        answer: 2,
        difficulty: "medium",
        chapter: "Mensuration"
    },

    {
        question: "What is the next number: 2, 4, 8, 16, ___?",
        options: ["20", "24", "32", "36"],
        answer: 2,
        difficulty: "medium",
        chapter: "Patterns"
    },

    {
        question: "A ₹500 item has a 10% discount. What is the sale price?",
        options: ["₹450", "₹460", "₹490", "₹550"],
        answer: 0,
        difficulty: "medium",
        chapter: "Percentages"
    },

    /* HARD */

    {
        question: "If 2x + 7 = 19, what is x?",
        options: ["5", "6", "7", "8"],
        answer: 1,
        difficulty: "hard",
        chapter: "Algebra"
    },

    {
        question: "What is the square of 17?",
        options: ["279", "289", "299", "309"],
        answer: 1,
        difficulty: "hard",
        chapter: "Numbers"
    },

    {
        question: "A triangle has angles 45° and 65°. What is the third angle?",
        options: ["60°", "70°", "80°", "90°"],
        answer: 1,
        difficulty: "hard",
        chapter: "Geometry"
    },

    {
        question: "If 3 : 5 = x : 20, what is x?",
        options: ["9", "10", "12", "15"],
        answer: 2,
        difficulty: "hard",
        chapter: "Ratio"
    },

    {
        question: "What is 15² − 10²?",
        options: ["100", "125", "150", "175"],
        answer: 1,
        difficulty: "hard",
        chapter: "Numbers"
    }
];


/* =========================================================
   14. QUESTION FILTERING
   ========================================================= */

function getQuestionsForDifficulty(
    difficulty,
    amount = APP_CONFIG.quizQuestions
) {
    let questions =
        QUESTION_BANK.filter(
            question =>
                question.difficulty === difficulty
        );

    /*
     * If the selected difficulty has too few
     * questions, use questions from the whole bank.
     */

    if (questions.length < amount) {
        questions = [...QUESTION_BANK];
    }

    return shuffleArray(
        questions
    ).slice(
        0,
        Math.min(amount, questions.length)
    );
}


/* =========================================================
   15. QUIZ STATE
   ========================================================= */

let currentQuiz = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let quizCorrect = 0;
let quizWrong = 0;


/* =========================================================
   16. START QUIZ
   ========================================================= */

function startQuiz() {
    checkDailyReset();

    currentQuiz =
        getQuestionsForDifficulty(
            appState.difficulty
        );

    if (!currentQuiz.length) {
        showNotification(
            "No questions are available."
        );

        return;
    }

    currentQuestionIndex = 0;
    quizScore = 0;
    quizCorrect = 0;
    quizWrong = 0;

    appState.quizActive = true;
    appState.lives = APP_CONFIG.maxLives;

    appState.difficultyLocked = true;

    saveState();

    updateLivesDisplay();
    showQuizQuestion();
}


/* =========================================================
   17. SHOW QUIZ QUESTION
   ========================================================= */

function showQuizQuestion() {
    if (
        currentQuestionIndex >=
        currentQuiz.length
    ) {
        finishQuiz();

        return;
    }

    const question =
        currentQuiz[
            currentQuestionIndex
        ];

    safeText(
        "#quizQuestion",
        question.question
    );

    safeText(
        "#questionNumber",
        `${currentQuestionIndex + 1} / ${
            currentQuiz.length
        }`
    );

    safeText(
        "#quizScore",
        quizScore
    );

    const optionButtons =
        $all(
            ".quiz-option, [data-answer]"
        );

    optionButtons.forEach(
        (button, index) => {
            const option =
                question.options[index];

            if (option === undefined) {
                button.style.display =
                    "none";

                return;
            }

            button.style.display = "";

            button.textContent =
                option;

            button.dataset.answer =
                index;

            button.disabled = false;

            button.classList.remove(
                "correct",
                "wrong"
            );
        }
    );

    updateQuizProgress();
}

function updateQuizProgress() {
    const percentage =
        (
            currentQuestionIndex /
            Math.max(currentQuiz.length, 1)
        ) * 100;

    const progressBars =
        $all(
            ".quiz-progress-bar, #quizProgress"
        );

    progressBars.forEach(bar => {
        bar.style.width =
            `${percentage}%`;
    });
}


/* =========================================================
   18. ANSWER QUESTION
   ========================================================= */

function answerQuizQuestion(selectedIndex) {
    if (!appState.quizActive) {
        return;
    }

    const question =
        currentQuiz[
            currentQuestionIndex
        ];

    if (!question) {
        return;
    }

    const selected =
        Number(selectedIndex);

    if (
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= question.options.length
    ) {
        return;
    }

    const correct =
        selected === question.answer;

    const buttons =
        $all(
            ".quiz-option, [data-answer]"
        );

    buttons.forEach(button => {
        button.disabled = true;

        const answer =
            Number(button.dataset.answer);

        if (
            answer === question.answer
        ) {
            button.classList.add(
                "correct"
            );
        }

        if (
            answer === selected &&
            !correct
        ) {
            button.classList.add(
                "wrong"
            );
        }
    });

    appState.totalQuestions++;
    appState.questionsAnsweredToday++;

    updateChapterStats(
        question.chapter,
        correct
    );

    if (correct) {
        quizCorrect++;

        registerCorrectAnswer();

        const gainedXP =
            calculateXP(
                appState.difficulty,
                appState.currentStreak
            );

        quizScore +=
            Math.round(
                100 *
                APP_CONFIG.difficulty[
                    appState.difficulty
                ].multiplier
            );

        addXP(gainedXP);
    } else {
        quizWrong++;

        registerWrongAnswer();

        appState.incorrectAnswers++;
    }

    if (correct) {
        appState.correctAnswers++;
    }

    saveState();
    updateDashboard();
    updateLivesDisplay();

    /*
     * Give the player time to see the
     * correct/wrong state.
     */

    window.setTimeout(() => {
        if (
            appState.lives <= 0
        ) {
            finishQuiz();

            return;
        }

        currentQuestionIndex++;

        showQuizQuestion();
    }, 700);
}


/* =========================================================
   19. FINISH QUIZ
   ========================================================= */

function finishQuiz() {
    appState.quizActive = false;
    appState.difficultyLocked = false;

    appState.quizScore = quizScore;

    saveState();

    const total =
        quizCorrect + quizWrong;

    const accuracy =
        total > 0
            ? Math.round(
                (quizCorrect / total) *
                100
            )
            : 0;

    safeText(
        "#finalScore",
        quizScore
    );

    safeText(
        "#finalAccuracy",
        `${accuracy}%`
    );

    safeText(
        "#finalCorrect",
        quizCorrect
    );

    safeText(
        "#finalWrong",
        quizWrong
    );

    const modal =
        $("#quizResults");

    if (modal) {
        modal.classList.add("open");
    }

    /*
     * Requested warning:
     * if 15 out of 20 or more are wrong.
     */

    if (
        currentQuiz.length >= 20 &&
        quizWrong >= 15
    ) {
        showNotification(
            "⚠️ Warning: 15 or more questions were incorrect. Consider lowering the difficulty and practising first."
        );
    }

    checkBadges();
    updateDashboard();
}


/* =========================================================
   20. SPEED CHALLENGE
   ========================================================= */

let speedTimeRemaining =
    APP_CONFIG.speedDuration;

let speedScore = 0;
let speedTimer = null;
let speedQuestion = null;

function startSpeedChallenge() {
    if (appState.speedActive) {
        return;
    }

    appState.speedActive = true;

    speedScore = 0;

    speedTimeRemaining =
        APP_CONFIG.speedDuration;

    appState.lives =
        APP_CONFIG.maxLives;

    saveState();

    safeText(
        "#speedScore",
        speedScore
    );

    safeText(
        "#speedTimer",
        speedTimeRemaining
    );

    showSpeedQuestion();

    speedTimer =
        window.setInterval(() => {
            speedTimeRemaining--;

            safeText(
                "#speedTimer",
                speedTimeRemaining
            );

            if (
                speedTimeRemaining <= 0
            ) {
                finishSpeedChallenge();
            }
        }, 1000);
}

function getSpeedQuestion() {
    const difficulty =
        appState.difficulty;

    const filtered =
        QUESTION_BANK.filter(
            question =>
                question.difficulty ===
                difficulty
        );

    const pool =
        filtered.length
            ? filtered
            : QUESTION_BANK;

    return pool[
        Math.floor(
            Math.random() *
            pool.length
        )
    ];
}

function showSpeedQuestion() {
    speedQuestion =
        getSpeedQuestion();

    if (!speedQuestion) {
        return;
    }

    safeText(
        "#speedQuestion",
        speedQuestion.question
    );

    const buttons =
        $all(
            ".speed-option, [data-speed-answer]"
        );

    buttons.forEach(
        (button, index) => {
            if (
                speedQuestion.options[index] ===
                undefined
            ) {
                button.style.display =
                    "none";

                return;
            }

            button.style.display = "";

            button.textContent =
                speedQuestion.options[index];

            button.dataset.speedAnswer =
                index;

            button.disabled = false;

            button.classList.remove(
                "correct",
                "wrong"
            );
        }
    );
}

function answerSpeedQuestion(index) {
    if (
        !appState.speedActive ||
        !speedQuestion
    ) {
        return;
    }

    const selected =
        Number(index);

    const correct =
        selected ===
        speedQuestion.answer;

    const buttons =
        $all(
            ".speed-option, [data-speed-answer]"
        );

    buttons.forEach(button => {
        button.disabled = true;
    });

    if (correct) {
        speedScore++;

        registerCorrectAnswer();

        addXP(
            Math.max(
                5,
                calculateXP(
                    appState.difficulty,
                    appState.currentStreak
                ) / 2
            )
        );
    } else {
        registerWrongAnswer();
    }

    safeText(
        "#speedScore",
        speedScore
    );

    window.setTimeout(
        showSpeedQuestion,
        200
    );
}

function finishSpeedChallenge() {
    if (!appState.speedActive) {
        return;
    }

    appState.speedActive = false;

    if (speedTimer !== null) {
        window.clearInterval(
            speedTimer
        );

        speedTimer = null;
    }

    if (
        speedScore >
        appState.speedHighScore
    ) {
        appState.speedHighScore =
            speedScore;

        showNotification(
            `🏆 New Speed Challenge High Score: ${speedScore}!`
        );
    }

    saveState();

    safeText(
        "#speedFinalScore",
        speedScore
    );

    const modal =
        $("#speedResults");

    if (modal) {
        modal.classList.add("open");
    }

    checkBadges();
    updateDashboard();
}


/* =========================================================
   21. CALCULATOR
   ========================================================= */

let calculatorExpression = "";

function calculatorInput(value) {
    if (
        typeof value !== "string" &&
        typeof value !== "number"
    ) {
        return;
    }

    calculatorExpression +=
        String(value);

    updateCalculatorDisplay();
}

function calculatorClear() {
    calculatorExpression = "";

    updateCalculatorDisplay();
}

function calculatorBackspace() {
    calculatorExpression =
        calculatorExpression.slice(
            0,
            -1
        );

    updateCalculatorDisplay();
}

function calculatorCalculate() {
    if (!calculatorExpression) {
        return;
    }

    /*
     * Only allow safe mathematical
     * characters.
     */

    if (
        !/^[0-9+\-*/().%\s]+$/.test(
            calculatorExpression
        )
    ) {
        showNotification(
            "Invalid calculator expression."
        );

        return;
    }

    try {
        const expression =
            calculatorExpression.replace(
                /%/g,
                "/100"
            );

        const result =
            Function(
                `"use strict"; return (${expression})`
            )();

        if (
            !Number.isFinite(result)
        ) {
            throw new Error(
                "Invalid result"
            );
        }

        calculatorExpression =
            String(
                Number(
                    result.toFixed(10)
                )
            );

        updateCalculatorDisplay();
    } catch (error) {
        showNotification(
            "Could not calculate that expression."
        );
    }
}

function updateCalculatorDisplay() {
    safeText(
        "#calculatorDisplay",
        calculatorExpression || "0"
    );

    safeValue(
        "#calculatorInput",
        calculatorExpression
    );
}


/* =========================================================
   22. ABACUS
   ========================================================= */

let abacusValue = 0;

function setAbacusValue(value) {
    const numeric =
        Number(value);

    if (!Number.isFinite(numeric)) {
        return;
    }

    abacusValue =
        Math.max(
            0,
            Math.floor(numeric)
        );

    updateAbacus();
}

function updateAbacus() {
    safeText(
        "#abacusValue",
        abacusValue
    );

    const display =
        $("#abacusDisplay");

    if (display) {
        display.value =
            abacusValue;
    }

    renderAbacusBeads();
}

function renderAbacusBeads() {
    const container =
        $("#abacus");

    if (!container) {
        return;
    }

    const digits =
        String(abacusValue)
            .padStart(5, "0")
            .split("")
            .map(Number);

    const rods =
        $all(".abacus-rod");

    rods.forEach(
        (rod, rodIndex) => {
            const digit =
                digits[rodIndex] || 0;

            const beads =
                rod.querySelectorAll(
                    ".abacus-bead"
                );

            beads.forEach(
                (bead, beadIndex) => {
                    bead.classList.toggle(
                        "active",
                        beadIndex <
                            digit
                    );
                }
            );
        }
    );
}


/* =========================================================
   23. GRAPHING CALCULATOR
   ========================================================= */

function graphFunction() {
    const input =
        $("#graphFunction");

    const canvas =
        $("#graphCanvas");

    if (!input || !canvas) {
        return;
    }

    const expression =
        input.value.trim();

    if (!expression) {
        showNotification(
            "Enter a function first."
        );

        return;
    }

    const ctx =
        canvas.getContext("2d");

    if (!ctx) {
        return;
    }

    const width =
        canvas.width;

    const height =
        canvas.height;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    drawGraphGrid(
        ctx,
        width,
        height
    );

    /*
     * Safe conversion of common
     * mathematical functions.
     */

    let formula =
        expression
            .replace(
                /\^/g,
                "**"
            )
            .replace(
                /\bsin\b/gi,
                "Math.sin"
            )
            .replace(
                /\bcos\b/gi,
                "Math.cos"
            )
            .replace(
                /\btan\b/gi,
                "Math.tan"
            )
            .replace(
                /\bsqrt\b/gi,
                "Math.sqrt"
            )
            .replace(
                /\babs\b/gi,
                "Math.abs"
            );

    /*
     * Reject obviously dangerous
     * JavaScript syntax.
     */

    if (
        /[;{}[\]"'`=<>]/.test(
            formula
        )
    ) {
        showNotification(
            "Invalid graph function."
        );

        return;
    }

    const scale = 25;

    ctx.beginPath();

    let started = false;

    for (
        let pixelX = 0;
        pixelX < width;
        pixelX++
    ) {
        const x =
            (
                pixelX -
                width / 2
            ) / scale;

        let y;

        try {
            y = Function(
                "x",
                `"use strict"; return (${formula});`
            )(x);
        } catch {
            showNotification(
                "Could not read that function."
            );

            return;
        }

        if (
            !Number.isFinite(y)
        ) {
            started = false;
            continue;
        }

        const pixelY =
            height / 2 -
            y * scale;

        if (
            pixelY < -10000 ||
            pixelY > 10000
        ) {
            started = false;
            continue;
        }

        if (!started) {
            ctx.moveTo(
                pixelX,
                pixelY
            );

            started = true;
        } else {
            ctx.lineTo(
                pixelX,
                pixelY
            );
        }
    }

    ctx.stroke();
}

function drawGraphGrid(
    ctx,
    width,
    height
) {
    const spacing = 25;

    ctx.beginPath();

    for (
        let x = 0;
        x <= width;
        x += spacing
    ) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    for (
        let y = 0;
        y <= height;
        y += spacing
    ) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        width / 2,
        0
    );

    ctx.lineTo(
        width / 2,
        height
    );

    ctx.moveTo(
        0,
        height / 2
    );

    ctx.lineTo(
        width,
        height / 2
    );

    ctx.stroke();
}


/* =========================================================
   24. REAL-LIFE MATH
   ========================================================= */

const REAL_LIFE_CHALLENGES = [
    {
        title: "Shopping Discount",
        problem:
            "A ₹2,000 jacket is discounted by 20%. What is the final price?",
        answer: 1600
    },

    {
        title: "Recipe Ratio",
        problem:
            "A recipe uses 2 cups of flour for 4 people. How much is needed for 8 people?",
        answer: 4
    },

    {
        title: "Sports Statistics",
        problem:
            "A player scores 20, 15 and 25 points. What is the average?",
        answer: 20
    },

    {
        title: "Room Measurement",
        problem:
            "A room is 5 m long and 4 m wide. What is its area?",
        answer: 20
    }
];

function getRandomRealLifeChallenge() {
    return REAL_LIFE_CHALLENGES[
        Math.floor(
            Math.random() *
            REAL_LIFE_CHALLENGES.length
        )
    ];
}

function displayRealLifeChallenge() {
    const challenge =
        getRandomRealLifeChallenge();

    safeText(
        "#realLifeTitle",
        challenge.title
    );

    safeText(
        "#realLifeQuestion",
        challenge.problem
    );

    const answer =
        $("#realLifeAnswer");

    if (answer) {
        answer.dataset.answer =
            challenge.answer;

        answer.value = "";
    }
}

function checkRealLifeAnswer() {
    const answer =
        $("#realLifeAnswer");

    if (!answer) {
        return;
    }

    const entered =
        Number(answer.value);

    const correct =
        Number(
            answer.dataset.answer
        );

    if (
        Number.isFinite(entered) &&
        Math.abs(
            entered - correct
        ) < 0.000001
    ) {
        registerCorrectAnswer();

        appState.totalQuestions++;
        appState.correctAnswers++;

        addXP(15);

        showNotification(
            "✅ Correct! +15 XP"
        );
    } else {
        registerWrongAnswer();

        appState.totalQuestions++;
        appState.incorrectAnswers++;

        showNotification(
            "❌ Not quite. Try again!"
        );
    }

    saveState();
    updateDashboard();
}


/* =========================================================
   25. DAILY CHALLENGE
   ========================================================= */

function generateDailyChallenge() {
    const challenges = [
        "Calculate 15% of 300.",
        "Find the area of a 12 × 7 rectangle.",
        "Solve: 4x = 36.",
        "What is 25 × 16?",
        "Find the average of 10, 20 and 30."
    ];

    const index =
        new Date().getDate() %
        challenges.length;

    safeText(
        "#dailyChallenge",
        challenges[index]
    );
}


/* =========================================================
   26. NAVIGATION
   ========================================================= */

function showSection(sectionId) {
    if (!sectionId) {
        return;
    }

    const sections =
        $all(
            ".page-section, .content-section, [data-section]"
        );

    sections.forEach(section => {
        const matches =
            section.id === sectionId ||
            section.dataset.section ===
                sectionId;

        section.classList.toggle(
            "active",
            matches
        );

        if (matches) {
            section.removeAttribute(
                "hidden"
            );
        } else {
            section.setAttribute(
                "hidden",
                ""
            );
        }
    });

    $all(
        "[data-nav]"
    ).forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.nav ===
                sectionId
        );
    });
}


/* =========================================================
   27. SIDEBAR
   ========================================================= */

function openSidebar() {
    const sidebar =
        $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.add("open");

    document.body.classList.add(
        "sidebar-open"
    );
}

function closeSidebar() {
    const sidebar =
        $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove("open");

    document.body.classList.remove(
        "sidebar-open"
    );
}

function toggleSidebar() {
    const sidebar =
        $("#sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.contains("open")
        ? closeSidebar()
        : openSidebar();
}


/* =========================================================
   28. MODALS
   ========================================================= */

function openModal(id) {
    const modal = $(`#${id}`);

    if (!modal) {
        return;
    }

    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}

function closeModal(id) {
    const modal = $(`#${id}`);

    if (!modal) {
        return;
    }

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}

function closeAllModals() {
    $all(
        ".modal.open"
    ).forEach(modal => {
        modal.classList.remove(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    });
}


/* =========================================================
   29. NOTIFICATION SYSTEM
   ========================================================= */

function showNotification(message) {
    let container =
        $("#notificationContainer");

    if (!container) {
        container =
            document.createElement("div");

        container.id =
            "notificationContainer";

        document.body.appendChild(
            container
        );
    }

    const notification =
        document.createElement("div");

    notification.className =
        "notification";

    notification.textContent =
        message;

    container.appendChild(
        notification
    );

    window.setTimeout(() => {
        notification.classList.add(
            "show"
        );
    }, 10);

    window.setTimeout(() => {
        notification.classList.remove(
            "show"
        );

        window.setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}


/* =========================================================
   30. SHUFFLE
   ========================================================= */

function shuffleArray(array) {
    const result =
        [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


/* =========================================================
   31. HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   32. RESET PROGRESS
   ========================================================= */

function resetProgress() {
    const confirmed =
        window.confirm(
            "⚠️ This will permanently erase your XP, levels, badges, streaks and statistics. Continue?"
        );

    if (!confirmed) {
        return;
    }

    appState = {
        ...defaultState
    };

    saveState();

    location.reload();
}


/* =========================================================
   33. EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /* Sidebar */

    const menuButton =
        $("#menuButton");

    if (menuButton) {
        menuButton.addEventListener(
            "click",
            toggleSidebar
        );
    }

    const closeSidebarButton =
        $("#closeSidebar");

    if (closeSidebarButton) {
        closeSidebarButton.addEventListener(
            "click",
            closeSidebar
        );
    }


    /* Navigation */

    $all(
        "[data-nav]"
    ).forEach(item => {
        item.addEventListener(
            "click",
            () => {
                showSection(
                    item.dataset.nav
                );

                closeSidebar();
            }
        );
    });


    /* Difficulty */

    $all(
        "[data-difficulty]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                setDifficulty(
                    button.dataset.difficulty
                );
            }
        );
    });


    const lockButton =
        $("#lockDifficulty");

    if (lockButton) {
        lockButton.addEventListener(
            "click",
            lockDifficulty
        );
    }


    /* Quiz */

    const startQuizButton =
        $("#startQuiz");

    if (startQuizButton) {
        startQuizButton.addEventListener(
            "click",
            startQuiz
        );
    }

    $all(
        ".quiz-option, [data-answer]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                answerQuizQuestion(
                    button.dataset.answer
                );
            }
        );
    });


    /* Speed Challenge */

    const speedStart =
        $("#startSpeedChallenge");

    if (speedStart) {
        speedStart.addEventListener(
            "click",
            startSpeedChallenge
        );
    }

    $all(
        ".speed-option, [data-speed-answer]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                answerSpeedQuestion(
                    button.dataset.speedAnswer
                );
            }
        );
    });


    /* Calculator */

    $all(
        "[data-calc]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const action =
                    button.dataset.calc;

                if (
                    action === "clear"
                ) {
                    calculatorClear();
                } else if (
                    action === "backspace"
                ) {
                    calculatorBackspace();
                } else if (
                    action === "="
                ) {
                    calculatorCalculate();
                } else {
                    calculatorInput(
                        action
                    );
                }
            }
        );
    });


    /* Graph */

    const graphButton =
        $("#graphButton");

    if (graphButton) {
        graphButton.addEventListener(
            "click",
            graphFunction
        );
    }


    /* Real Life */

    const realLifeButton =
        $("#realLifeCheck");

    if (realLifeButton) {
        realLifeButton.addEventListener(
            "click",
            checkRealLifeAnswer
        );
    }


    /* Daily challenge */

    const dailyButton =
        $("#dailyChallengeButton");

    if (dailyButton) {
        dailyButton.addEventListener(
            "click",
            displayRealLifeChallenge
        );
    }


    /* Reset */

    const resetButton =
        $("#resetProgress");

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetProgress
        );
    }


    /* Modal close buttons */

    $all(
        "[data-close-modal]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                closeModal(
                    button.dataset.closeModal
                );
            }
        );
    });


    /* Escape key */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {
                closeAllModals();
                closeSidebar();
            }

            if (
                event.key === "Enter"
            ) {
                const active =
                    document.activeElement;

                if (
                    active &&
                    active.id ===
                        "calculatorInput"
                ) {
                    calculatorCalculate();
                }
            }
        }
    );
}


/* =========================================================
   34. INITIALIZATION
   ========================================================= */

function initializeApp() {

    checkDailyReset();

    calculateLevel();

    setupEventListeners();

    updateDashboard();

    updateDifficultyUI();

    renderBadges();

    generateDailyChallenge();

    updateCalculatorDisplay();

    updateAbacus();

    /*
     * Show homepage by default.
     */

    const homepage =
        document.querySelector(
            "#home"
        );

    if (homepage) {
        showSection("home");
    }

    /*
     * Make sure quiz results are
     * initially hidden.
     */

    $all(
        ".modal"
    ).forEach(modal => {
        modal.setAttribute(
            "aria-hidden",
            modal.classList.contains(
                "open"
            )
                ? "false"
                : "true"
        );
    });

    console.log(
        "Interactive Maths Hub initialized successfully."
    );
}


/* =========================================================
   35. START APPLICATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}
    calculateLevel();

    setupEventListeners();

    updateDashboard();

    updateDifficultyUI();

    renderBadges();

    generateDailyChallenge();

    updateCalculatorDisplay();

    updateAbacus();

    /*
     * Show homepage by default.
     */

    const homepage =
        document.querySelector(
            "#home"
        );

    if (homepage) {
        showSection("home");
    }

    /*
     * Make sure quiz results are
     * initially hidden.
     */

    $all(
        ".modal"
    ).forEach(modal => {
        modal.setAttribute(
            "aria-hidden",
            modal.classList.contains(
                "open"
            )
                ? "false"
                : "true"
        );
    });

    console.log(
        "Interactive Maths Hub initialized successfully."
    );
}


/* =========================================================
   35. START APPLICATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}
