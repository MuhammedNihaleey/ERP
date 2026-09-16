// ============================================================
// SAMPLE FOOTWEAR ERP — login
//
// An account belongs to one role and one role only. The role in the
// dropdown is not a hint the screen ignores — it is checked against
// the account, so the salesman login cannot open the office screen
// and the office login cannot open the salesman screen.
// ============================================================

// ---------- role dropdown ----------

function renderRoles() {
  el("role").innerHTML = ROLES.map(function (r) {
    return '<option value="' + r.key + '"' +
      (r.key === "salesman" ? " selected" : "") + ">" +
      esc(r.label) + (roleHasLogin(r.key) ? "" : " (no login yet)") +
      "</option>";
  }).join("");
}

function selectedRole() {
  return el("role").value;
}

// ---------- messages ----------

function showError(msg) {
  const box = el("loginError");
  box.textContent = msg;
  box.hidden = false;
  flash(box, "is-shake");
}

function clearError() {
  el("loginError").hidden = true;
}

// A role with no screen behind it says so up front, rather than
// letting someone type credentials that could never work.
function renderRoleNote() {
  const role = selectedRole();
  const note = el("roleNote");

  if (roleHasLogin(role)) {
    note.hidden = true;
    el("loginBtn").disabled = false;
    return;
  }

  note.textContent = roleLabel(role) +
    " has no screen in this demo — only Salesman and Office can sign in.";
  note.hidden = false;
  el("loginBtn").disabled = true;
}

// ---------- prefill ----------

// Picking a role drops in that role's demo account, so the sign-in is one
// click during a presentation. Typing over it is what proves the gate:
// rajesh.k under Office is refused.
function prefillForRole() {
  const role = selectedRole();
  const user = USERS.find(function (u) { return u.role === role; });

  el("userid").value = user ? user.userId : "";
  el("password").value = user ? user.password : "";
  clearError();
  renderRoleNote();
}

function signInAs(userId) {
  const user = findUser(userId);
  if (!user) return;
  el("role").value = user.role;
  el("userid").value = user.userId;
  el("password").value = user.password;
  clearError();
  renderRoleNote();
  submitLogin();
}

// ---------- the gate ----------

function submitLogin() {
  const role = selectedRole();
  const userId = el("userid").value.trim().toLowerCase();
  const password = el("password").value;

  if (!userId || !password) {
    showError("Enter a user ID and password.");
    return;
  }

  if (!roleHasLogin(role)) {
    showError(roleLabel(role) + " has no screen in this demo yet.");
    return;
  }

  const user = findUser(userId);

  // Wrong id and wrong password are reported the same way on purpose —
  // it tells someone guessing nothing about which half was right.
  if (!user || user.password !== password) {
    showError("User ID or password is not correct.");
    return;
  }

  // The account is real, but it is not this role's account.
  if (user.role !== role) {
    showError(user.userId + " is a " + roleLabel(user.role) +
      " login — it cannot sign in as " + roleLabel(role) + ".");
    return;
  }

  Session.signIn(user);
  window.location.href = user.home;
}

// ---------- boot ----------

renderRoles();

// Who was signed in when a screen turned us away, if anyone. Read before
// the session is cleared, so the message can name them.
const turnedAway = new URLSearchParams(window.location.search).get("denied");
const wasSignedIn = Session.current();

// A stale session from a previous run would otherwise linger behind the
// form — landing on the login screen always means signed out.
Session.signOut();

if (turnedAway) el("role").value = turnedAway;

prefillForRole();

// prefillForRole clears any message, so the redirect is explained after it
if (turnedAway) {
  if (wasSignedIn) {
    showError("You were signed in as " + wasSignedIn.name + " (" +
      roleLabel(wasSignedIn.role) + "). The " + roleLabel(turnedAway) +
      " screen needs a " + roleLabel(turnedAway) + " login.");
  } else {
    showError("Sign in as " + roleLabel(turnedAway) + " to open that screen.");
  }
}

el("role").addEventListener("change", prefillForRole);

["userid", "password"].forEach(function (id) {
  el(id).addEventListener("input", clearError);
});

el("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  submitLogin();
});

document.querySelectorAll("[data-as]").forEach(function (btn) {
  btn.addEventListener("click", function () { signInAs(btn.dataset.as); });
});

// Dummy link for the demo — sign-up is not part of the prototype.
el("signupLink").addEventListener("click", function (e) {
  e.preventDefault();
});
