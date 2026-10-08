import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    getIdToken
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyAPK7xOzqujXWkXntKz6ojnb1jZag7WW7c",

    authDomain:
        "cloudshield-7081e.firebaseapp.com",

    projectId:
        "cloudshield-7081e",

    storageBucket:
        "cloudshield-7081e.firebasestorage.app",

    messagingSenderId:
        "1065716286697",

    appId:
        "1:1065716286697:web:00b489aa11c31d6b5fdc78"

};


const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
    "https://xphnmsyriepjafpntvyq.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_Yts-j_zjimR9pzdEEdmmMw_5_yMCrYw";


// ============================================================
// STATE
// ============================================================

let adminUsers = [];
let adminEvents = [];
let adminFiles = [];
let adminRequests = [];

let currentPanel = "";


// ============================================================
// HELPERS
// ============================================================

const $ =
    id => document.getElementById(id);


const escapeHtml =
    value =>
        String(value ?? "")
            .replace(
                /[&<>'"]/g,
                char => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;"
                }[char])
            );


function formatTime(timestamp) {

    return timestamp?.toDate
        ? timestamp
            .toDate()
            .toLocaleString(
                [],
                {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        : "—";

}


function formatDate(timestamp) {

    return timestamp?.toDate
        ? timestamp
            .toDate()
            .toLocaleDateString(
                [],
                {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                }
            )
        : "—";

}


function score(
    blocked,
    failed
) {

    return Math.max(
        0,
        100 -
        (blocked * 10)
    );

}


function label(value) {

    return value >= 90
        ? "Excellent"
        : value >= 75
            ? "Good"
            : value >= 60
                ? "Attention"
                : "High Risk";

}


function emptyState(text) {

    return `
        <div
            class="rounded-xl
                   border border-slate-800
                   bg-slate-900/40
                   p-6
                   text-center
                   text-sm
                   text-slate-500">

            ${escapeHtml(text)}

        </div>
    `;

}


function userById(id) {

    return adminUsers.find(
        user => user.id === id
    );

}


function fileById(id) {

    return adminFiles.find(
        file => file.id === id
    );

}

function isUnauthorizedEvent(event) {

    return (
        event?.action ===
            "Unauthorized protected document access attempt"
        &&
        event?.status === "BLOCKED"
    );

}

// ============================================================
// PANEL
// ============================================================

function setPanel(
    title,
    eyebrow = "CloudShield"
) {

    $("panelEyebrow").textContent =
        eyebrow;

    $("panelTitle").textContent =
        title;

    $("sidePanel")
        .classList
        .remove("hidden");

    document.body.classList.add(
        "overflow-hidden"
    );

    currentPanel =
        title;

}


function closePanel() {

    $("sidePanel")
        .classList
        .add("hidden");

    document.body.classList.remove(
        "overflow-hidden"
    );

    currentPanel = "";

}


function setPanelLoading() {

    $("panelContent").innerHTML = `
        <div class="py-12
                    text-center
                    text-sm
                    text-slate-500">

            Loading...

        </div>
    `;

}


function setActiveNav(id) {

    document
        .querySelectorAll(
            "nav a[id^='nav-']"
        )
        .forEach(
            link => {

                link.classList.remove(
                    "sidebar-active",
                    "text-white"
                );

                link.classList.add(
                    "text-slate-400"
                );

            }
        );


    const active =
        $(id);


    if (active) {

        active.classList.add(
            "sidebar-active",
            "text-white"
        );

        active.classList.remove(
            "text-slate-400"
        );

    }

}


// ============================================================
// LOAD ALL ADMIN DATA
// ============================================================

async function loadAdminData() {

    const [
        usersSnapshot,
        eventsSnapshot,
        filesSnapshot,
        requestsSnapshot
    ] =
        await Promise.all([

            getDocs(
                collection(
                    db,
                    "users"
                )
            ),

            getDocs(
                collection(
                    db,
                    "securityEvents"
                )
            ),

            getDocs(
                collection(
                    db,
                    "files"
                )
            ),

            getDocs(
                collection(
                    db,
                    "accessRequests"
                )
            )

        ]);


    adminUsers =
        usersSnapshot.docs.map(
            d => ({
                id: d.id,
                ...d.data()
            })
        );


    adminEvents =
        eventsSnapshot.docs.map(
            d => ({
                id: d.id,
                ...d.data()
            })
        );


    adminFiles =
        filesSnapshot.docs.map(
            d => ({
                id: d.id,
                ...d.data()
            })
        );


    adminRequests =
        requestsSnapshot.docs.map(
            d => ({
                id: d.id,
                ...d.data()
            })
        );


    renderDashboardStats();
    renderEmployeeSecurity();
    renderAccessChart();

}


// ============================================================
// DASHBOARD STATS
// ============================================================

function renderDashboardStats() {

    const allowed =
        adminEvents.filter(
            event =>
                event.status ===
                "ALLOWED"
        ).length;


   const blocked =
    adminEvents.filter(
        isUnauthorizedEvent
    ).length;

const securityScore =
    Math.max(
        0,
        100 - (blocked * 10)
    );

    $("totalUsers").textContent =
        adminUsers.length;


    $("allowedRequests").textContent =
        allowed;


    $("blockedRequests").textContent =
        blocked;


    $("adminScore").textContent =
        securityScore;

$("threatTotal").textContent =
    adminEvents.length;

$("failedThreats").textContent =
    adminEvents.length;

$("unauthorizedThreats").textContent =
    adminEvents.filter(
        event =>
            event.status === "ALLOWED"
    ).length;

$("suspiciousThreats").textContent =
    blocked;

$("permissionThreats").textContent =
    adminEvents.filter(
        event =>
            event.action ===
            "Unauthorized protected document access attempt"
    ).length;


    $("alertBadge")
        .textContent =
            blocked;

}


// ============================================================
// EMPLOYEE SECURITY TABLE
// ============================================================

function renderEmployeeSecurity() {

    const body =
        $("employeeSecurityBody");


    const employees =
        adminUsers.filter(
            user =>
                user.role ===
                "employee"
        );


    if (!employees.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="px-6 py-8
                           text-center
                           text-slate-600">

                    No employee accounts found.

                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        employees
            .map(
                user => {

                    const mine =
                        adminEvents.filter(
                            event =>
                                event.userId ===
                                user.id
                        );

const blocked =
    mine.filter(
        event =>
            event.status === "BLOCKED" &&
            event.action ===
                "Unauthorized protected document access attempt"
    ).length;


const securityScore =
    Math.max(
        0,
        100 - (blocked * 10)
    );


                    const fileCount =
                        adminFiles.filter(
                            file =>
                                file.userId ===
                                user.id
                        ).length;


                    const scoreColor =
                        securityScore >= 90
                            ? "emerald"
                            : securityScore >= 75
                                ? "amber"
                                : "red";


                    return `
                        <tr
                            class="
                                border-b
                                border-slate-800/50
                                hover:bg-slate-800/20
                            ">

                            <td
                                class="
                                    px-6 py-4
                                    text-slate-300
                                ">

                                ${escapeHtml(
                                    user.email ||
                                    "Unknown"
                                )}

                            </td>


                            <td
                                class="
                                    px-6 py-4
                                    text-blue-400
                                    uppercase
                                ">

                                ${escapeHtml(
                                    user.role
                                )}

                            </td>


                            <td
                                class="px-6 py-4">

                                <span
                                    class="
                                        font-semibold
                                        text-white
                                    ">

                                    ${securityScore}/100

                                </span>

                                <span
                                    class="
                                        ml-2
                                        text-[10px]
                                        text-${scoreColor}-400
                                    ">

                                    ${label(
                                        securityScore
                                    )}

                                </span>

                            </td>


                            <td
                                class="
                                    px-6 py-4
                                    text-${blocked
                                        ? "amber"
                                        : "emerald"}-400
                                ">

                                ${blocked}

                            </td>


                            <td
                                class="
                                    px-6 py-4
                                    text-slate-400
                                ">

                                ${fileCount}

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// ============================================================
// ACCESS CHART
// ============================================================

function renderAccessChart() {

    const chart =
        $("accessChart");


    if (!chart) return;


    const days = [];


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date();

        date.setHours(
            0,
            0,
            0,
            0
        );

        date.setDate(
            date.getDate() - i
        );

        days.push(
            date
        );

    }


    const values =
        days.map(
            day => {

                const next =
                    new Date(
                        day
                    );

                next.setDate(
                    next.getDate() + 1
                );


                const events =
                    adminEvents.filter(
                        event => {

                            if (
                                !event.timestamp?.toDate
                            ) {
                                return false;
                            }


                            const time =
                                event.timestamp
                                    .toDate();


                            return (
                                time >= day &&
                                time < next
                            );

                        }
                    );


                return {

                    day:
                        day.toLocaleDateString(
                            [],
                            {
                                weekday:
                                    "short"
                            }
                        ),

                    allowed:
                        events.filter(
                            event =>
                                event.status ===
                                "ALLOWED"
                        ).length,

                    blocked:
                        events.filter(
                            event =>
                                event.status ===
                                "BLOCKED"
                        ).length

                };

            }
        );


    const maximum =
        Math.max(
            1,
            ...values.map(
                value =>
                    value.allowed +
                    value.blocked
            )
        );


    chart.innerHTML =
        values.map(
            value => {

                const allowedHeight =
                    Math.max(
                        4,
                        Math.round(
                            (
                                value.allowed /
                                maximum
                            ) * 150
                        )
                    );


                const blockedHeight =
                    value.blocked
                        ? Math.max(
                            4,
                            Math.round(
                                (
                                    value.blocked /
                                    maximum
                                ) * 150
                            )
                        )
                        : 0;


                return `
                    <div
                        class="
                            flex-1
                            h-full
                            flex
                            items-end
                            justify-center
                            gap-1
                        "
                        title="${value.day}: ${value.allowed} allowed, ${value.blocked} blocked">

                        <div
                            class="
                                w-2.5
                                rounded-t
                                bg-blue-500/50
                            "
                            style="
                                height:${allowedHeight}px
                            ">
                        </div>


                        <div
                            class="
                                w-2.5
                                rounded-t
                                bg-red-500/60
                            "
                            style="
                                height:${blockedHeight}px
                            ">
                        </div>

                    </div>
                `;

            }
        )
        .join("");

}


// ============================================================
// SECURITY ALERTS
// ============================================================

function renderAlerts() {

    const alerts =
        adminEvents
            .filter(
                event =>
                    event.status === "BLOCKED" ||
                    event.status === "FAILED"
            )
            .sort(
                (a, b) =>
                    (
                        b.timestamp
                            ?.toMillis?.() || 0
                    ) -
                    (
                        a.timestamp
                            ?.toMillis?.() || 0
                    )
            );


    $("panelContent").innerHTML =
        alerts.length

            ? alerts
                .map(
                    event => `
                        <div
                            class="
                                mb-3
                                rounded-xl
                                border
                                border-red-500/15
bg-red-500/5
                                p-4
                            ">

                            <div
                                class="
                                    flex
                                    items-start
                                    justify-between
                                    gap-4
                                ">

                                <div>

                                    <p
                                        class="
                                            text-sm
                                            font-medium
                                            text-white
                                        ">

                                        ${escapeHtml(
                                            event.action ||
                                            "Security event"
                                        )}

                                    </p>


                                    <p
                                        class="
                                            text-xs
                                            text-slate-500
                                            mt-1
                                        ">

                                        ${escapeHtml(
                                            event.email ||
                                            "Unknown user"
                                        )}

                                    </p>

                                </div>


                                <span
                                    class="
                                        text-[10px]
                                        px-2 py-1
                                        rounded-md
                                        ${
                                            event.status ===
                                            "BLOCKED"

                                                ? "bg-red-500/10 text-red-400"

                                                : "bg-amber-500/10 text-amber-400"
                                        }
                                    ">

                                    ${escapeHtml(
                                        event.status
                                    )}

                                </span>

                            </div>


                            <p
                                class="
                                    text-[11px]
                                    text-slate-600
                                    mt-3
                                ">

                                ${formatTime(
                                    event.timestamp
                                )}

                            </p>

                        </div>
                    `
                )
                .join("")

            : emptyState(
                "No blocked or failed security events."
            );

}


// ============================================================
// ACTIVITY LOGS
// ============================================================

function renderLogs() {

    const events =
        [...adminEvents]
            .sort(
                (a, b) =>
                    (
                        b.timestamp
                            ?.toMillis?.() || 0
                    ) -
                    (
                        a.timestamp
                            ?.toMillis?.() || 0
                    )
            );


    $("panelContent").innerHTML =
        events.length

            ? `
                <div
                    class="
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-800
                    ">

                    <table
                        class="w-full text-left">

                        <thead
                            class="
                                bg-slate-900/70
                            ">

                            <tr
                                class="
                                    text-[10px]
                                    uppercase
                                    tracking-widest
                                    text-slate-600
                                ">

                                <th class="px-4 py-3">
                                    Time
                                </th>

                                <th class="px-4 py-3">
                                    User
                                </th>

                                <th class="px-4 py-3">
                                    Action
                                </th>

                                <th class="px-4 py-3">
                                    Result
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${events.map(
                                event => `

                                    <tr
                                        class="
                                            border-t
                                            border-slate-800/70
                                        ">

                                        <td
                                            class="
                                                px-4 py-3
                                                text-xs
                                                text-slate-500
                                            ">

                                            ${formatTime(
                                                event.timestamp
                                            )}

                                        </td>


                                        <td
                                            class="
                                                px-4 py-3
                                                text-xs
                                                text-slate-300
                                            ">

                                            ${escapeHtml(
                                                event.email ||
                                                "Unknown"
                                            )}

                                        </td>


                                        <td
                                            class="
                                                px-4 py-3
                                                text-xs
                                                text-slate-400
                                            ">

                                            ${escapeHtml(
                                                event.action ||
                                                "Security event"
                                            )}

                                        </td>


                                        <td
                                            class="
                                                px-4 py-3
                                                text-[10px]
                                                ${
                                                    event.status ===
                                                    "BLOCKED"

                                                        ? "text-red-400"

                                                        : event.status ===
                                                          "FAILED"

                                                            ? "text-amber-400"

                                                            : "text-emerald-400"
                                                }
                                            ">

                                            ${escapeHtml(
                                                event.status ||
                                                "UNKNOWN"
                                            )}

                                        </td>

                                    </tr>

                                `
                            ).join("")}

                        </tbody>

                    </table>

                </div>
            `

            : emptyState(
                "No security events recorded yet."
            );

}


// ============================================================
// SECURITY TESTS
// ============================================================

function renderTests() {

    const controls = [

        "Firebase Authentication",

        "Firestore role-based access control",

        "Secure file ownership checks",

        "Shared-file permission checks",

        "Admin-only deletion",

        "Security event logging",

        "Access request approval workflow"

    ];


    $("panelContent").innerHTML = `

        <div class="space-y-3">

            ${controls.map(
                control => `

                    <div
                        class="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            border
                            border-slate-800
                            bg-slate-900/40
                            p-4
                        ">

                        <p
                            class="
                                text-sm
                                text-white
                            ">

                            ${escapeHtml(
                                control
                            )}

                        </p>


                        <span
                            class="
                                text-[10px]
                                text-emerald-400
                                bg-emerald-500/10
                                px-2 py-1
                                rounded-md
                            ">

                            ACTIVE

                        </span>

                    </div>

                `
            ).join("")}

        </div>

    `;

}


// ============================================================
// USERS
// ============================================================

function userCard(
    user,
    role
) {

    return `

        <div
            class="
                mb-2
                rounded-xl
                border
                border-slate-800
                bg-slate-900/40
                p-4
                flex
                items-center
                justify-between
            ">

            <div>

                <p
                    class="
                        text-sm
                        text-white
                    ">

                    ${escapeHtml(
                        user.email ||
                        "Unknown"
                    )}

                </p>

                <p
                    class="
                        text-[10px]
                        text-slate-600
                        mt-1
                    ">

                    UID:
                    ${escapeHtml(
                        user.id
                    )}

                </p>

            </div>


            <span
                class="
                    text-[10px]
                    ${
                        role === "ADMIN"
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-slate-400 bg-slate-800"
                    }
                    px-2 py-1
                    rounded-md
                ">

                ${role}

            </span>

        </div>

    `;

}


function renderUsers() {

    const admins =
        adminUsers.filter(
            user =>
                user.role ===
                "admin"
        );


    const employees =
        adminUsers.filter(
            user =>
                user.role ===
                "employee"
        );


    $("panelContent").innerHTML = `

        <div class="space-y-6">

            <div>

                <p
                    class="
                        text-[10px]
                        uppercase
                        tracking-widest
                        text-slate-600
                        mb-3
                    ">

                    Administrators

                </p>


                ${
                    admins.length
                        ? admins
                            .map(
                                user =>
                                    userCard(
                                        user,
                                        "ADMIN"
                                    )
                            )
                            .join("")

                        : emptyState(
                            "No administrators found."
                        )
                }

            </div>


            <div>

                <p
                    class="
                        text-[10px]
                        uppercase
                        tracking-widest
                        text-slate-600
                        mb-3
                    ">

                    Employees

                </p>


                ${
                    employees.length
                        ? employees
                            .map(
                                user =>
                                    userCard(
                                        user,
                                        "EMPLOYEE"
                                    )
                            )
                            .join("")

                        : emptyState(
                            "No employees found."
                        )
                }

            </div>

        </div>

    `;

}


// ============================================================
// PROFILE
// ============================================================

function renderProfile() {

    const user =
        auth.currentUser;


    const data =
        userById(
            user?.uid
        ) || {};


    $("panelContent").innerHTML = `

        <div
            class="
                rounded-2xl
                border
                border-slate-800
                bg-slate-900/40
                p-6
            ">

            <div
                class="
                    w-14 h-14
                    rounded-2xl
                    bg-blue-500/10
                    border
                    border-blue-500/20
                    flex
                    items-center
                    justify-center
                    text-xl
                    font-semibold
                    text-blue-400
                ">

                ${
                    escapeHtml(
                        (
                            user?.email ||
                            "A"
                        )[0]
                            .toUpperCase()
                    )
                }

            </div>


            <p
                class="
                    text-lg
                    font-semibold
                    text-white
                    mt-5
                ">

                ${escapeHtml(
                    user?.email ||
                    "Unknown"
                )}

            </p>


            <span
                class="
                    inline-block
                    mt-2
                    text-[10px]
                    text-blue-400
                    bg-blue-500/10
                    px-2 py-1
                    rounded-md
                    uppercase
                ">

                ${escapeHtml(
                    data.role ||
                    "admin"
                )}

            </span>


            <div
                class="
                    mt-6
                    pt-5
                    border-t
                    border-slate-800
                ">

                <p
                    class="
                        text-[10px]
                        uppercase
                        tracking-widest
                        text-slate-600
                    ">

                    Account created

                </p>


                <p
                    class="
                        text-sm
                        text-slate-300
                        mt-2
                    ">

                    ${formatDate(
                        data.createdAt
                    )}

                </p>

            </div>

        </div>

    `;

}


// ============================================================
// ADMIN TOKEN
// ============================================================

async function adminToken() {

    return await getIdToken(
        auth.currentUser,
        true
    );

}


// ============================================================
// VIEW FILE
// ============================================================

async function openSecureFile(
    file
) {

    if (!file) return;


    const viewer =
        window.open(
            "about:blank",
            "_blank"
        );


    if (!viewer) {

        alert(
            "Please allow pop-ups for CloudShield."
        );

        return;

    }


    try {

        viewer.document.write(
            "<title>CloudShield — Secure File</title>" +
            "<body style='font-family:system-ui;background:#050914;color:#cbd5e1;padding:40px'>" +
            "Opening secure file…" +
            "</body>"
        );


        const token =
            await adminToken();


        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/cloudshield-files`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "apikey":
                            SUPABASE_ANON_KEY

                    },

                    body:
                        JSON.stringify({

                            action:
                                "download-url",

                            idToken:
                                token,

                            fileId:
                                file.id,

                            path:
                                file.storagePath

                        })

                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                "Access denied."
            );

        }


        const binary = atob(result.fileBase64);

const bytes = Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
);

const blob = new Blob(
    [bytes],
    {
        type:
            result.contentType ||
            "application/octet-stream"
    }
);

const fileUrl =
    URL.createObjectURL(blob);

viewer.location.href = fileUrl;

setTimeout(() => {
    URL.revokeObjectURL(fileUrl);
}, 60000);


    } catch (error) {

        if (
            viewer &&
            !viewer.closed
        ) {

            viewer.close();

        }


        alert(
            error.message ||
            "Could not open file."
        );

    }

}


// ============================================================
// DELETE FILE
// ============================================================

async function deleteAdminFile(
    file
) {

    if (!file) return;


    const confirmed =
        confirm(
            `Delete "${file.fileName || "this file"}" permanently?`
        );


    if (!confirmed) return;


    try {

        const token =
            await adminToken();


        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/cloudshield-files`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "apikey":
                            SUPABASE_ANON_KEY

                    },

                    body:
                        JSON.stringify({

                            action:
                                "delete-file",

                            idToken:
                                token,

                            fileId:
                                file.id,

                            path:
                                file.storagePath

                        })

                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                "Delete denied."
            );

        }


        await deleteDoc(
            doc(
                db,
                "files",
                file.id
            )
        );


        adminFiles =
            adminFiles.filter(
                item =>
                    item.id !==
                    file.id
            );


        renderFilesPanel();
        renderEmployeeSecurity();

        alert(
            "File deleted successfully."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            error.message ||
            "Could not delete file."
        );

    }

}


// ============================================================
// MANAGE FILE ACCESS
// ============================================================

async function manageFileAccess(
    file
) {

    if (!file) return;


    const employees =
        adminUsers.filter(
            user =>
                user.role === "employee" &&
                user.id !== file.userId
        );


    const granted =
        Array.isArray(
            file.allowedUsers
        )
            ? file.allowedUsers
            : [];


    $("fileModalTitle")
        .textContent =
            "Manage File Access";


    $("fileModalContent")
        .innerHTML = `

            <p
                class="
                    text-sm
                    text-white
                    mb-1
                ">

                ${escapeHtml(
                    file.fileName ||
                    "Untitled file"
                )}

            </p>


            <p
                class="
                    text-xs
                    text-slate-600
                    mb-5
                ">

                Owner:
                ${escapeHtml(
                    userById(
                        file.userId
                    )?.email ||
                    file.email ||
                    "Unknown"
                )}

            </p>


            <div
                class="space-y-2">

                ${
                    employees.length

                        ? employees
                            .map(
                                user => `

                                    <label
                                        class="
                                            flex
                                            items-center
                                            justify-between
                                            rounded-xl
                                            border
                                            border-slate-800
                                            bg-slate-900/40
                                            p-3
                                            cursor-pointer
                                        ">

                                        <span
                                            class="
                                                text-sm
                                                text-slate-300
                                            ">

                                            ${escapeHtml(
                                                user.email
                                            )}

                                        </span>


                                        <input

                                            type="checkbox"

                                            class="
                                                grant-user
                                                w-4 h-4
                                                accent-blue-500
                                            "

                                            value="${escapeHtml(
                                                user.id
                                            )}"

                                            ${
                                                granted.includes(
                                                    user.id
                                                )
                                                    ? "checked"
                                                    : ""
                                            }

                                        >

                                    </label>

                                `
                            )
                            .join("")

                        : emptyState(
                            "No other employees available."
                        )
                }

            </div>


            <div
                class="
                    flex
                    justify-end
                    gap-2
                    mt-6
                ">

                <button
                    id="cancelAccess"
                    class="
                        px-4 py-2
                        rounded-lg
                        border
                        border-slate-800
                        text-sm
                        text-slate-400
                        hover:text-white
                    ">

                    Cancel

                </button>


                <button
                    id="saveAccess"
                    class="
                        px-4 py-2
                        rounded-lg
                        bg-blue-600
                        text-sm
                        text-white
                        hover:bg-blue-500
                    ">

                    Save access

                </button>

            </div>

        `;


    $("fileAccessModal")
        .classList
        .remove("hidden");


    $("cancelAccess").onclick =
        () =>
            $("fileAccessModal")
                .classList
                .add("hidden");


    $("saveAccess").onclick =
        async () => {

            const allowedUsers =
                [
                    ...document
                        .querySelectorAll(
                            ".grant-user:checked"
                        )
                ]
                .map(
                    input =>
                        input.value
                );


            try {

                await updateDoc(
                    doc(
                        db,
                        "files",
                        file.id
                    ),
                    {
                        allowedUsers
                    }
                );


                file.allowedUsers =
                    allowedUsers;


                $("fileAccessModal")
                    .classList
                    .add("hidden");


                renderFilesPanel();


            } catch (error) {

                alert(
                    error.message ||
                    "Could not update access."
                );

            }

        };

}


// ============================================================
// SECURE FILES PANEL
// ============================================================

function renderFilesPanel() {

    const files =
        [...adminFiles]
            .sort(
                (a, b) =>
                    (
                        b.createdAt
                            ?.toMillis?.() ||
                        0
                    ) -
                    (
                        a.createdAt
                            ?.toMillis?.() ||
                        0
                    )
            );


    $("panelContent")
        .innerHTML = `

            <div class="flex justify-end mb-4">

                <button
                    id="openAccessRequests"
                    class="
                        px-4 py-2
                        rounded-lg
                        bg-blue-600
                        hover:bg-blue-500
                        text-sm
                        text-white
                    ">

                    <i
                        data-lucide="key-round"
                        class="
                            w-4 h-4
                            inline-block
                            mr-1
                        ">
                    </i>

                    Access Requests

                    ${
                        adminRequests.filter(
                            request =>
                                request.status ===
                                "PENDING"
                        ).length > 0

                            ? `

                                <span
                                    class="
                                        ml-2
                                        px-1.5
                                        py-0.5
                                        rounded-full
                                        bg-amber-500
                                        text-slate-950
                                        text-[10px]
                                        font-semibold
                                    ">

                                    ${
                                        adminRequests.filter(
                                            request =>
                                                request.status ===
                                                "PENDING"
                                        ).length
                                    }

                                </span>

                            `

                            : ""
                    }

                </button>

            </div>


            ${
                files.length

                    ? `

                        <div
                            class="space-y-3">

                            ${
                                files
                                    .map(
                                        file => {

                                            const owner =
                                                userById(
                                                    file.userId
                                                )?.email ||
                                                file.email ||
                                                "Unknown";


                                            const sharedCount =
                                                Array.isArray(
                                                    file.allowedUsers
                                                )
                                                    ? file.allowedUsers.length
                                                    : 0;


                                            return `

                                                <div
                                                    class="
                                                        rounded-xl
                                                        border
                                                        border-slate-800
                                                        bg-slate-900/40
                                                        p-4
                                                    ">

                                                    <div
                                                        class="
                                                            flex
                                                            items-start
                                                            justify-between
                                                            gap-3
                                                        ">

                                                        <div
                                                            class="
                                                                min-w-0
                                                            ">

                                                            <p
                                                                class="
                                                                    text-sm
                                                                    font-medium
                                                                    text-white
                                                                    truncate
                                                                ">

                                                                ${escapeHtml(
                                                                    file.fileName ||
                                                                    "Untitled file"
                                                                )}

                                                            </p>


                                                            <p
                                                                class="
                                                                    text-[11px]
                                                                    text-slate-500
                                                                    mt-1
                                                                ">

                                                                Owner:
                                                                ${escapeHtml(
                                                                    owner
                                                                )}

                                                            </p>


                                                            <p
                                                                class="
                                                                    text-[10px]
                                                                    text-slate-600
                                                                    mt-1
                                                                ">

                                                                ${sharedCount}
                                                                employee
                                                                ${
                                                                    sharedCount === 1
                                                                        ? ""
                                                                        : "s"
                                                                }
                                                                with access

                                                            </p>

                                                        </div>


                                                        <span
                                                            class="
                                                                text-[10px]
                                                                text-emerald-400
                                                                bg-emerald-500/10
                                                                px-2 py-1
                                                                rounded-md
                                                            ">

                                                            SECURED

                                                        </span>

                                                    </div>


                                                    <div
                                                        class="
                                                            flex
                                                            gap-2
                                                            mt-4
                                                        ">

                                                        <button
                                                            data-view-file="${escapeHtml(
                                                                file.id
                                                            )}"
                                                            class="
                                                                flex-1
                                                                px-3 py-2
                                                                rounded-lg
                                                                border
                                                                border-slate-800
                                                                text-xs
                                                                text-slate-300
                                                                hover:text-white
                                                                hover:bg-slate-800
                                                            ">

                                                            View

                                                        </button>


                                                        <button
                                                            data-manage-file="${escapeHtml(
                                                                file.id
                                                            )}"
                                                            class="
                                                                flex-1
                                                                px-3 py-2
                                                                rounded-lg
                                                                border
                                                                border-blue-500/20
                                                                text-xs
                                                                text-blue-400
                                                                hover:bg-blue-500/10
                                                            ">

                                                            Manage Access

                                                        </button>


                                                        <button
                                                            data-delete-file="${escapeHtml(
                                                                file.id
                                                            )}"
                                                            class="
                                                                px-3 py-2
                                                                rounded-lg
                                                                border
                                                                border-red-500/20
                                                                text-xs
                                                                text-red-400
                                                                hover:bg-red-500/10
                                                            ">

                                                            Delete

                                                        </button>

                                                    </div>

                                                </div>

                                            `;

                                        }
                                    )
                                    .join("")
                            }

                        </div>

                    `

                    : emptyState(
                        "No secure files have been uploaded yet."
                    )
            }

        `;


    lucide.createIcons();


    $("openAccessRequests")
        ?.addEventListener(
            "click",
            () =>
                openSection(
                    "requests"
                )
        );


    document
        .querySelectorAll(
            "[data-view-file]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openSecureFile(
                            fileById(
                                button.dataset
                                    .viewFile
                            )
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-manage-file]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        manageFileAccess(
                            fileById(
                                button.dataset
                                    .manageFile
                            )
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-file]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        deleteAdminFile(
                            fileById(
                                button.dataset
                                    .deleteFile
                            )
                        );

            }
        );

}


// ============================================================
// ACCESS REQUESTS
// ============================================================

function renderAccessRequests() {

    const requests =
        [...adminRequests]
            .sort(
                (a, b) =>
                    (
                        b.createdAt
                            ?.toMillis?.() ||
                        0
                    ) -
                    (
                        a.createdAt
                            ?.toMillis?.() ||
                        0
                    )
            );


    const pendingCount =
        requests.filter(
            request =>
                request.status ===
                "PENDING"
        ).length;


    $("panelContent")
        .innerHTML = `

            <div
                class="
                    flex
                    items-center
                    justify-between
                    mb-5
                ">

                <div>

                    <p
                        class="
                            text-sm
                            text-white
                            font-medium
                        ">

                        ${pendingCount}
                        pending request${
                            pendingCount === 1
                                ? ""
                                : "s"
                        }

                    </p>


                    <p
                        class="
                            text-xs
                            text-slate-600
                            mt-1
                        ">

                        Approve or reject employee
                        requests for protected documents.

                    </p>

                </div>


                <button
                    id="refreshRequests"
                    class="
                        px-3 py-2
                        rounded-lg
                        border
                        border-slate-800
                        text-xs
                        text-slate-400
                        hover:text-white
                    ">

                    Refresh

                </button>

            </div>


            ${
                requests.length

                    ? requests
                        .map(
                            request => {

                                const requester =
                                    request.requesterEmail ||
                                    userById(
                                        request.requesterId
                                    )?.email ||
                                    "Unknown employee";


                                const status =
                                    request.status ||
                                    "PENDING";


                                const pending =
                                    status ===
                                    "PENDING";


                                const statusClass =
                                    status === "APPROVED"

                                        ? "bg-emerald-500/10 text-emerald-400"

                                        : status === "REJECTED"

                                            ? "bg-red-500/10 text-red-400"

                                            : "bg-amber-500/10 text-amber-400";


                                return `

                                    <div
                                        class="
                                            rounded-xl
                                            border
                                            border-slate-800
                                            bg-slate-900/40
                                            p-5
                                            mb-3
                                        ">

                                        <div
                                            class="
                                                flex
                                                items-start
                                                justify-between
                                                gap-4
                                            ">

                                            <div
                                                class="min-w-0">

                                                <p
                                                    class="
                                                        text-sm
                                                        font-medium
                                                        text-white
                                                    ">

                                                    ${escapeHtml(
                                                        request.fileName ||
                                                        "Protected document"
                                                    )}

                                                </p>


                                                <p
                                                    class="
                                                        text-xs
                                                        text-slate-400
                                                        mt-2
                                                    ">

                                                    Requested by:
                                                    ${escapeHtml(
                                                        requester
                                                    )}

                                                </p>


                                                <p
                                                    class="
                                                        text-[11px]
                                                        text-slate-600
                                                        mt-1
                                                    ">

                                                    Requested:
                                                    ${formatTime(
                                                        request.createdAt
                                                    )}

                                                </p>

                                            </div>


                                            <span
                                                class="
                                                    shrink-0
                                                    text-[10px]
                                                    px-2 py-1
                                                    rounded-md
                                                    ${statusClass}
                                                ">

                                                ${escapeHtml(
                                                    status
                                                )}

                                            </span>

                                        </div>


                                        ${
                                            pending

                                                ? `

                                                    <div
                                                        class="
                                                            flex
                                                            gap-2
                                                            mt-5
                                                        ">

                                                        <button
                                                            data-approve-request="${escapeHtml(
                                                                request.id
                                                            )}"
                                                            class="
                                                                flex-1
                                                                px-4 py-2
                                                                rounded-lg
                                                                bg-emerald-600
                                                                hover:bg-emerald-500
                                                                text-sm
                                                                text-white
                                                            ">

                                                            Approve Access

                                                        </button>


                                                        <button
                                                            data-reject-request="${escapeHtml(
                                                                request.id
                                                            )}"
                                                            class="
                                                                flex-1
                                                                px-4 py-2
                                                                rounded-lg
                                                                border
                                                                border-red-500/20
                                                                text-sm
                                                                text-red-400
                                                                hover:bg-red-500/10
                                                            ">

                                                            Reject

                                                        </button>

                                                    </div>

                                                `

                                                : ""

                                        }

                                    </div>

                                `;

                            }
                        )
                        .join("")

                    : emptyState(
                        "No access requests have been submitted yet."
                    )

            }

        `;


    $("refreshRequests")
        ?.addEventListener(
            "click",
            async () => {

                await loadAccessRequests();

                renderAccessRequests();

            }
        );


    document
        .querySelectorAll(
            "[data-approve-request]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        approveAccessRequest(
                            button.dataset
                                .approveRequest
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-reject-request]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        rejectAccessRequest(
                            button.dataset
                                .rejectRequest
                        );

            }
        );

}


// ============================================================
// LOAD ACCESS REQUESTS
// ============================================================

async function loadAccessRequests() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "accessRequests"
            )
        );


    adminRequests =
        snapshot.docs.map(
            docSnap => ({
                id:
                    docSnap.id,

                ...docSnap.data()
            })
        );

}


// ============================================================
// LOG ADMIN DECISION
// ============================================================

async function logAdminEvent(
    action,
    status,
    extra = {}
) {

    const user =
        auth.currentUser;


    if (!user) return;


    await addDoc(
        collection(
            db,
            "securityEvents"
        ),
        {

            userId:
                user.uid,

            email:
                user.email,

            action:
                action,

            status:
                status,

            ...extra,

            timestamp:
                serverTimestamp()

        }
    );

}


// ============================================================
// APPROVE ACCESS REQUEST
// ============================================================

async function approveAccessRequest(
    requestId
) {

    const request =
        adminRequests.find(
            item =>
                item.id ===
                requestId
        );


    if (!request) {

        alert(
            "Access request not found."
        );

        return;

    }


    if (
        request.status !==
        "PENDING"
    ) {

        alert(
            "This request has already been reviewed."
        );

        return;

    }


    const file =
        fileById(
            request.fileId
        );


    if (!file) {

        alert(
            "The requested file no longer exists."
        );

        return;

    }


    const confirmed =
        confirm(
            `Grant ${request.requesterEmail || "this employee"} access to "${request.fileName || file.fileName}"?`
        );


    if (!confirmed) return;


    try {

        const currentAllowed =
            Array.isArray(
                file.allowedUsers
            )
                ? [...file.allowedUsers]
                : [];


        if (
            !currentAllowed.includes(
                request.requesterId
            )
        ) {

            currentAllowed.push(
                request.requesterId
            );

        }


        /*
         * Batch makes these two Firestore
         * updates happen together.
         */

        const batch =
            writeBatch(db);


        batch.update(
            doc(
                db,
                "files",
                file.id
            ),
            {
                allowedUsers:
                    currentAllowed
            }
        );


        batch.update(
            doc(
                db,
                "accessRequests",
                request.id
            ),
            {

                status:
                    "APPROVED",

                reviewedAt:
                    serverTimestamp(),

                reviewedBy:
                    auth.currentUser.uid

            }
        );


        await batch.commit();


        await logAdminEvent(
            "Document access approved",
            "ALLOWED",
            {
                fileId:
                    file.id,

                fileName:
                    file.fileName,

                targetUserId:
                    request.requesterId,

                targetEmail:
                    request.requesterEmail
            }
        );


        /*
         * Update local data immediately.
         */

        file.allowedUsers =
            currentAllowed;


        request.status =
            "APPROVED";


        request.reviewedBy =
            auth.currentUser.uid;


        renderAccessRequests();
        renderFilesPanel();
        renderDashboardStats();


        alert(
            "Access approved successfully."
        );


    } catch (error) {

        console.error(
            "Approval failed:",
            error
        );


        alert(
            error.message ||
            "Could not approve access request."
        );

    }

}


// ============================================================
// REJECT ACCESS REQUEST
// ============================================================

async function rejectAccessRequest(
    requestId
) {

    const request =
        adminRequests.find(
            item =>
                item.id ===
                requestId
        );


    if (!request) {

        alert(
            "Access request not found."
        );

        return;

    }


    if (
        request.status !==
        "PENDING"
    ) {

        alert(
            "This request has already been reviewed."
        );

        return;

    }


    const confirmed =
        confirm(
            `Reject ${request.requesterEmail || "this employee"}'s request for "${request.fileName || "this document"}"?`
        );


    if (!confirmed) return;


    try {

        await updateDoc(
            doc(
                db,
                "accessRequests",
                request.id
            ),
            {

                status:
                    "REJECTED",

                reviewedAt:
                    serverTimestamp(),

                reviewedBy:
                    auth.currentUser.uid

            }
        );


        await logAdminEvent(
            "Document access rejected",
            "ALLOWED",
            {

                fileId:
                    request.fileId,

                fileName:
                    request.fileName,

                targetUserId:
                    request.requesterId,

                targetEmail:
                    request.requesterEmail

            }
        );


        request.status =
            "REJECTED";


        request.reviewedBy =
            auth.currentUser.uid;


        renderAccessRequests();
        renderFilesPanel();


        alert(
            "Access request rejected."
        );


    } catch (error) {

        console.error(
            "Rejection failed:",
            error
        );


        alert(
            error.message ||
            "Could not reject access request."
        );

    }

}


// ============================================================
// SEARCH
// ============================================================

function runSearch(
    term
) {

    term =
        term
            .trim()
            .toLowerCase();


    if (!term) {

        if (
            currentPanel ===
            "Search"
        ) {

            closePanel();

        }

        return;

    }


    setActiveNav("");

    setPanel(
        "Search",
        "Global search"
    );


    const users =
        adminUsers.filter(
            user =>
                (
                    user.email ||
                    ""
                )
                    .toLowerCase()
                    .includes(term)
        );


    const files =
        adminFiles.filter(
            file =>
                [
                    file.fileName,
                    file.email,
                    file.userId
                ]
                    .some(
                        value =>
                            String(
                                value ||
                                ""
                            )
                                .toLowerCase()
                                .includes(term)
                    )
        );


    const events =
        adminEvents.filter(
            event =>
                [
                    event.email,
                    event.action,
                    event.status
                ]
                    .some(
                        value =>
                            String(
                                value ||
                                ""
                            )
                                .toLowerCase()
                                .includes(term)
                    )
        );


    const requests =
        adminRequests.filter(
            request =>
                [
                    request.fileName,
                    request.requesterEmail,
                    request.status
                ]
                    .some(
                        value =>
                            String(
                                value ||
                                ""
                            )
                                .toLowerCase()
                                .includes(term)
                    )
        );


    $("panelContent")
        .innerHTML = `

            <div
                class="space-y-6">

                <div>

                    <p
                        class="
                            text-[10px]
                            uppercase
                            tracking-widest
                            text-slate-600
                            mb-3
                        ">

                        Users
                        (${users.length})

                    </p>


                    ${
                        users.length

                            ? users
                                .map(
                                    user =>
                                        userCard(
                                            user,
                                            String(
                                                user.role ||
                                                "USER"
                                            )
                                            .toUpperCase()
                                        )
                                )
                                .join("")

                            : emptyState(
                                "No users matched."
                            )
                    }

                </div>


                <div>

                    <p
                        class="
                            text-[10px]
                            uppercase
                            tracking-widest
                            text-slate-600
                            mb-3
                        ">

                        Files
                        (${files.length})

                    </p>


                    ${
                        files.length

                            ? files
                                .map(
                                    file => `

                                        <button
                                            data-search-file="${escapeHtml(
                                                file.id
                                            )}"
                                            class="
                                                w-full
                                                text-left
                                                mb-2
                                                rounded-xl
                                                border
                                                border-slate-800
                                                bg-slate-900/40
                                                p-4
                                                hover:bg-slate-800/40
                                            ">

                                            <p
                                                class="
                                                    text-sm
                                                    text-white
                                                ">

                                                ${escapeHtml(
                                                    file.fileName ||
                                                    "Untitled file"
                                                )}

                                            </p>


                                            <p
                                                class="
                                                    text-[11px]
                                                    text-slate-500
                                                    mt-1
                                                ">

                                                ${escapeHtml(
                                                    file.email ||
                                                    userById(
                                                        file.userId
                                                    )?.email ||
                                                    "Unknown"
                                                )}

                                            </p>

                                        </button>

                                    `
                                )
                                .join("")

                            : emptyState(
                                "No files matched."
                            )

                    }

                </div>


                <div>

                    <p
                        class="
                            text-[10px]
                            uppercase
                            tracking-widest
                            text-slate-600
                            mb-3
                        ">

                        Access Requests
                        (${requests.length})

                    </p>


                    ${
                        requests.length

                            ? requests
                                .map(
                                    request => `

                                        <div
                                            class="
                                                mb-2
                                                rounded-xl
                                                border
                                                border-slate-800
                                                bg-slate-900/40
                                                p-4
                                            ">

                                            <p
                                                class="
                                                    text-sm
                                                    text-white
                                                ">

                                                ${escapeHtml(
                                                    request.fileName ||
                                                    "Document"
                                                )}

                                            </p>


                                            <p
                                                class="
                                                    text-[11px]
                                                    text-slate-500
                                                    mt-1
                                                ">

                                                ${escapeHtml(
                                                    request.requesterEmail ||
                                                    "Unknown"
                                                )}

                                                ·

                                                ${escapeHtml(
                                                    request.status ||
                                                    "PENDING"
                                                )}

                                            </p>

                                        </div>

                                    `
                                )
                                .join("")

                            : emptyState(
                                "No access requests matched."
                            )

                    }

                </div>


                <div>

                    <p
                        class="
                            text-[10px]
                            uppercase
                            tracking-widest
                            text-slate-600
                            mb-3
                        ">

                        Security Events
                        (${events.length})

                    </p>


                    ${
                        events.length

                            ? events
                                .slice(
                                    0,
                                    30
                                )
                                .map(
                                    event => `

                                        <div
                                            class="
                                                mb-2
                                                rounded-xl
                                                border
                                                border-slate-800
                                                bg-slate-900/40
                                                p-4
                                            ">

                                            <p
                                                class="
                                                    text-sm
                                                    text-white
                                                ">

                                                ${escapeHtml(
                                                    event.action ||
                                                    "Security event"
                                                )}

                                            </p>


                                            <p
                                                class="
                                                    text-[11px]
                                                    text-slate-500
                                                    mt-1
                                                ">

                                                ${escapeHtml(
                                                    event.email ||
                                                    "Unknown"
                                                )}

                                                ·

                                                ${escapeHtml(
                                                    event.status ||
                                                    ""
                                                )}

                                            </p>

                                        </div>

                                    `
                                )
                                .join("")

                            : emptyState(
                                "No security events matched."
                            )

                    }

                </div>

            </div>

        `;


    document
        .querySelectorAll(
            "[data-search-file]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openSecureFile(
                            fileById(
                                button.dataset
                                    .searchFile
                            )
                        );

            }
        );

}


// ============================================================
// OPEN SECTION
// ============================================================

function openSection(
    type
) {

    closePanel();


    if (
        type ===
        "dashboard"
    ) {

        setActiveNav(
            "nav-dashboard"
        );

        window.scrollTo(
            {
                top: 0,
                behavior:
                    "smooth"
            }
        );

        return;

    }


    const map = {

        profile: [
            "My Profile",
            "Overview",
            renderProfile,
            "nav-profile"
        ],

        alerts: [
            "Security Alerts",
            "Security",
            renderAlerts,
            "nav-alerts"
        ],

        logs: [
            "Activity Logs",
            "Security",
            renderLogs,
            "nav-logs"
        ],

        tests: [
            "Security Tests",
            "Security",
            renderTests,
            "nav-tests"
        ],

        users: [
            "User Management",
            "Management",
            renderUsers,
            "nav-users"
        ],

        files: [
            "Secure Files",
            "Management",
            renderFilesPanel,
            "nav-files"
        ],

        requests: [
            "Access Requests",
            "Management",
            renderAccessRequests,
            "nav-files"
        ]

    };


    const item =
        map[type];


    if (!item) return;


    setActiveNav(
        item[3]
    );


    setPanel(
        item[0],
        item[1]
    );


    setPanelLoading();


    item[2]();

}


// ============================================================
// NAVIGATION
// ============================================================

function bindNavigation() {

    const actions = {

        "nav-dashboard":
            "dashboard",

        "nav-profile":
            "profile",

        "nav-alerts":
            "alerts",

        "nav-logs":
            "logs",

        "nav-tests":
            "tests",

        "nav-users":
            "users",

        "nav-files":
            "files"

    };


    Object.entries(
        actions
    )
    .forEach(
        ([id, type]) => {

            $(id)
                ?.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        openSection(
                            type
                        );

                    }
                );

        }
    );


    $("panelClose")
        ?.addEventListener(
            "click",
            closePanel
        );


    $("panelBackdrop")
        ?.addEventListener(
            "click",
            closePanel
        );


    $("fileModalClose")
        ?.addEventListener(
            "click",
            () =>
                $("fileAccessModal")
                    .classList
                    .add("hidden")
        );


    $("fileModalBackdrop")
        ?.addEventListener(
            "click",
            () =>
                $("fileAccessModal")
                    .classList
                    .add("hidden")
        );


    $("logoutBtn")
        ?.addEventListener(
            "click",
            async () => {

                await signOut(
                    auth
                );

                location.href =
                    "index.html";

            }
        );


    $("bellBtn")
        ?.addEventListener(
            "click",
            () =>
                openSection(
                    "alerts"
                )
        );


    $("themeBtn")
        ?.addEventListener(
            "click",
            () => {

                document.body
                    .classList
                    .toggle(
                        "theme-soft"
                    );


                localStorage.setItem(
                    "cloudshield-theme-soft",
                    document.body.classList.contains(
                        "theme-soft"
                    )
                        ? "1"
                        : "0"
                );

            }
        );


    if (
        localStorage.getItem(
            "cloudshield-theme-soft"
        ) === "1"
    ) {

        document.body
            .classList
            .add(
                "theme-soft"
            );

    }


    let searchTimer;


    $("globalSearch")
        ?.addEventListener(
            "input",
            event => {

                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        () =>
                            runSearch(
                                event.target.value
                            ),
                        180
                    );

            }
        );


    $("globalSearch")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.target.value =
                        "";

                    closePanel();

                    setActiveNav(
                        "nav-dashboard"
                    );

                }

            }
        );

}


// ============================================================
// INIT
// ============================================================

async function init() {

    bindNavigation();


    if (
        window.lucide
    ) {

        lucide.createIcons();

    }


    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                location.href =
                    "index.html";

                return;

            }


            $("userEmail")
                .textContent =
                    user.email ||
                    "";


            try {

                const userSnapshot =
                    await getDoc(
                        doc(
                            db,
                            "users",
                            user.uid
                        )
                    );


                if (
                    !userSnapshot.exists() ||
                    userSnapshot.data().role !==
                        "admin"
                ) {

                    location.href =
                        "employee-dashboard.html";

                    return;

                }


                $("userRole")
                    .textContent =
                        "ADMIN";


                await loadAdminData();

            } catch (error) {

                console.error(
                    "Could not load admin dashboard:",
                    error
                );


                alert(
                    "Could not load CloudShield security data. Check Firestore permissions."
                );

            }

        }
    );

}


// ============================================================
// THEME
// ============================================================

const style =
    document.createElement(
        "style"
    );


style.textContent = `

    .theme-soft {
        filter:
            saturate(.82)
            brightness(1.08);
    }

    .theme-soft main {
        background-color:
            #080e1a;
    }

    .theme-soft header {
        background-color:
            rgba(
                11,
                18,
                32,
                .92
            ) !important;
    }

`;


document.head.appendChild(
    style
);


// ============================================================
// START
// ============================================================

init();