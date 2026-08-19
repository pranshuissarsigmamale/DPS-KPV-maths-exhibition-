"use strict";

/* =========================================================
   MATHS HUB
   MAIN JAVASCRIPT
   ========================================================= */


/* =========================================================
   GLOBAL CONFIGURATION
========================================================= */

const CONFIG = {

    QUESTION_BANK_SIZE: 1000,

    QUESTIONS_PER_QUIZ: 50,

    MAX_LIVES: 3,

    XP_PER_CORRECT: 10,

    STREAK_BONUS: 5,

    DAILY_XP_GOAL: 100,

    LEVEL_XP: 100,

    SPEED_TIME: 60

};


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {

    page: "home",

    xp: 0,

    level: 1,

    streak: 0,

    bestStreak: 0,

    questionsAnswered: 0,

    questionsCorrect: 0,

    questionsWrong: 0,

    quizScore: 0,

    quizCorrect: 0,

    quizWrong: 0,

    lives: CONFIG.MAX_LIVES,

    difficulty: "medium",

    difficultyLocked: false,

    currentQuiz: [],

    currentQuestionIndex: 0,

    quizActive: false,

    practiceQuestion: null,

    speedScore: 0,

    speedBest: 0,

    speedTime: CONFIG.SPEED_TIME,

    speedActive: false,

    speedQuestion: null,

    speedTimer: null,

    lastDailyDate: null,

    dailyXP: 0

};


/* =========================================================
   QUESTION BANK
========================================================= */

let QUESTION_BANK = [];


/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector) {

    return document.querySelector(
        selector
    );
}


function $all(selector) {

    return [
        ...document.querySelectorAll(
            selector
        )
    ];
}


function setText(selector, value) {

    const element = $(selector);

    if (element) {

        element.textContent =
            value;
    }
}


function randomInt(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;
}


function randomChoice(array) {

    return array[
        randomInt(
            0,
            array.length - 1
        )
    ];
}


function shuffle(array) {

    const result =
        [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            randomInt(0, i);

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
   STORAGE
========================================================= */

function saveState() {

    const data = {

        xp: state.xp,

        level: state.level,

        streak: state.streak,

        bestStreak:
            state.bestStreak,

        questionsAnswered:
            state.questionsAnswered,

        questionsCorrect:
            state.questionsCorrect,

        questionsWrong:
            state.questionsWrong,

        speedBest:
            state.speedBest,

        lastDailyDate:
            state.lastDailyDate,

        dailyXP:
            state.dailyXP,

        difficulty:
            state.difficulty

    };

    localStorage.setItem(
        "mathsHubState",
        JSON.stringify(data)
    );
}


function loadState() {

    try {

        const saved =
            localStorage.getItem(
                "mathsHubState"
            );

        if (!saved) {
            return;
        }

        const data =
            JSON.parse(saved);

        Object.assign(
            state,
            data
        );

    } catch (error) {

        console.error(
            "Could not load saved state:",
            error
        );

    }
}


/* =========================================================
   DAILY RESET
========================================================= */

function checkDailyReset() {

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    if (
        state.lastDailyDate !==
        today
    ) {

        state.lastDailyDate =
            today;

        state.dailyXP =
            0;

        saveState();
    }
}


/* =========================================================
   XP SYSTEM
========================================================= */

function addXP(amount) {

    state.xp += amount;

    state.dailyXP += amount;

    updateLevel();

    saveState();

    updateUI();
}


function updateLevel() {

    state.level =
        Math.floor(
            state.xp /
            CONFIG.LEVEL_XP
        ) + 1;
}


function getLevelName() {

    const names = [

        "Beginner",

        "Number Ninja",

        "Algebra Master",

        "Geometry Pro",

        "Maths Legend"

    ];

    return names[
        Math.min(
            state.level - 1,
            names.length - 1
        )
    ];
}


/* =========================================================
   QUESTION OPTION GENERATOR
========================================================= */

function createOptions(
    answer,
    difficulty
) {

    const options =
        new Set();

    options.add(answer);

    let spread;

    if (difficulty === "easy") {

        spread = 10;

    } else if (
        difficulty === "medium"
    ) {

        spread = 20;

    } else {

        spread = 40;
    }

    let attempts = 0;

    while (
        options.size < 4 &&
        attempts < 100
    ) {

        attempts++;

        let wrong =
            answer +
            randomInt(
                -spread,
                spread
            );

        if (
            Number.isInteger(answer)
        ) {

            wrong =
                Math.round(
                    wrong
                );
        }

        if (
            wrong !== answer &&
            Number.isFinite(wrong)
        ) {

            options.add(
                wrong
            );
        }
    }

    while (
        options.size < 4
    ) {

        options.add(
            answer +
            options.size +
            1
        );
    }

    return shuffle(
        [...options]
    );
}


/* =========================================================
   QUESTION FACTORY
========================================================= */

function makeQuestion(
    question,
    answer,
    chapter,
    difficulty
) {

    const options =
        createOptions(
            answer,
            difficulty
        );

    return {

        question,

        options,

        answer:
            options.indexOf(
                answer
            ),

        correctAnswer:
            answer,

        chapter,

        difficulty

    };
}


/* =========================================================
   EASY QUESTIONS
========================================================= */

function easyQuestion() {

    const type =
        randomInt(1, 8);

    if (type === 1) {

        const a =
            randomInt(1, 100);

        const b =
            randomInt(1, 100);

        return makeQuestion(
            `What is ${a} + ${b}?`,
            a + b,
            "Numbers",
            "easy"
        );
    }


    if (type === 2) {

        const a =
            randomInt(20, 100);

        const b =
            randomInt(1, a);

        return makeQuestion(
            `What is ${a} − ${b}?`,
            a - b,
            "Numbers",
            "easy"
        );
    }


    if (type === 3) {

        const a =
            randomInt(2, 12);

        const b =
            randomInt(2, 12);

        return makeQuestion(
            `What is ${a} × ${b}?`,
            a * b,
            "Numbers",
            "easy"
        );
    }


    if (type === 4) {

        const divisor =
            randomInt(2, 12);

        const answer =
            randomInt(2, 12);

        const dividend =
            divisor * answer;

        return makeQuestion(
            `What is ${dividend} ÷ ${divisor}?`,
            answer,
            "Numbers",
            "easy"
        );
    }


    if (type === 5) {

        const side =
            randomInt(2, 20);

        return makeQuestion(
            `What is the perimeter of a square with side ${side} cm?`,
            side * 4,
            "Mensuration",
            "easy"
        );
    }


    if (type === 6) {

        const length =
            randomInt(2, 15);

        const width =
            randomInt(2, 15);

        return makeQuestion(
            `What is the area of a ${length} cm × ${width} cm rectangle?`,
            length * width,
            "Mensuration",
            "easy"
        );
    }


    if (type === 7) {

        const number =
            randomInt(2, 20);

        return makeQuestion(
            `What is ${number}²?`,
            number * number,
            "Numbers",
            "easy"
        );
    }


    const number =
        randomInt(5, 50);

    return makeQuestion(
        `What is double ${number}?`,
        number * 2,
        "Numbers",
        "easy"
    );
}


/* =========================================================
   MEDIUM QUESTIONS
========================================================= */

function mediumQuestion() {

    const type =
        randomInt(1, 8);


    if (type === 1) {

        const x =
            randomInt(2, 20);

        const addition =
            randomInt(1, 30);

        const result =
            3 * x +
            addition;

        return makeQuestion(
            `Solve: 3x + ${addition} = ${result}`,
            x,
            "Algebra",
            "medium"
        );
    }


    if (type === 2) {

        const price =
            randomInt(10, 100) * 10;

        const percent =
            randomChoice([
                10,
                20,
                25,
                30,
                40
            ]);

        return makeQuestion(
            `What is ${percent}% of ₹${price}?`,
            price * percent / 100,
            "Percentages",
            "medium"
        );
    }


    if (type === 3) {

        const length =
            randomInt(5, 20);

        const width =
            randomInt(5, 20);

        return makeQuestion(
            `Find the area of a rectangle ${length} cm long and ${width} cm wide.`,
            length * width,
            "Mensuration",
            "medium"
        );
    }


    if (type === 4) {

        const base =
            randomInt(5, 20);

        const height =
            randomInt(5, 20);

        return makeQuestion(
            `Find the area of a triangle with base ${base} cm and height ${height} cm.`,
            base * height / 2,
            "Geometry",
            "medium"
        );
    }


    if (type === 5) {

        const x =
            randomInt(2, 15);

        return makeQuestion(
            `Solve: 4x = ${4 * x}`,
            x,
            "Algebra",
            "medium"
        );
    }


    if (type === 6) {

        const number =
            randomInt(2, 15);

        return makeQuestion(
            `What is ${number}³?`,
            number ** 3,
            "Numbers",
            "medium"
        );
    }


    if (type === 7) {

        const a =
            randomInt(10, 40);

        const b =
            randomInt(10, 40);

        return makeQuestion(
            `What is the average of ${a} and ${b}?`,
            (a + b) / 2,
            "Data Handling",
            "medium"
        );
    }


    const total =
        randomInt(5, 20) * 5;

    const a =
        randomInt(1, 5);

    const b =
        randomInt(1, 5);

    return makeQuestion(
        `A quantity of ${total} is divided in the ratio ${a}:${b}. What is the first part?`,
        total * a / (a + b),
        "Ratio",
        "medium"
    );
}


/* =========================================================
   HARD QUESTIONS
========================================================= */

function hardQuestion() {

    const type =
        randomInt(1, 8);


    if (type === 1) {

        const x =
            randomInt(2, 30);

        const multiplier =
            randomInt(2, 8);

        const addition =
            randomInt(5, 30);

        const result =
            multiplier * x +
            addition;

        return makeQuestion(
            `Solve: ${multiplier}x + ${addition} = ${result}`,
            x,
            "Algebra",
            "hard"
        );
    }


    if (type === 2) {

        const x =
            randomInt(2, 30);

        const multiplier =
            randomInt(2, 8);

        const subtraction =
            randomInt(5, 30);

        const result =
            multiplier * x -
            subtraction;

        return makeQuestion(
            `Solve: ${multiplier}x − ${subtraction} = ${result}`,
            x,
            "Algebra",
            "hard"
        );
    }


    if (type === 3) {

        const a =
            randomInt(10, 40);

        const b =
            a - 5;

        return makeQuestion(
            `What is ${a}² − ${b}²?`,
            a * a - b * b,
            "Algebra",
            "hard"
        );
    }


    if (type === 4) {

        const base =
            randomInt(5, 30);

        const height =
            randomInt(5, 30);

        return makeQuestion(
            `A triangle has base ${base} cm and height ${height} cm. Find its area.`,
            base * height / 2,
            "Geometry",
            "hard"
        );
    }


    if (type === 5) {

        const a =
            randomInt(2, 8);

        const b =
            randomInt(2, 8);

        const multiplier =
            randomInt(3, 15);

        const total =
            (a + b) *
            multiplier;

        return makeQuestion(
            `₹${total} is divided in the ratio ${a}:${b}. What is the first share?`,
            total * a / (a + b),
            "Ratio",
            "hard"
        );
    }


    if (type === 6) {

        const number =
            randomInt(20, 100) * 5;

        const percent =
            randomChoice([
                15,
                20,
                25,
                35
            ]);

        return makeQuestion(
            `Find ${percent}% of ${number}.`,
            number * percent / 100,
            "Percentages",
            "hard"
        );
    }


    if (type === 7) {

        const length =
            randomInt(10, 30);

        const width =
            randomInt(5, 20);

        const perimeter =
            2 *
            (length + width);

        return makeQuestion(
            `A rectangle has perimeter ${perimeter} cm and length ${length} cm. Find its width.`,
            width,
            "Mensuration",
            "hard"
        );
    }


    const number =
        randomInt(5, 20);

    return makeQuestion(
        `What is ${number}³ − ${number}²?`,
        number ** 3 -
        number ** 2,
        "Numbers",
        "hard"
    );
}


/* =========================================================
   GENERATE 1000 QUESTIONS
========================================================= */

function generateQuestionBank() {

    QUESTION_BANK = [];

    for (
        let i = 0;
        i < 334;
        i++
    ) {

        QUESTION_BANK.push(
            easyQuestion()
        );
    }

    for (
        let i = 0;
        i < 333;
        i++
    ) {

        QUESTION_BANK.push(
            mediumQuestion()
        );
    }

    for (
        let i = 0;
        i < 333;
        i++
    ) {

        QUESTION_BANK.push(
            hardQuestion()
        );
    }

    QUESTION_BANK =
        shuffle(
            QUESTION_BANK
        );

    console.log(
        "Maths Hub question bank:",
        QUESTION_BANK.length
    );
}


/* =========================================================
   GET 50 RANDOM QUESTIONS
========================================================= */

function getQuizQuestions() {

    let pool =
        [...QUESTION_BANK];

    if (
        state.difficultyLocked
    ) {

        const filtered =
            pool.filter(
                question =>
                    question.difficulty ===
                    state.difficulty
            );

        if (
            filtered.length >=
            CONFIG.QUESTIONS_PER_QUIZ
        ) {

            pool =
                filtered;
        }
    }

    return shuffle(
        pool
    ).slice(
        0,
        CONFIG.QUESTIONS_PER_QUIZ
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(pageName) {

    const pages =
        $all(".page");

    pages.forEach(
        page => {

            page.classList.remove(
                "active"
            );
        }
    );

    const target =
        $(`#page-${pageName}`);

    if (!target) {
        return;
    }

    target.classList.add(
        "active"
    );

    $all(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                pageName
            );
        });

    state.page =
        pageName;

    const titles = {

        home: "Maths Hub",

        chapters: "Chapters",

        practice: "Practice",

        quiz: "Quiz",

        calculator: "Calculators",

        progress: "Progress",

        speed: "Speed Challenge",

        "real-life":
            "Maths in Real Life",

        achievements:
            "Achievements"

    };

    setText(
        "#pageTitle",
        titles[pageName] ||
        "Maths Hub"
    );

    if (
        window.innerWidth <= 800
    ) {

        $("#sidebar")
            ?.classList.remove(
                "open"
            );
    }

    if (
        pageName === "practice"
    ) {

        createPracticeQuestion();
    }

    if (
        pageName === "progress"
    ) {

        updateProgressPage();
    }
}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

$all("[data-page]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.page
                );
            }
        );
    });


$all("[data-page-target]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.pageTarget
                );
            }
        );
    });


$("#menuButton")
    ?.addEventListener(
        "click",
        () => {

            $("#sidebar")
                ?.classList.add(
                    "open"
                );
        }
    );


$("#sidebarClose")
    ?.addEventListener(
        "click",
        () => {

            $("#sidebar")
                ?.classList.remove(
                    "open"
                );
        }
    );


/* =========================================================
   DIFFICULTY
========================================================= */

$all(
    ".difficulty-button"
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            if (
                state.difficultyLocked
            ) {

                showNotification(
                    "🔒 Difficulty is locked for this quiz."
                );

                return;
            }

            state.difficulty =
                button.dataset.difficulty;

            $all(
                ".difficulty-button"
            )
            .forEach(
                item =>
                    item.classList.remove(
                        "selected"
                    )
            );

            button.classList.add(
                "selected"
            );

            setText(
                "#selectedDifficulty",
                state.difficulty
            );

        }
    );
});


$("#lockDifficulty")
    ?.addEventListener(
        "click",
        () => {

            if (
                state.difficultyLocked
            ) {

                state.difficultyLocked =
                    false;

                $("#lockDifficulty")
                    .textContent =
                    "🔒 Lock Difficulty";

                showNotification(
                    "Difficulty unlocked."
                );

                return;
            }


            const warning =
                `⚠️ You are locking ${state.difficulty} difficulty. If you get 15 or more wrong out of 50 questions, consider lowering the difficulty.`;

            setText(
                "#difficultyWarning",
                warning
            );

            state.difficultyLocked =
                true;

            $("#lockDifficulty")
                .textContent =
                "🔓 Unlock Difficulty";

            showNotification(
                "Difficulty locked."
            );
        }
    );


/* =========================================================
   START QUIZ
========================================================= */

$("#startQuiz")
    ?.addEventListener(
        "click",
        startQuiz
    );


function startQuiz() {

    state.currentQuiz =
        getQuizQuestions();

    state.currentQuestionIndex =
        0;

    state.quizScore =
        0;

    state.quizCorrect =
        0;

    state.quizWrong =
        0;

    state.lives =
        CONFIG.MAX_LIVES;

    state.quizActive =
        true;

    updateQuizUI();

    showQuizQuestion();
}


/* =========================================================
   SHOW QUIZ QUESTION
========================================================= */

function showQuizQuestion() {

    if (
        !state.quizActive
    ) {
        return;
    }

    if (
        state.currentQuestionIndex >=
        state.currentQuiz.length
    ) {

        finishQuiz();

        return;
    }

    const question =
        state.currentQuiz[
            state.currentQuestionIndex
        ];

    setText(
        "#quizQuestion",
        question.question
    );

    setText(
        "#questionNumber",
        `${state.currentQuestionIndex + 1} / 50`
    );

    setText(
        "#quizDifficulty",
        question.difficulty
    );

    setText(
        "#quizChapter",
        question.chapter
    );

    setText(
        "#quizScore",
        state.quizScore
    );

    setText(
        "#quizLives",
        "❤️".repeat(
            state.lives
        )
    );

    setText(
        "#quizStreak",
        `🔥 ${state.streak}`
    );

    setText(
        "#quizFeedback",
        ""
    );

    const progress =
        (
            state.currentQuestionIndex /
            CONFIG.QUESTIONS_PER_QUIZ
        ) * 100;

    const bar =
        $("#quizProgress");

    if (bar) {

        bar.style.width =
            `${progress}%`;
    }


    $all(
        ".quiz-option"
    )
    .forEach(
        (button, index) => {

            button.disabled =
                false;

            button.classList.remove(
                "correct",
                "wrong"
            );

            button.textContent =
                question.options[index];

            button.dataset.answer =
                index;
        }
    );
}


/* =========================================================
   QUIZ ANSWER
========================================================= */

$all(".quiz-option")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                answerQuiz(
                    Number(
                        button.dataset.answer
                    )
                );
            }
        );
    });


function answerQuiz(selected) {

    if (
        !state.quizActive
    ) {
        return;
    }

    const question =
        state.currentQuiz[
            state.currentQuestionIndex
        ];

    const correct =
        selected ===
        question.answer;

    $all(".quiz-option")
        .forEach(
            (button, index) => {

                button.disabled =
                    true;

                if (
                    index ===
                    question.answer
                ) {

                    button.classList.add(
                        "correct"
                    );
                }

                if (
                    index === selected &&
                    !correct
                ) {

                    button.classList.add(
                        "wrong"
                    );
                }
            }
        );


    if (correct) {

        state.quizCorrect++;

        state.questionsCorrect++;

        state.streak++;

        state.bestStreak =
            Math.max(
                state.bestStreak,
                state.streak
            );

        const earned =
            CONFIG.XP_PER_CORRECT +
            (
                state.streak > 1
                    ? CONFIG.STREAK_BONUS
                    : 0
            );

        state.quizScore +=
            earned;

        addXP(
            earned
        );

        setText(
            "#quizFeedback",
            `✅ Correct! +${earned} XP`
        );

    } else {

        state.quizWrong++;

        state.questionsWrong++;

        state.lives =
            Math.max(
                0,
                state.lives - 1
            );

        state.streak =
            0;

        setText(
            "#quizFeedback",
            `❌ Correct answer: ${question.correctAnswer}`
        );
    }

    state.questionsAnswered++;

    updateQuizUI();

    saveState();


    setTimeout(
        () => {

            state.currentQuestionIndex++;

            if (
                state.lives <= 0
            ) {

                finishQuiz(
                    true
                );

                return;
            }

            showQuizQuestion();

        },
        700
    );
}


/* =========================================================
   QUIZ UI
========================================================= */

function updateQuizUI() {

    setText(
        "#quizScore",
        state.quizScore
    );

    setText(
        "#quizLives",
        "❤️".repeat(
            state.lives
        )
    );

    setText(
        "#quizStreak",
        `🔥 ${state.streak}`
    );
}


/* =========================================================
   FINISH QUIZ
========================================================= */

function finishQuiz(endedEarly = false) {

    state.quizActive =
        false;

    const answered =
        state.quizCorrect +
        state.quizWrong;

    const accuracy =
        answered > 0
            ? Math.round(
                (
                    state.quizCorrect /
                    answered
                ) * 100
            )
            : 0;


    let message;

    if (
        state.quizWrong >= 15
    ) {

        message =
            "⚠️ 15 or more questions were wrong. Consider practising at a lower difficulty.";

    } else if (
        accuracy === 100 &&
        answered === 50
    ) {

        message =
            "🏆 Perfect 50/50!";

    } else if (
        endedEarly
    ) {

        message =
            "❤️ You ran out of lives.";

    } else {

        message =
            "🎉 Quiz complete!";
    }


    showNotification(
        `${message} Accuracy: ${accuracy}%`
    );

    if (
        accuracy === 100 &&
        answered === 50
    ) {

        unlockAchievement(
            "perfect"
        );
    }

    updateUI();

    saveState();
}


/* =========================================================
   PRACTICE
========================================================= */

function createPracticeQuestion() {

    state.practiceQuestion =
        randomChoice(
            QUESTION_BANK
        );

    setText(
        "#practiceQuestion",
        state.practiceQuestion.question
    );

    setText(
        "#practiceChapter",
        state.practiceQuestion.chapter
    );

    const input =
        $("#practiceAnswer");

    if (input) {

        input.value = "";
    }

    setText(
        "#practiceFeedback",
        ""
    );
}


$("#newPractice")
    ?.addEventListener(
        "click",
        createPracticeQuestion
    );


$("#checkPractice")
    ?.addEventListener(
        "click",
        () => {

            if (
                !state.practiceQuestion
            ) {
                createPracticeQuestion();

                return;
            }

            const input =
                $("#practiceAnswer");

            const answer =
                Number(
                    input.value
                );

            if (
                answer ===
                state.practiceQuestion.correctAnswer
            ) {

                setText(
                    "#practiceFeedback",
                    "✅ Correct!"
                );

                addXP(
                    CONFIG.XP_PER_CORRECT
                );

                state.questionsAnswered++;

                state.questionsCorrect++;

                state.streak++;

                state.bestStreak =
                    Math.max(
                        state.bestStreak,
                        state.streak
                    );

                unlockAchievement(
                    "first"
                );

            } else {

                setText(
                    "#practiceFeedback",
                    `❌ The correct answer is ${state.practiceQuestion.correctAnswer}.`
                );

                state.questionsAnswered++;

                state.questionsWrong++;

                state.streak =
                    0;
            }

            saveState();

        }
    );


/* =========================================================
   CALCULATOR
========================================================= */

let calculatorValue = "";

let calculatorPrevious = "";

let calculatorOperator = null;


function updateCalculator() {

    setText(
        "#calculatorDisplay",
        calculatorValue || "0"
    );
}


$all(
    "[data-number]"
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const value =
                button.dataset.number;

            if (
                value === "." &&
                calculatorValue.includes(".")
            ) {
                return;
            }

            calculatorValue +=
                value;

            updateCalculator();
        }
    );
});


$all(
    '[data-calc="clear"]'
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            calculatorValue = "";

            calculatorPrevious = "";

            calculatorOperator = null;

            updateCalculator();
        }
    );
});


$all(
    '[data-calc="delete"]'
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            calculatorValue =
                calculatorValue.slice(
                    0,
                    -1
                );

            updateCalculator();
        }
    );
});


$all(
    '[data-calc="operator"]'
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            if (
                !calculatorValue
            ) {
                return;
            }

            calculatorPrevious =
                calculatorValue;

            calculatorValue =
                "";

            calculatorOperator =
                button.textContent;
        }
    );
});


$all(
    '[data-calc="equals"]'
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const a =
                Number(
                    calculatorPrevious
                );

            const b =
                Number(
                    calculatorValue
                );

            let result;

            switch (
                calculatorOperator
            ) {

                case "+":
                    result =
                        a + b;
                    break;

                case "−":
                    result =
                        a - b;
                    break;

                case "×":
                    result =
                        a * b;
                    break;

                case "÷":
                    result =
                        b === 0
                            ? "Error"
                            : a / b;
                    break;

                default:
                    return;
            }

            calculatorValue =
                String(result);

            calculatorPrevious =
                "";

            calculatorOperator =
                null;

            updateCalculator();
        }
    );
});


/* =========================================================
   CALCULATOR TABS
========================================================= */

$all(
    ".calculator-tab"
)
.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const target =
                button.dataset.calculator;

            $all(
                ".calculator-tab"
            )
            .forEach(
                tab =>
                    tab.classList.remove(
                        "active"
                    )
            );

            button.classList.add(
                "active"
            );

            $all(
                ".calculator-panel"
            )
            .forEach(
                panel =>
                    panel.classList.remove(
                        "active"
                    )
            );

            $(
                `#calculator-${target}`
            )?.classList.add(
                "active"
            );

            if (
                target === "graph"
            ) {

                drawGraph();
            }
        }
    );
});


/* =========================================================
   PERCENTAGE CALCULATOR
========================================================= */

$("#calculatePercentage")
    ?.addEventListener(
        "click",
        () => {

            const percent =
                Number(
                    $("#percentValue")
                        ?.value
                );

            const total =
                Number(
                    $("#percentTotal")
                        ?.value
                );

            if (
                !Number.isFinite(
                    percent
                ) ||
                !Number.isFinite(
                    total
                )
            ) {

                setText(
                    "#percentageResult",
                    "Please enter both values."
                );

                return;
            }

            const result =
                total *
                percent /
                100;

            setText(
                "#percentageResult",
                result
            );
        }
    );


/* =========================================================
   GRAPH CALCULATOR
========================================================= */

function drawGraph() {

    const canvas =
        $("#graphCanvas");

    if (!canvas) {
        return;
    }

    const context =
        canvas.getContext(
            "2d"
        );

    const a =
        Number(
            $("#graphA")?.value
        );

    const b =
        Number(
            $("#graphB")?.value
        );

    const c =
        Number(
            $("#graphC")?.value
        );

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const width =
        canvas.width;

    const height =
        canvas.height;

    const centerX =
        width / 2;

    const centerY =
        height / 2;

    const scale =
        25;


    context.beginPath();

    context.moveTo(
        0,
        centerY
    );

    context.lineTo(
        width,
        centerY
    );

    context.moveTo(
        centerX,
        0
    );

    context.lineTo(
        centerX,
        height
    );

    context.stroke();


    context.beginPath();

    let first = true;


    for (
        let pixelX = 0;
        pixelX < width;
        pixelX++
    ) {

        const x =
            (
                pixelX -
                centerX
            ) / scale;

        const y =
            a * x * x +
            b * x +
            c;

        const pixelY =
            centerY -
            y * scale;

        if (
            first
        ) {

            context.moveTo(
                pixelX,
                pixelY
            );

            first = false;

        } else {

            context.lineTo(
                pixelX,
                pixelY
            );
        }
    }

    context.stroke();
}


$("#drawGraph")
    ?.addEventListener(
        "click",
        drawGraph
    );


/* =========================================================
   SPEED CHALLENGE
========================================================= */

function createSpeedQuestion() {

    const question =
        randomChoice(
            QUESTION_BANK.filter(
                item =>
                    item.difficulty ===
                    "medium"
            )
        );

    state.speedQuestion =
        question;

    setText(
        "#speedQuestion",
        question.question
    );

    const container =
        $("#speedOptions");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    question.options
        .forEach(
            (option, index) => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.className =
                    "quiz-option";

                button.textContent =
                    option;

                button.dataset.answer =
                    index;

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            !state.speedActive
                        ) {
                            return;
                        }

                        if (
                            index ===
                            question.answer
                        ) {

                            state.speedScore++;

                            setText(
                                "#speedScore",
                                state.speedScore
                            );
                        }

                        createSpeedQuestion();
                    }
                );

                container.appendChild(
                    button
                );
            }
        );
}


$("#startSpeed")
    ?.addEventListener(
        "click",
        startSpeedChallenge
    );


function startSpeedChallenge() {

    if (
        state.speedActive
    ) {
        return;
    }

    state.speedActive =
        true;

    state.speedScore =
        0;

    state.speedTime =
        CONFIG.SPEED_TIME;

    setText(
        "#speedScore",
        "0"
    );

    setText(
        "#speedTimer",
        "60"
    );

    createSpeedQuestion();

    state.speedTimer =
        setInterval(
            () => {

                state.speedTime--;

                setText(
                    "#speedTimer",
                    state.speedTime
                );

                if (
                    state.speedTime <=
                    0
                ) {

                    finishSpeedChallenge();
                }

            },
            1000
        );
}


function finishSpeedChallenge() {

    clearInterval(
        state.speedTimer
    );

    state.speedActive =
        false;

    if (
        state.speedScore >
        state.speedBest
    ) {

        state.speedBest =
            state.speedScore;

        saveState();
    }

    setText(
        "#speedBest",
        state.speedBest
    );

    showNotification(
        `⚡ Challenge complete! Score: ${state.speedScore}`
    );

    if (
        state.speedScore >= 20
    ) {

        unlockAchievement(
            "speed"
        );
    }
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const unlockedAchievements =
    new Set();


function unlockAchievement(
    id
) {

    if (
        unlockedAchievements.has(
            id
        )
    ) {
        return;
    }

    unlockedAchievements.add(
        id
    );

    showNotification(
        "🏆 Achievement unlocked!"
    );
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgressPage() {

    const total =
        state.questionsAnswered;

    const accuracy =
        total > 0
            ? Math.round(
                (
                    state.questionsCorrect /
                    total
                ) * 100
            )
            : 0;

    setText(
        "#progressXP",
        state.xp
    );

    setText(
        "#progressLevel",
        state.level
    );

    setText(
        "#progressQuestions",
        total
    );

    setText(
        "#progressAccuracy",
        `${accuracy}%`
    );

    setText(
        "#progressBestStreak",
        state.bestStreak
    );

    setText(
        "#levelName",
        getLevelName()
    );

    const levelXP =
        state.xp %
        CONFIG.LEVEL_XP;

    const percentage =
        (
            levelXP /
            CONFIG.LEVEL_XP
        ) * 100;

    const bar =
        $("#levelProgress");

    if (bar) {

        bar.style.width =
            `${percentage}%`;
    }

    setText(
        "#levelXPText",
        `${levelXP} / ${CONFIG.LEVEL_XP} XP`
    );
}


/* =========================================================
   GENERAL UI
========================================================= */

function updateUI() {

    updateLevel();

    setText(
        "#topXP",
        `${state.xp} XP`
    );

    setText(
        "#topStreak",
        state.streak
    );

    setText(
        "#homeXP",
        state.xp
    );

    setText(
        "#homeStreak",
        state.streak
    );

    setText(
        "#homeLevel",
        state.level
    );

    const accuracy =
        state.questionsAnswered > 0
            ? Math.round(
                (
                    state.questionsCorrect /
                    state.questionsAnswered
                ) * 100
            )
            : 0;

    setText(
        "#homeAccuracy",
        `${accuracy}%`
    );

    setText(
        "#sidebarLevel",
        `Level ${state.level}`
    );

    updateProgressPage();

    setText(
        "#speedBest",
        state.speedBest
    );
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

let notificationTimer = null;


function showNotification(
    message
) {

    const notification =
        $("#notification");

    if (!notification) {
        return;
    }

    notification.textContent =
        message;

    notification.classList.add(
        "show"
    );

    clearTimeout(
        notificationTimer
    );

    notificationTimer =
        setTimeout(
            () => {

                notification.classList.remove(
                    "show"
                );

            },
            3000
        );
}


/* =========================================================
   KEYBOARD SUPPORT
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            state.page !==
            "quiz"
        ) {
            return;
        }

        if (
            !state.quizActive
        ) {
            return;
        }

        const key =
            event.key;

        if (
            ["1", "2", "3", "4"]
                .includes(key)
        ) {

            answerQuiz(
                Number(key) - 1
            );
        }
    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    loadState();

    checkDailyReset();

    generateQuestionBank();

    updateLevel();

    updateUI();

    createPracticeQuestion();

    drawGraph();

    console.log(
        "================================="
    );

    console.log(
        "Maths Hub initialized successfully."
    );

    console.log(
        `Question bank: ${QUESTION_BANK.length}`
    );

    console.log(
        "Quiz size: 50"
    );

    console.log(
        "================================="
    );
}


initialize();
