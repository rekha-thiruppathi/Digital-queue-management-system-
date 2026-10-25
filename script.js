
const API_URL = "http://localhost:8080/api/queue";

const queueForm = document.getElementById("queueForm");
const studentNameInput = document.getElementById("studentName");
const serviceSelect = document.getElementById("service");
const tokenResult = document.getElementById("tokenResult");
const tokenNumber = document.getElementById("tokenNumber");
const tokenMessage = document.getElementById("tokenMessage");
const refreshQueueButton = document.getElementById("refreshQueue");
const lastUpdated = document.getElementById("lastUpdated");

const services = [
    {
        name: "College Office",
        currentId: "collegeCurrent",
        waitingId: "collegeWaiting",
        waitId: "collegeWait"
    },
    {
        name: "Library",
        currentId: "libraryCurrent",
        waitingId: "libraryWaiting",
        waitId: "libraryWait"
    },
    {
        name: "Accounts Section",
        currentId: "accountsCurrent",
        waitingId: "accountsWaiting",
        waitId: "accountsWait"
    },
    {
        name: "Department Office",
        currentId: "departmentCurrent",
        waitingId: "departmentWaiting",
        waitId: "departmentWait"
    }
];

// Generate a token and save it to MySQL through the Java backend.
queueForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const studentName = studentNameInput.value.trim();
    const selectedService = serviceSelect.value;

    if (studentName === "" || selectedService === "") {
        alert("Please enter your name and select a service.");
        return;
    }

    const submitButton = queueForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Generating token...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                studentName: studentName,
                serviceName: selectedService
            })
        });

        if (!response.ok) {
            throw new Error("Could not create token. HTTP " + response.status);
        }

        const token = await response.json();

        tokenNumber.textContent =
            "DQ" + String(token.tokenNumber).padStart(3, "0");

        tokenMessage.textContent =
            "Thank you, " + token.studentName +
            "! Your service is " + token.serviceName +
            ". Status: " + token.status + ".";

        tokenResult.querySelector(".token-label").textContent =
            "YOUR QUEUE TOKEN";

        tokenResult.querySelector(".demo-note").textContent =
            "Your token has been saved to the queue database.";

        tokenResult.hidden = false;
        tokenResult.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

        studentNameInput.value = "";
        serviceSelect.value = "";

        await refreshQueue();
    } catch (error) {
        console.error(error);
        alert(
            "Could not complete the request. Check that the Java backend is running. " +
            error.message
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

// Fetch actual tokens from the Java backend and update all four cards.
async function refreshQueue() {
    refreshQueueButton.disabled = true;
    refreshQueueButton.textContent = "Loading queue...";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const tokens = await response.json();

        services.forEach(function (service) {
            const serviceTokens = tokens.filter(function (token) {
                return token.serviceName === service.name;
            });

            const waitingTokens = serviceTokens.filter(function (token) {
                return token.status === "Waiting";
            });

            // Use the earliest saved Serving token, if one exists.
            const servingTokens = serviceTokens
                .filter(function (token) {
                    return token.status === "Serving";
                })
                .sort(function (a, b) {
                    return a.tokenNumber - b.tokenNumber;
                });

            const currentElement = document.getElementById(service.currentId);
            const waitingElement = document.getElementById(service.waitingId);
            const waitElement = document.getElementById(service.waitId);

            if (servingTokens.length > 0) {
                currentElement.textContent =
                    "DQ" + String(servingTokens[0].tokenNumber).padStart(3, "0");
            } else {
                currentElement.textContent = "None";
            }

            waitingElement.textContent = waitingTokens.length;

            // No real waiting-time calculation exists yet.
            waitElement.textContent = "N/A";
        });

        // Remove labels that say the cards are demonstration data.
        document.querySelectorAll(".status-card .open-label")
            .forEach(function (label) {
                label.textContent = "Live data";
            });

        document.querySelector(".live-queue-section .demo-banner")
            .textContent = "Queue status retrieved from the database";

        document.querySelector(".live-queue-section .section-heading p")
            .textContent = "Queue status based on tokens saved in the database.";

        document.querySelector(".refresh-note")
            .textContent = "Waiting counts update from the database when refreshed.";

        lastUpdated.textContent =
            "Queue updated: " + new Date().toLocaleTimeString();

    } catch (error) {
        console.error("Could not refresh queue:", error);
        lastUpdated.textContent =
            "Could not load queue data. Check that the Java backend is running.";
    } finally {
        refreshQueueButton.disabled = false;
        refreshQueueButton.textContent = "↻ Refresh Live Queue";
    }
}

refreshQueueButton.addEventListener("click", refreshQueue);

// Load real queue data when the page opens and refresh every 10 seconds.
refreshQueue();
setInterval(refreshQueue, 10000);
