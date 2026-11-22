
// Function to handle login buttons

function openLogin(userType) {

    if (userType === "Admin") {

        alert("Admin Login page will be developed in the next step.");

    } 
    else if (userType === "Student") {

        alert("Student Login page will be developed in the next step.");

    }

}

// Open the correct login page

function openLogin(userType) {

    if (userType === "Admin") {

        window.location.href = "admin-login.html";

    }
    else if (userType === "Student") {

        window.location.href = "student-login.html";

    }

}


// Handle login form submission

function handleLogin(event, userType) {

    event.preventDefault();

    if (userType === "Admin") {

        let email = document.getElementById("adminEmail").value;

        let password = document.getElementById("adminPassword").value;

        alert("Admin login form submitted!\nEmail: " + email);

    }

    else if (userType === "Student") {

        let registrationId = document.getElementById("studentId").value;

        let password = document.getElementById("studentPassword").value;

        alert("Student login form submitted!\nRegistration ID: " + registrationId);

    }

}
