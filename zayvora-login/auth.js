import { isValidEmail } from './utils.js';

(function() {
    const AUTH_KEY = 'zayvora_auth_jwt';
    const APP_CONTENT_WRAPPER_ID = 'mainAppContentWrapper';
    const LOGIN_FORM_ID = 'authLoginForm';
    const LOGOUT_BUTTON_ID = 'authLogoutButton';
    const LOGIN_ERROR_ID = 'authLoginError';

    // --- Core Authentication Logic ---

    function setAuthToken(token) {
        localStorage.setItem(AUTH_KEY, token);
        console.log('Auth: Token set.');
    }

    function getAuthToken() {
        return localStorage.getItem(AUTH_KEY);
    }

    function removeAuthToken() {
        localStorage.removeItem(AUTH_KEY);
        console.log('Auth: Token removed.');
    }

    function isAuthenticated() {
        return !!getAuthToken();
    }

    /**
     * Attempts to log in using the API.
     */
    async function login(username, password) {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                setAuthToken(data.token);
                console.log(`Auth: User logged in successfully.`);
                return true;
            } else {
                console.warn(`Auth: Login failed.`, data.message);
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    async function register(formData) {
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'An error occurred during registration.' };
        }
    }

    async function forgotPassword(email) {
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            return { success: response.ok, message: data.message, mockToken: data._mockToken };
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, message: 'An error occurred.' };
        }
    }

    async function resetPassword(token, newPassword) {
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, message: 'An error occurred.' };
        }
    }

    /**
     * Logs out the current user by clearing their authentication token.
     * Updates the UI to reflect the logged-out state.
     */
    function logout() {
        const token = getAuthToken();
        fetch('/auth/logout', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).catch(() => {});
        removeAuthToken();
        console.log('Auth: User logged out.');
        renderAuthUI(); // Update UI to show login form
    }

    // --- UI Manipulation Logic to integrate with index.html ---

    /**
     * Hides the main application content div.
     */
    function hideAppContent() {
        const appContainer = document.getElementById(APP_CONTENT_WRAPPER_ID);
        if (appContainer) {
            appContainer.style.display = 'none';
        }
    }

    /**
     * Shows the main application content div.
     */
    function showAppContent() {
        const appContainer = document.getElementById(APP_CONTENT_WRAPPER_ID);
        if (appContainer) {
            appContainer.style.display = ''; // Reset display to default (e.g., 'block')
        }
    }

    /**
     * Creates and appends a login form to the document body.
     * Reuses the '.container' class for consistent styling.
     */
    function createLoginForm() {
        let form = document.getElementById(LOGIN_FORM_ID);
        if (form) return; // If form already exists, do nothing

        form = document.createElement('div');
        form.id = LOGIN_FORM_ID;
        form.className = 'container'; // Apply existing styling
        form.innerHTML = `
            <h2>Login</h2>
            <input type="text" id="username" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <button id="loginSubmit">Login</button>
            <p style="text-align: center; margin-top: 15px;">
                <a href="#" id="forgotPasswordLink" style="color: #007bff; text-decoration: none;">Forgot Password?</a>
            </p>
            <p style="text-align: center; margin-top: 10px;">
                Don't have an account? <a href="#" id="registerLink" style="color: #007bff; text-decoration: none;">Register</a>
            </p>
            <p id="${LOGIN_ERROR_ID}" style="color: red; margin-top: 10px; text-align: center;"></p>
        `;
        document.body.appendChild(form);

        // Attach event listener for login submission
        document.getElementById('loginSubmit').onclick = async () => {
            const username = document.getElementById('username').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById(LOGIN_ERROR_ID);

            if (!isValidEmail(username)) {
                errorDiv.textContent = 'Please enter a valid email address.';
                return;
            }

            const success = await login(username, password);
            if (success) {
                errorDiv.textContent = ''; // Clear any previous error message
                renderAuthUI(); // Update UI after successful login
            } else {
                errorDiv.textContent = 'Invalid username or password.';
            }
        };

        document.getElementById('forgotPasswordLink').onclick = (e) => {
            e.preventDefault();
            removeLoginForm();
            createForgotPasswordForm();
        };

        document.getElementById('registerLink').onclick = (e) => {
            e.preventDefault();
            removeLoginForm();
            createRegisterForm();
        };
    }

    function createForgotPasswordForm() {
        let form = document.getElementById('forgotPasswordForm');
        if (form) return;

        form = document.createElement('div');
        form.id = 'forgotPasswordForm';
        form.className = 'container';
        form.innerHTML = `
            <h2>Forgot Password</h2>
            <p style="margin-bottom: 15px; color: #555;">Enter your email to receive a reset link.</p>
            <input type="text" id="forgotEmail" placeholder="Email">
            <button id="forgotSubmit">Send Reset Link</button>
            <p style="text-align: center; margin-top: 15px;">
                <a href="#" id="backToLoginLink" style="color: #007bff; text-decoration: none;">Back to Login</a>
            </p>
            <p id="forgotMessage" style="margin-top: 10px; text-align: center;"></p>
        `;
        document.body.appendChild(form);

        document.getElementById('forgotSubmit').onclick = async () => {
            const email = document.getElementById('forgotEmail').value;
            const msgDiv = document.getElementById('forgotMessage');

            if (!isValidEmail(email)) {
                msgDiv.style.color = 'red';
                msgDiv.textContent = 'Please enter a valid email address.';
                return;
            }

            msgDiv.style.color = '#333';
            msgDiv.textContent = 'Sending...';

            const result = await forgotPassword(email);
            if (result.success) {
                msgDiv.style.color = 'green';
                msgDiv.innerHTML = result.message;
                if (result.mockToken) {
                    // For testing purposes, we show the link
                    msgDiv.innerHTML += `<br><br><a href="/?token=${result.mockToken}">[Mock] Click here to reset</a>`;
                }
            } else {
                msgDiv.style.color = 'red';
                msgDiv.textContent = result.message;
            }
        };

        document.getElementById('backToLoginLink').onclick = (e) => {
            e.preventDefault();
            form.remove();
            createLoginForm();
        };
    }

    function createRegisterForm() {
        let form = document.getElementById('registerForm');
        if (form) return;

        form = document.createElement('div');
        form.id = 'registerForm';
        form.className = 'container';
        form.innerHTML = `
            <h2>Register</h2>
            <p style="margin-bottom: 15px; color: #555; font-size: 14px;">Use your Zayvora username/email and a strong password.</p>
            <input type="text" id="regFirstName" placeholder="First Name">
            <input type="text" id="regLastName" placeholder="Last Name">
            <input type="text" id="regEmail" placeholder="Username or Email">
            <input type="password" id="regPassword" placeholder="Password">
            <button id="registerSubmit">Register</button>
            <p style="text-align: center; margin-top: 15px;">
                Already have an account? <a href="#" id="backToLoginFromReg" style="color: #007bff; text-decoration: none;">Login</a>
            </p>
            <p id="registerMessage" style="margin-top: 10px; text-align: center;"></p>
        `;
        document.body.appendChild(form);

        document.getElementById('registerSubmit').onclick = async () => {
            const firstName = document.getElementById('regFirstName').value;
            const lastName = document.getElementById('regLastName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const msgDiv = document.getElementById('registerMessage');

            if (!password || !firstName) {
                msgDiv.style.color = 'red';
                msgDiv.textContent = 'First name and password are required (minimum 10 characters).';
                return;
            }

            msgDiv.style.color = '#333';
            msgDiv.textContent = 'Registering...';

            const formData = {
                username: email.trim().toLowerCase(),
                password
            };

            const result = await register(formData);
            if (result.success) {
                msgDiv.style.color = 'green';
                msgDiv.textContent = result.message + ' You can now log in.';
                setTimeout(() => {
                    form.remove();
                    createLoginForm();
                }, 2000);
            } else {
                msgDiv.style.color = 'red';
                msgDiv.textContent = result.message;
            }
        };

        document.getElementById('backToLoginFromReg').onclick = (e) => {
            e.preventDefault();
            form.remove();
            createLoginForm();
        };
    }

    function createResetPasswordForm(token) {
        let form = document.getElementById('resetPasswordForm');
        if (form) return;

        form = document.createElement('div');
        form.id = 'resetPasswordForm';
        form.className = 'container';
        form.innerHTML = `
            <h2>Reset Password</h2>
            <input type="password" id="newPassword" placeholder="New Password">
            <button id="resetSubmit">Reset Password</button>
            <p style="text-align: center; margin-top: 15px;">
                <a href="/" style="color: #007bff; text-decoration: none;">Back to Login</a>
            </p>
            <p id="resetMessage" style="margin-top: 10px; text-align: center;"></p>
        `;
        document.body.appendChild(form);

        document.getElementById('resetSubmit').onclick = async () => {
            const newPassword = document.getElementById('newPassword').value;
            const msgDiv = document.getElementById('resetMessage');
            msgDiv.style.color = '#333';
            msgDiv.textContent = 'Resetting...';

            const result = await resetPassword(token, newPassword);
            if (result.success) {
                msgDiv.style.color = 'green';
                msgDiv.textContent = result.message + ' You can now log in.';
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                msgDiv.style.color = 'red';
                msgDiv.textContent = result.message;
            }
        };
    }

    /**
     * Removes the login form from the document.
     */
    function removeLoginForm() {
        const form = document.getElementById(LOGIN_FORM_ID);
        if (form) {
            form.remove();
        }
    }

    /**
     * Adds a logout button to the main application content container.
     */
    function addLogoutButton() {
        let logoutBtn = document.getElementById(LOGOUT_BUTTON_ID);
        if (logoutBtn) return; // If button already exists, do nothing

        const appContainer = document.getElementById(APP_CONTENT_WRAPPER_ID);
        if (appContainer) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = LOGOUT_BUTTON_ID;
            logoutBtn.textContent = 'Logout';
            logoutBtn.style.marginTop = '15px'; // Add some spacing for better layout
            logoutBtn.onclick = logout; // Assign the logout function
            appContainer.appendChild(logoutBtn);
        }
    }

    /**
     * Removes the logout button from the document.
     */
    function removeLogoutButton() {
        const logoutBtn = document.getElementById(LOGOUT_BUTTON_ID);
        if (logoutBtn) {
            logoutBtn.remove();
        }
    }

    /**
     * Renders the appropriate UI elements based on the current authentication status.
     * Shows app content and logout button if authenticated, or login form otherwise.
     */
    function renderAuthUI() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            hideAppContent();
            removeLoginForm();
            removeLogoutButton();
            createResetPasswordForm(token);
            return;
        }

        if (isAuthenticated()) {
            removeLoginForm();
            showAppContent();
            addLogoutButton();
        } else {
            hideAppContent();
            createLoginForm();
            removeLogoutButton();
        }
    }

    // --- Initialization ---

    /**
     * This function runs once the entire DOM is loaded.
     * It identifies the main application content and applies authentication protection.
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Find the main application content based on the existing structure.
        // We assume the primary content to be protected is within the first div with class 'container'.
        const existingAppContent = document.querySelector('.container');
        if (existingAppContent) {
            // Assign a unique ID to the existing app content for easier manipulation by auth.js.
            // This allows auth.js to control its visibility.
            existingAppContent.id = APP_CONTENT_WRAPPER_ID;
            console.log('Auth: Main app content identified and prepared for authentication control.');
        } else {
            console.error('Auth: Could not find main app content (div with class "container"). Authentication UI may not function correctly.');
            // If the main container isn't found, ensure content is visible (as it can't be hidden)
            // but authentication functions are still exposed.
            showAppContent(); // Attempt to show, though it won't find a target.
            return; // Exit early as UI manipulation won't be effective.
        }

        // Perform the initial UI rendering based on current authentication status.
        renderAuthUI();
    });

    // Expose authentication functions globally via `window.auth` for potential external use
    // by other scripts or inline event handlers in the `index.html`.
    window.auth = {
        login: login,
        logout: logout,
        isAuthenticated: isAuthenticated,
        getToken: getAuthToken // Expose token getter for advanced use cases
    };

    console.log('Auth module initialized.');
})();
