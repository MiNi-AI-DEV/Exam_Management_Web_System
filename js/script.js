
// Route the homepage actions to their separate role-specific login forms.
function (userType) {
    const destinations = {
        Admin: "admin-login.html",
        Student: "student-login.html"
    };

    if (destinations[userType]) {
        window.location.href = destinations[userType];
    }
}

// Show a readable result without implying the browser has stored account data.
function showFormMessage(elementId, message, isSuccess = false) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.classList.toggle("success", isSuccess);
}

// Send credentials to the role-specific Spring Boot authentication endpoint.
function handleLogin(event, userType) {
    event.preventDefault();
    const isAdmin = userType.toLowerCase() === "admin";
    const prefix = isAdmin ? "admin" : "student";
    const username = document.getElementById(`${prefix}-username`).value.trim();
    const password = document.getElementById(`${prefix}-password`).value;
    const messageId = `${prefix}-login-message`;
    const endpoint = isAdmin ? "/api/auth/admin/login" : "/api/auth/student/login";

    showFormMessage(messageId, "Signing in...");

    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
        .then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || "The username or password was not accepted.");
            window.location.href = isAdmin ? "admin-dashboard.html" : "student-dashboard.html";
        })
        .catch(() => showFormMessage(messageId, "Login service is unavailable. Connect the Spring Boot backend to sign in."));
}

// Calculate age for display; the backend must independently validate the date of birth.
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return "";

    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthdayPending = today.getMonth() < birthDate.getMonth()
        || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

    if (birthdayPending) age -= 1;
    return age >= 0 ? age : "";
}

// Submit profile and credential data to Spring Boot; passwords are never saved in browser storage.
function handleRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password");
    const confirmation = formData.get("confirmPassword");
    const messageId = "registration-message";

    if (password !== confirmation) {
        showFormMessage(messageId, "The passwords do not match.");
        return;
    }

    const registration = Object.fromEntries(formData.entries());
    delete registration.confirmPassword;
    registration.age = Number(registration.age);
    registration.qualificationPercentage = Number(registration.qualificationPercentage);

    showFormMessage(messageId, "Submitting registration...");

    fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registration)
    })
        .then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || "Registration could not be completed.");
            showFormMessage(messageId, "Registration complete. You can now sign in.", true);
            form.reset();
        })
        .catch(() => showFormMessage(messageId, "Registration service is unavailable. Connect the Spring Boot backend to save this account."));
}

// Keep the age field current while students enter their date of birth.
const dateOfBirthInput = document.getElementById("student-date-of-birth");
if (dateOfBirthInput) {
    dateOfBirthInput.max = new Date().toISOString().slice(0, 10);
    dateOfBirthInput.addEventListener("change", (event) => {
        document.getElementById("student-age").value = calculateAge(event.target.value);
    });
}

// Fetch the signed-in student's profile and latest result from the Spring Boot API.
const studentNameElement = document.getElementById("student-name");
if (studentNameElement) {
    fetch("/api/students/profile", { credentials: "same-origin" })
        .then((response) => {
            if (!response.ok) throw new Error("Student profile is unavailable.");
            return response.json();
        })
        .then((profile) => {
            studentNameElement.textContent = profile.fullName || profile.name || "student";
            if (profile.latestResult) {
                document.getElementById("student-latest-result").textContent = `${profile.latestResult.percentage}% · ${profile.latestResult.status}`;
            }
        })
        .catch(() => showFormMessage("student-dashboard-message", "Student dashboard data requires an active Spring Boot session."));
}

// Load administrator statistics and recent results from a role-protected backend endpoint.
const adminResultsBody = document.getElementById("admin-results-body");
if (adminResultsBody) {
    fetch("/api/admin/dashboard/summary", { credentials: "same-origin" })
        .then((response) => {
            if (!response.ok) throw new Error("Admin dashboard is unavailable.");
            return response.json();
        })
        .then((summary) => {
            document.getElementById("stat-registered").textContent = summary.registeredStudents ?? 0;
            document.getElementById("stat-active").textContent = summary.currentlyLoggedIn ?? 0;
            document.getElementById("stat-completed").textContent = summary.completedExams ?? 0;
            document.getElementById("stat-pass-rate").textContent = `${summary.passRate ?? 0}%`;
            const results = summary.recentResults || [];
            adminResultsBody.replaceChildren();
            if (results.length === 0) {
                adminResultsBody.innerHTML = '<tr><td colspan="5" class="empty-table">No examination results yet.</td></tr>';
                return;
            }
            results.forEach((result) => {
                const row = document.createElement("tr");
                [result.studentName, result.username, `${result.percentage}%`, result.status, result.completedAt]
                    .forEach((value) => {
                        const cell = document.createElement("td");
                        cell.textContent = value ?? "-";
                        row.appendChild(cell);
                    });
                adminResultsBody.appendChild(row);
            });
        })
        .catch(() => showFormMessage("admin-dashboard-message", "Dashboard statistics require an authenticated Spring Boot admin session."));
}

// Prototype Java questions; production questions and answer evaluation must be owned by Spring Boot.
const javaQuestions = [
    { prompt: "Which keyword is used to inherit a class in Java?", options: ["implements", "extends", "inherits", "super"], answer: 1 },
    { prompt: "Which method is the standard entry point of a Java application?", options: ["start()", "run()", "main()", "init()"], answer: 2 },
    { prompt: "Which type stores a whole number using 64 bits?", options: ["int", "short", "long", "byte"], answer: 2 },
    { prompt: "Which collection does not allow duplicate elements?", options: ["List", "Set", "Queue", "ArrayList"], answer: 1 },
    { prompt: "What is the default value of an instance boolean field?", options: ["true", "false", "null", "0"], answer: 1 },
    { prompt: "Which access modifier makes a member available from any class?", options: ["private", "protected", "public", "default"], answer: 2 },
    { prompt: "Which block is used to handle an exception?", options: ["catch", "throws", "finalize", "assert"], answer: 0 },
    { prompt: "Which keyword prevents a class from being subclassed?", options: ["static", "const", "final", "private"], answer: 2 },
    { prompt: "Which interface is the root of Java's collection hierarchy?", options: ["Iterable", "Collection", "Map", "Arrays"], answer: 0 },
    { prompt: "Which operator compares primitive values for equality?", options: ["=", "==", "equals", "!="], answer: 1 },
    { prompt: "Which class is commonly used for mutable text?", options: ["String", "StringBuilder", "Character", "Text"], answer: 1 },
    { prompt: "What does JVM stand for?", options: ["Java Variable Method", "Java Virtual Machine", "Java Verified Mode", "Joint Virtual Memory"], answer: 1 },
    { prompt: "Which keyword refers to the current object?", options: ["self", "this", "current", "object"], answer: 1 },
    { prompt: "Which loop checks its condition before the first iteration?", options: ["do-while", "while", "do-until", "repeat"], answer: 1 },
    { prompt: "Which package contains the List interface?", options: ["java.io", "java.net", "java.util", "java.lang"], answer: 2 },
    { prompt: "What is method overloading?", options: ["Same method name with different parameters", "Changing a method's visibility", "Calling a method repeatedly", "Replacing a field"], answer: 0 },
    { prompt: "Which keyword is used to create an object?", options: ["class", "make", "new", "object"], answer: 2 },
    { prompt: "Which type represents a single Unicode character?", options: ["char", "String", "byte", "CharacterArray"], answer: 0 },
    { prompt: "Which statement exits a loop immediately?", options: ["skip", "continue", "return", "break"], answer: 3 },
    { prompt: "Which feature allows one interface to have multiple implementations?", options: ["Encapsulation", "Polymorphism", "Compilation", "Casting"], answer: 1 }
];

// Keep answers locked after selection; review markers are only for unanswered questions.
const examState = { current: 0, selected: Array(20).fill(null), review: Array(20).fill(false), seconds: 1200, finished: false };
const questionText = document.getElementById("question-text");
if (questionText) {
    const optionsContainer = document.getElementById("answer-options");
    const questionMap = document.getElementById("question-map");
    const nextButton = document.getElementById("next-question");
    const timerElement = document.getElementById("exam-timer");

    // Draw the question navigator and visually distinguish current, answered, and review items.
    function renderQuestionMap() {
        questionMap.replaceChildren();
        examState.selected.forEach((answer, index) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "question-number";
            item.textContent = String(index + 1);
            item.setAttribute("aria-label", `Question ${index + 1}${answer !== null ? ", answered" : examState.review[index] ? ", marked for review" : ""}`);
            if (index === examState.current) item.classList.add("current");
            if (answer !== null) item.classList.add("answered");
            else if (examState.review[index]) item.classList.add("review");
            item.addEventListener("click", () => {
                if (answer === null && examState.review[index]) {
                    examState.current = index;
                    renderQuestion();
                }
            });
            questionMap.appendChild(item);
        });
        document.getElementById("answered-count").textContent = `${examState.selected.filter((answer) => answer !== null).length} answered`;
    }

    // Render one item at a time; answered items cannot be reopened or changed.
    function renderQuestion() {
        const question = javaQuestions[examState.current];
        document.getElementById("question-count").textContent = `${examState.current + 1} / 20`;
        document.getElementById("question-progress").textContent = `${String(examState.current + 1).padStart(2, "0")} OF 20`;
        questionText.textContent = question.prompt;
        optionsContainer.replaceChildren();
        question.options.forEach((option, optionIndex) => {
            const label = document.createElement("label");
            label.className = "answer-option";
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "exam-answer";
            input.value = String(optionIndex);
            input.checked = examState.selected[examState.current] === optionIndex;
            input.disabled = examState.selected[examState.current] !== null;
            input.addEventListener("change", () => {
                examState.selected[examState.current] = optionIndex;
                nextButton.disabled = false;
                renderQuestionMap();
            });
            const marker = document.createElement("span");
            marker.className = "option-letter";
            marker.textContent = String.fromCharCode(65 + optionIndex);
            const copy = document.createElement("span");
            copy.textContent = option;
            label.append(input, marker, copy);
            optionsContainer.appendChild(label);
        });
        nextButton.disabled = examState.selected[examState.current] === null;
        nextButton.innerHTML = examState.current === 19 ? "Review unanswered <span aria-hidden=\"true\">→</span>" : "Next question <span aria-hidden=\"true\">→</span>";
        document.getElementById("review-button").textContent = examState.review[examState.current] ? "★ Marked for review" : "☆ Review later";
        renderQuestionMap();
    }

    // Save a prototype result in session-only state; Spring Boot must persist and validate real results.
    function finishExam() {
        examState.finished = true;
        clearInterval(examTimer);
        const correct = examState.selected.reduce((total, selected, index) => total + (selected === javaQuestions[index].answer ? 1 : 0), 0);
        const percentage = Math.round((correct / javaQuestions.length) * 100);
        sessionStorage.setItem("examResult", JSON.stringify({ correct, total: javaQuestions.length, percentage, passed: percentage >= 80 }));
        window.location.href = "result.html";
    }

    // Advance only after answering; at the last question, route through any marked unanswered items.
    nextButton.addEventListener("click", () => {
        if (examState.selected[examState.current] === null) return;
        if (examState.current < 19) {
            examState.current += 1;
        } else {
            const firstReview = examState.selected.findIndex((answer, index) => answer === null && examState.review[index]);
            const firstUnanswered = examState.selected.findIndex((answer) => answer === null);
            if (firstReview !== -1) examState.current = firstReview;
            else if (firstUnanswered !== -1) examState.current = firstUnanswered;
            else finishExam();
        }
        renderQuestion();
    });

    // Mark an unanswered question for later without submitting or exposing an answer.
    document.getElementById("review-button").addEventListener("click", () => {
        if (examState.selected[examState.current] !== null) return;
        examState.review[examState.current] = !examState.review[examState.current];
        const nextUnanswered = examState.selected.findIndex((answer, index) => answer === null && index > examState.current);
        if (nextUnanswered !== -1) examState.current = nextUnanswered;
        renderQuestion();
    });

    // Confirm before ending early; unanswered questions count as incorrect in this prototype.
    document.getElementById("submit-exam").addEventListener("click", () => {
        const unanswered = examState.selected.filter((answer) => answer === null).length;
        if (unanswered > 0 && !window.confirm(`There are ${unanswered} unanswered questions. Submit anyway?`)) return;
        finishExam();
    });

    // Update the visible countdown once per second and end automatically when time expires.
    const examTimer = setInterval(() => {
        examState.seconds -= 1;
        const minutes = Math.floor(examState.seconds / 60);
        const seconds = examState.seconds % 60;
        timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        if (examState.seconds <= 60) timerElement.classList.add("timer-warning");
        if (examState.seconds <= 0) finishExam();
    }, 1000);

    renderQuestion();
}

// Display the local prototype score and certificate; the production result must come from the backend.
const resultScore = document.getElementById("result-score");
if (resultScore) {
    const result = JSON.parse(sessionStorage.getItem("examResult") || "null");
    if (!result) {
        document.getElementById("result-heading").textContent = "No result available";
        document.getElementById("result-detail").textContent = "Complete an examination to see your result.";
    } else {
        resultScore.textContent = `${result.percentage}%`;
        document.getElementById("result-heading").textContent = result.passed ? "Congratulations, you passed" : "You did not pass this time";
        document.getElementById("result-detail").textContent = `${result.correct} correct out of ${result.total} questions`;
        if (result.passed) {
            document.getElementById("certificate").hidden = false;
            fetch("/api/students/profile", { credentials: "same-origin" })
                .then((response) => response.ok ? response.json() : Promise.reject(new Error("Profile unavailable")))
                .then((profile) => {
                    document.getElementById("certificate-student-name").textContent = profile.fullName || profile.name || "Student";
                })
                .catch(() => showFormMessage("result-message", "Certificate name requires an authenticated Spring Boot student session."));
        }
    }
}
