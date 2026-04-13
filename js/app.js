import { db } from './db.js';
window.db = db;

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');

    // Auth Forms
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // Main UI Elements
    const currentUserSpan = document.getElementById('current-user');
    const mainContent = document.getElementById('main-content');
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');

    // Check initial Auth migrated to end of DOMContentLoaded

    function checkAuth() {
        const user = window.db.getCurrentUser();
        if (user) {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            if (currentUserSpan) { currentUserSpan.textContent = user.name; }
            loadView('dashboard');
        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
        }
        updateInstitutionNameDisplays();
    }

    // Toggle Password Visibility
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');
    const iconEyeClosed = document.getElementById('icon-eye-closed');
    const iconEyeOpen = document.getElementById('icon-eye-open');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            if (isPassword) {
                iconEyeClosed.classList.add('hidden');
                iconEyeOpen.classList.remove('hidden');
            } else {
                iconEyeClosed.classList.remove('hidden');
                iconEyeOpen.classList.add('hidden');
            }
        });
    }

    // Login Handle
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        const user = window.db.login(username, password);
        if (user) {
            loginError.classList.add('hidden');
            checkAuth();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos';
            loginError.classList.remove('hidden');
        }
    });

    // Logout Handle
    const handleLogout = () => {
        window.db.logout();
        loginForm.reset();
        checkAuth();
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const mobileLogoutBtn = document.getElementById('logout-btn-mobile');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Sidebar navigation
    document.getElementById('estudiantes-toggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        const submenu = document.getElementById('estudiantes-submenu');
        const arrow = document.getElementById('estudiantes-arrow');
        if (submenu.classList.contains('hidden')) {
            submenu.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            submenu.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
        }
    });

    let viewHistory = [];
    let currentViewObj = null;

    sidebarLinks.forEach(link => {
        if (link.id === 'estudiantes-toggle') return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            const level = e.currentTarget.dataset.level;

            // Remove active from all elements
            document.querySelectorAll('.sidebar-menu a.active, .sidebar-dropdown a.active').forEach(el => el.classList.remove('active'));

            // Highlight current
            e.currentTarget.classList.add('active');

            // Highlight parent if it is a submenu
            if (e.currentTarget.parentElement.id === 'estudiantes-submenu') {
                document.getElementById('estudiantes-toggle').classList.add('active');
            }

            viewHistory = [];
            currentViewObj = null;

            loadView(view, { level });
        });
    });

    // View Routing Map
    const viewsMap = {
        'dashboard': renderDashboard,
        'students': renderStudents,
        'add-student': renderAddStudent,
        'add-course': renderAddCourse,
        'regulations': renderRegulations,
        'reports': renderReports,
        'settings': renderSettings
    };

    function loadView(viewName, params = {}, isBack = false) {
        const titleMap = {
            'dashboard': 'Panel Principal',
            'students': 'Gestión de Estudiantes',
            'add-student': 'Registrar Estudiante',
            'add-course': 'Agregar Curso (Masivo)',
            'student-profile': 'Perfil del Estudiante',
            'regulations': 'Reglamento Interno',
            'reports': 'Informes de Indisciplina',
            'settings': 'Configuración'
        };

        if (currentViewObj && !isBack) {
            if (currentViewObj.viewName !== viewName || JSON.stringify(currentViewObj.params) !== JSON.stringify(params)) {
                viewHistory.push(currentViewObj);
                if (viewHistory.length > 20) viewHistory.shift();
            }
        }
        currentViewObj = { viewName, params };

        document.getElementById('view-title').textContent = titleMap[viewName] || 'Vista';

        if (viewsMap[viewName]) {
            viewsMap[viewName](params);
        } else if (viewName === 'student-profile') {
            renderStudentProfile(params.id);
        }

        if (viewHistory.length > 0) {
            const backHtml = `
            <div class="flex justify-start mt-2 mb-2" style="border-top: 1px solid var(--border); padding-top: 1rem;">
                <button id="global-btn-volver" class="btn btn-gray" style="padding: 0.6rem 2rem; font-size: 1rem; border-radius: 8px;">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle; margin-right:5px; margin-bottom:2px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Volver
                </button>
            </div>
            `;
            const mainContentEl = document.getElementById('main-content');
            mainContentEl.insertAdjacentHTML('beforeend', backHtml);
            document.getElementById('global-btn-volver').addEventListener('click', (e) => {
                e.preventDefault();
                const prev = viewHistory.pop();
                currentViewObj = prev;
                loadView(prev.viewName, prev.params, true);
            });
        }
    }

    // --- HELPERS ---
    function getStudentDisplayName(s) {
        if (s.lastName && s.firstName) return `${s.lastName} - ${s.firstName}`;
        return s.fullName || 'Desconocido';
    }

    function sortStudentsByLastName(studentsArray) {
        return studentsArray.sort((a, b) => {
            const nameA = a.lastName ? a.lastName : (a.fullName || '');
            const nameB = b.lastName ? b.lastName : (b.fullName || '');
            return nameA.localeCompare(nameB);
        });
    }

    // --- VIEWS ---
    function renderDashboard(params = {}) {
        const selectedLevel = params.level || 'Secundario';
        const allStudents = window.db.getStudents();
        const allIncidents = window.db.getIncidents();

        const students = allStudents.filter(s => (s.level === selectedLevel) || (!s.level && selectedLevel === 'Secundario'));
        const incidents = allIncidents.filter(inc => {
            const student = window.db.getStudentById(inc.studentId);
            if (!student) return false;
            return (student.level === selectedLevel) || (!student.level && selectedLevel === 'Secundario');
        });

        // Group students by course and parallel
        const coursesMap = {};
        students.forEach(s => {
            const courseName = `${s.course} "${s.parallel}"`;
            if (!coursesMap[courseName]) coursesMap[courseName] = [];
            coursesMap[courseName].push(s);
        });

        const sortedCourses = Object.keys(coursesMap).sort();

        let html = `
            <div class="tabs-container mb-2">
                <div class="tabs" style="border-bottom: 2px solid var(--border);">
                    <button class="tab dashboard-tab ${selectedLevel === 'Primario' ? 'active' : ''}" data-level="Primario">Nivel Primario</button>
                    <button class="tab dashboard-tab ${selectedLevel === 'Secundario' ? 'active' : ''}" data-level="Secundario">Nivel Secundario</button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Estudiantes</h3>
                    <p class="stat-num">${students.length}</p>
                </div>
                <div class="stat-card">
                    <h3>Faltas Registradas</h3>
                    <p class="stat-num">${incidents.length}</p>
                </div>
            </div>
            
            <h3 class="mb-1 mt-2">Seguimiento por Cursos - Nivel ${selectedLevel}</h3>
        `;

        if (sortedCourses.length === 0) {
            html += `<div class="card text-center text-muted p-2">No hay estudiantes ni cursos registrados aún.</div>`;
        }

        sortedCourses.forEach((course, index) => {
            const courseId = `course-container-${index}`;
            html += `
            <div class="card mb-2">
                <div class="flex justify-between items-center course-toggle-header" data-target="${courseId}" style="cursor: pointer; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; transition: opacity 0.2s;">
                    <h3 style="color: var(--primary); margin: 0;">
                        ${course}
                    </h3>
                    <button class="btn btn-sm btn-outline-info toggle-btn" style="padding: 0.2rem 0.6rem; font-weight: bold; border-width: 2px;">Mostrar lista</button>
                </div>
                <div id="${courseId}" class="hidden" style="overflow-x: auto; margin-top: 1rem;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 30%">Estudiante</th>
                                <th style="width: 45%">Actividad Reciente</th>
                                <th style="width: 25%">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const courseStudents = sortStudentsByLastName(coursesMap[course]);

            courseStudents.forEach(student => {
                // Get latest incident for this student
                const studentIncidents = window.db.getIncidentsByStudent(student.id);
                let recentActivityHtml = '<span class="text-sm text-gray">Sin actividad reciente</span>';

                if (studentIncidents.length > 0) {
                    const latestInc = studentIncidents[studentIncidents.length - 1]; // Already sorted old->new technically, but wait
                    // Wait, getIncidentsByStudent doesn't guarantee reverse per se in db.js returning, let's just grab the last element of array filter

                    let displayDate = latestInc.date || latestInc.createdAt;
                    if (displayDate && displayDate.length === 10) displayDate += 'T12:00:00';
                    const dateStr = new Date(displayDate).toLocaleDateString();

                    recentActivityHtml = `
                        <div style="font-size: 0.85rem;">
                            <strong>${dateStr}</strong> - 
                            <span class="badge badge-${getIncidentBadgeColor(latestInc.type)}" style="padding: 0.1rem 0.4rem; font-size: 0.7rem;">${latestInc.type}</span><br>
                            <span class="text-muted" style="display:inline-block; margin-top:2px;">${latestInc.description ? latestInc.description.substring(0, 45) + '...' : 'S/D'}</span>
                        </div>
                    `;
                }

                html += `
                            <tr>
                                <td class="font-bold">${getStudentDisplayName(student)}</td>
                                <td>${recentActivityHtml}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary btn-quick-add-incident mr-1" style="padding: 0.4rem 0.6rem;" data-id="${student.id}">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                        Agregar registro
                                    </button>
                                    <button class="btn btn-sm btn-info btn-view-profile" style="padding: 0.4rem 0.6rem;" data-id="${student.id}">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        Ver Perfil
                                    </button>
                                </td>
                            </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            </div>
            `;
        });

        mainContent.innerHTML = html;

        // Dashboard Tab Change Events
        document.querySelectorAll('.dashboard-tab').forEach(t => {
            t.addEventListener('click', (e) => {
                renderDashboard({ level: e.currentTarget.dataset.level });
            });
        });

        // Course Accordion Toggles
        document.querySelectorAll('.course-toggle-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                const container = document.getElementById(targetId);
                const btn = e.currentTarget.querySelector('.toggle-btn');

                if (container.classList.contains('hidden')) {
                    container.classList.remove('hidden');
                    btn.innerHTML = 'Ocultar lista';
                    btn.classList.add('btn-info');
                    btn.classList.remove('btn-outline-info');
                } else {
                    container.classList.add('hidden');
                    btn.innerHTML = 'Mostrar lista';
                    btn.classList.remove('btn-info');
                    btn.classList.add('btn-outline-info');
                }
            });
        });

        // Re-bind profile buttons
        document.querySelectorAll('.btn-view-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                loadView('student-profile', { id });
            });
        });

        // Bind quick add incident buttons
        document.querySelectorAll('.btn-quick-add-incident').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                renderAddIncident(id);
            });
        });
    }

    function renderStudents(params = {}) {
        const level = params.level || 'Secundario'; // Fallback for backwards compatibility
        let students = window.db.getStudents();

        // Filter by the selected level
        students = students.filter(s => (s.level === level) || (!s.level && level === 'Secundario'));

        let html = `
            <div class="actions-bar">
                <input type="text" id="search-student" class="input flex-1" placeholder="Buscar por nombre...">
                <button id="btn-add-student" class="btn btn-secondary" data-level="${level}">
                   <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                   Nuevo Estudiante
                </button>
                <button id="btn-add-course" class="btn btn-primary ml-1" data-level="${level}">
                   <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   Agregar Curso
                </button>
            </div>
            <div class="card">
                <h3 class="mb-1" style="color: var(--primary);">Estudiantes - Nivel ${level}</h3>
                <div style="overflow-x: auto;">
                    <table class="table" id="students-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Curso / Paralelo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (students.length === 0) {
            html += `<tr><td colspan="4" class="text-center text-muted">No hay estudiantes registrados en el nivel ${level}</td></tr>`;
        }

        students = sortStudentsByLastName(students);
        students.forEach(s => {
            html += `
                <tr data-name="${(s.lastName ? s.lastName + ' ' + s.firstName : (s.fullName || '')).toLowerCase()}">
                    <td class="font-bold">${getStudentDisplayName(s)}</td>
                    <td>${s.course} - "${s.parallel}"</td>
                    <td>
                        <button class="btn btn-sm btn-secondary btn-quick-add-incident mr-1" data-id="${s.id}">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Agregar registro
                        </button>
                        <button class="btn btn-sm btn-info btn-view-profile" data-id="${s.id}">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            Ver Perfil
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div></div>`;
        mainContent.innerHTML = html;

        // Events
        document.getElementById('btn-add-student').addEventListener('click', (e) => {
            const level = e.currentTarget.dataset.level;
            loadView('add-student', { level });
        });

        document.getElementById('btn-add-course').addEventListener('click', (e) => {
            const level = e.currentTarget.dataset.level;
            loadView('add-course', { level });
        });

        document.querySelectorAll('.btn-view-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id || e.target.closest('button').dataset.id);
                loadView('student-profile', { id });
            });
        });

        document.querySelectorAll('.btn-quick-add-incident').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                renderAddIncident(id);
            });
        });

        const searchInput = document.getElementById('search-student');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#students-table tbody tr');
            rows.forEach(row => {
                if (!row.dataset.name) return;
                if (row.dataset.name.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    function renderAddStudent(params = {}) {
        const level = params.level || 'Secundario';

        mainContent.innerHTML = `
            <div class="card max-w-2xl mx-auto">
                <form id="form-student">
                    <input type="hidden" name="level" value="${level}">
                    <div class="grid grid-2">
                        <div class="form-group" style="grid-column: span 2;">
                            <label>Apellidos y Nombres</label>
                            <input type="text" name="fullName" class="input" required>
                        </div>
                    </div>
                    
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Curso</label>
                            <select name="course" class="input" required>
                                <option value="" disabled selected>Seleccione un curso</option>
                                <option value="1ro">1ro</option>
                                <option value="2do">2do</option>
                                <option value="3ro">3ro</option>
                                <option value="4to">4to</option>
                                <option value="5to">5to</option>
                                <option value="6to">6to</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paralelo</label>
                            <select name="parallel" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                                <option value="F">F</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Dirección Actual</label>
                        <input type="text" name="address" class="input">
                    </div>
                    
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Nombre de la Madre, Padre o Tutor</label>
                            <input type="text" name="guardianName" class="input">
                        </div>
                        <div class="form-group">
                            <label>Teléfono de Contacto</label>
                            <input type="text" name="phone" class="input">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Observaciones (Opcional)</label>
                        <textarea name="observations" class="input" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end mt-2">
                        <button type="button" class="btn btn-gray mr-1" id="btn-cancel-student">Cancelar</button>
                        <button type="submit" class="btn btn-secondary">Registrar Estudiante</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('btn-cancel-student').addEventListener('click', () => {
            loadView('students', { level });
        });

        document.getElementById('form-student').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const studentData = Object.fromEntries(fd.entries());

            if (!studentData.address) studentData.address = '-';
            if (!studentData.guardianName) studentData.guardianName = '-';
            if (!studentData.phone) studentData.phone = '-';
            if (!studentData.observations) studentData.observations = '-';

            window.db.addStudent(studentData);
            Swal.fire('Éxito', `Estudiante registrado correctamente en el nivel ${level}`, 'success').then(() => {
                loadView('students', { level });
            });
        });
    }

    function renderAddCourse(params = {}) {
        const level = params.level || 'Secundario';

        mainContent.innerHTML = `
            <div class="card mx-auto" style="max-width: 95%;">
                <form id="form-course">
                    <input type="hidden" name="level" value="${level}">
                    
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Curso</label>
                            <select name="course" class="input" required>
                                <option value="" disabled selected>Seleccione un curso</option>
                                <option value="1ro">1ro</option>
                                <option value="2do">2do</option>
                                <option value="3ro">3ro</option>
                                <option value="4to">4to</option>
                                <option value="5to">5to</option>
                                <option value="6to">6to</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paralelo</label>
                            <select name="parallel" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                                <option value="F">F</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-3">
                        <div class="form-group">
                            <label>Lista de Estudiantes</label>
                            <textarea name="studentsList" class="input" rows="20" placeholder="Ejemplo:
Juan Perez
Maria Garcia" required></textarea>
                            <p class="text-xs text-muted mt-1">Requerido (Copiar y pegar por columna)</p>
                        </div>
                        <div class="form-group">
                            <label>Padres/Madres o Tutor</label>
                            <textarea name="guardianList" class="input" rows="20" placeholder="Ejemplo:
Pedro Perez
Ana Garcia"></textarea>
                            <p class="text-xs text-muted mt-1">Opcional (Debe coincidir en fila con los estudiantes)</p>
                        </div>
                        <div class="form-group">
                            <label>Teléfonos de Contacto</label>
                            <textarea name="phoneList" class="input" rows="20" placeholder="Ejemplo:
77712345
66554433"></textarea>
                            <p class="text-xs text-muted mt-1">Opcional (Debe coincidir en fila con los estudiantes)</p>
                        </div>
                    </div>
                    
                    <div class="flex justify-end mt-2">
                        <button type="button" class="btn btn-gray mr-1" id="btn-cancel-course">Cancelar</button>
                        <button type="submit" class="btn btn-secondary">Registrar Lista</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('btn-cancel-course').addEventListener('click', () => {
            loadView('students', { level });
        });

        document.getElementById('form-course').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const course = fd.get('course');
            const parallel = fd.get('parallel');

            const studentsStr = fd.get('studentsList') || '';
            const guardianStr = fd.get('guardianList') || '';
            const phoneStr = fd.get('phoneList') || '';

            const studentLines = studentsStr.split(/\r?\n/);
            const guardianLines = guardianStr ? guardianStr.split(/\r?\n/) : [];
            const phoneLines = phoneStr ? phoneStr.split(/\r?\n/) : [];

            let count = 0;
            studentLines.forEach((line, index) => {
                const name = line.trim();
                if (name) {
                    const guardian = guardianLines[index] && guardianLines[index].trim() !== '' ? guardianLines[index].trim() : '-';
                    const phone = phoneLines[index] && phoneLines[index].trim() !== '' ? phoneLines[index].trim() : '-';

                    window.db.addStudent({
                        level: level,
                        fullName: name,
                        course: course,
                        parallel: parallel,
                        address: '-',
                        guardianName: guardian,
                        phone: phone,
                        observations: '-'
                    });
                    count++;
                }
            });

            Swal.fire('Éxito', `Se registraron ${count} estudiantes correctamente en ${course} "${parallel}"`, 'success').then(() => {
                loadView('students', { level });
            });
        });
    }

    function renderStudentProfile(studentId) {
        const student = window.db.getStudentById(studentId);
        if (!student) return loadView('students');

        const incidents = window.db.getIncidentsByStudent(studentId).reverse();
        const documentsList = window.db.getDocumentsByStudent(studentId).reverse();

        let html = `
            <div class="profile-header card">
                <div class="flex justify-between items-start">
                    <div>
                        <h2>${getStudentDisplayName(student)}</h2>
                        <p class="text-muted">${student.course} - Paralelo "${student.parallel}"</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-warning mr-1" id="btn-edit-student" data-id="${student.id}">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Editar Estudiante
                        </button>
                        <button class="btn btn-sm btn-gray text-sm" onclick="app.loadView('students')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Volver
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-3 mt-2 profile-info">
                    <div>
                        <span class="label">Tutor/Apoderado:</span>
                        <p>${student.guardianName || '-'}</p>
                    </div>
                    <div>
                        <span class="label">Teléfono:</span>
                        <p>${student.phone || '-'}</p>
                    </div>
                    <div>
                        <span class="label">Dirección:</span>
                        <p>${student.address || '-'}</p>
                    </div>
                </div>
                <div class="mt-1"><span class="label">Observaciones:</span><p>${student.observations || '-'}</p></div>
            </div>

            <div class="tabs-container mt-2">
                <div class="tabs-enhanced">
                    <button class="tab-card active tab" data-target="tab-incidents">
                        <div class="tab-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <div class="tab-content-text">
                            <span class="tab-title">Historial de Faltas</span>
                            <span class="tab-desc">Ver y gestionar las incidencias y faltas</span>
                        </div>
                    </button>
                    <button class="tab-card tab" data-target="tab-documents">
                        <div class="tab-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        </div>
                        <div class="tab-content-text">
                            <span class="tab-title">Documentos / Citaciones</span>
                            <span class="tab-desc">Historial de actas de compromiso y citaciones</span>
                        </div>
                    </button>
                </div>
                
                <!-- Tab Incidents -->
                <div id="tab-incidents" class="tab-content active">
                    <div class="flex justify-between items-center mb-1">
                        <h3>Registros Disciplinarios</h3>
                        <button class="btn btn-sm btn-secondary" id="btn-add-incident" data-id="${student.id}">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            Nuevo Registro
                        </button>
                    </div>
                    <div class="card">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Descripción</th>
                                    <th>Sanción Aplicada</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (incidents.length === 0) {
            html += `<tr><td colspan="5" class="text-center text-muted">No existen registros</td></tr>`;
        } else {
            incidents.forEach(inc => {
                let displayDate = inc.date || inc.createdAt;
                if (displayDate && displayDate.length === 10) displayDate += 'T12:00:00';
                html += `
                    <tr>
                        <td>${new Date(displayDate).toLocaleDateString()}</td>
                        <td><span class="badge badge-${getIncidentBadgeColor(inc.type)}">${inc.type}</span></td>
                        <td>${inc.description || 'N/A'}</td>
                        <td>${inc.sanction || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning btn-edit-incident mr-1" data-id="${inc.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5 14.5z"></path></svg>
                                Editar
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete-incident" data-id="${inc.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tab Documents -->
                <div id="tab-documents" class="tab-content hidden">
                    <h3 class="mb-1">Historial de Documentos</h3>
                    
                    <div class="document-actions-grid mt-1 mb-2">
                        <button class="action-card" id="btn-add-acta" data-id="${student.id}">
                            <div class="action-icon bg-secondary-light text-secondary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                            <div class="action-text">
                                <h4>Emitir Acta Compromiso</h4>
                                <p>Generar un nuevo compromiso disciplinario</p>
                            </div>
                        </button>
                        
                        <button class="action-card" id="btn-add-citation" data-id="${student.id}">
                            <div class="action-icon bg-warning-light text-warning">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <div class="action-text">
                                <h4>Emitir Citación</h4>
                                <p>Convocar a los padres o tutores</p>
                            </div>
                        </button>
                    </div>
                    <div class="card">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Fecha Generación</th>
                                    <th>Tipo Doc.</th>
                                    <th>Motivo / Contenido</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (documentsList.length === 0) {
            html += `<tr><td colspan="4" class="text-center text-muted">No existen documentos generados</td></tr>`;
        } else {
            documentsList.forEach(doc => {
                html += `
                    <tr>
                        <td>${new Date(doc.createdAt).toLocaleDateString()}</td>
                        <td><strong>${doc.type}</strong></td>
                        <td>${doc.content.substring(0, 60)}...</td>
                        <td>
                            <button class="btn btn-sm btn-purple btn-print-doc mr-1" data-id="${doc.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                Imprimir / Ver
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete-doc" data-id="${doc.id}">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        mainContent.innerHTML = html;

        // Tabs Logic
        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                e.currentTarget.classList.add('active');
                document.getElementById(e.currentTarget.dataset.target).classList.remove('hidden');
            });
        });

        // Edit Student Profile
        document.getElementById('btn-edit-student').addEventListener('click', (e) => {
            renderEditStudent(studentId);
        });

        // Add Incident Event
        document.getElementById('btn-add-incident').addEventListener('click', (e) => {
            renderAddIncident(studentId);
        });

        // Edit Incident Events
        document.querySelectorAll('.btn-edit-incident').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const incId = parseInt(e.currentTarget.dataset.id);
                renderEditIncident(incId, studentId);
            });
        });

        // Delete Incident Events
        document.querySelectorAll('.btn-delete-incident').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const incId = parseInt(e.currentTarget.dataset.id);
                Swal.fire({
                    title: '¿Está seguro de que desea eliminar este registro?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.db.deleteIncident(incId);
                        renderStudentProfile(studentId);
                    }
                });
            });
        });

        // Document Events
        document.getElementById('btn-add-acta').addEventListener('click', () => {
            renderAddDocumentForm(studentId, 'Acta de Compromiso');
        });
        document.getElementById('btn-add-citation').addEventListener('click', () => {
            renderAddDocumentForm(studentId, 'Citación');
        });

        // Print Document
        document.querySelectorAll('.btn-print-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = parseInt(e.currentTarget.dataset.id);
                printDocument(docId);
            });
        });

        // Delete Document Event
        document.querySelectorAll('.btn-delete-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = parseInt(e.currentTarget.dataset.id);
                Swal.fire({
                    title: '¿Está seguro de que desea eliminar este documento?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.db.deleteDocument(docId);
                        renderStudentProfile(studentId);
                    }
                });
            });
        });
    }

    // --- SETTINGS VIEW ---
    function renderSettings() {
        const currentName = window.db.getSetting('institutionName', 'PLENA "LA FLORESTA"');

        mainContent.innerHTML = `
            <div class="card max-w-2xl mx-auto mt-2">
                <h3 class="mb-1" style="color: var(--primary);">Configuración del Sistema</h3>
                <p class="text-sm text-muted mb-2">Administre las preferencias y datos generales de la institución.</p>

                <form id="form-settings">
                    <div class="form-group">
                        <label>Nombre de la Unidad Educativa</label>
                        <input type="text" name="institutionName" class="input" value="${currentName.replace(/"/g, '&quot;')}" required>
                    </div>

                    <div class="flex justify-end mt-2">
                        <button type="submit" class="btn btn-secondary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('form-settings').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const instName = fd.get('institutionName');
            window.db.saveSetting('institutionName', instName);
            Swal.fire('Éxito', 'Configuración guardada correctamente. El nombre de la institución ha sido actualizado.', 'success');
            updateInstitutionNameDisplays();
        });
    }

    function updateInstitutionNameDisplays() {
        const instName = window.db.getSetting('institutionName', 'PLENA "LA FLORESTA"');
        const elements = document.querySelectorAll('.institution-name-display');
        elements.forEach(el => {
            el.textContent = instName;
        });
    }

    // Modal / Forms Overlay Helpers
    function renderAddIncident(studentId) {
        const student = window.db.getStudentById(studentId);

        const modalHtml = `
            <div class="modal-overlay" id="modal-incident">
                <div class="modal card">
                    <h3>Registrar Falta / Observación</h2>
                    <p class="text-sm text-muted mb-1">Estudiante: ${getStudentDisplayName(student)}</p>
                    
                    <form id="form-incident">
                        <div class="form-group">
                            <label>Tipo de Registro</label>
                            <select name="type" id="incident-type-select" class="input" required>
                                <option value="" disabled selected>Seleccione un tipo</option>
                                <option value="Falta Leve">Falta Leve</option>
                                <option value="Falta Grave">Falta Grave</option>
                                <option value="Falta Muy Grave">Falta Muy Grave</option>
                                <option value="Otro">Otro (Especificar)</option>
                            </select>
                        </div>
                        <div class="form-group hidden" id="incident-other-type-group">
                            <label>Especificar Tipo de Registro</label>
                            <input type="text" name="otherType" id="incident-other-type-input" class="input">
                        </div>
                        <div class="form-group">
                            <label>Fecha de la Falta</label>
                            <input type="date" name="date" class="input" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label>Descripción / Motivo</label>
                            <textarea name="description" class="input" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Sanción Aplicada (Si aplica)</label>
                            <input type="text" name="sanction" class="input">
                        </div>
                        
                        <div class="flex justify-end mt-2 gap-1">
                            <button type="button" class="btn btn-gray modal-close">Cancelar</button>
                            <button type="submit" class="btn btn-secondary">Guardar Registro</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('modal-incident');

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

        const typeSelect = document.getElementById('incident-type-select');
        const otherTypeGroup = document.getElementById('incident-other-type-group');
        const otherTypeInput = document.getElementById('incident-other-type-input');

        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Otro') {
                otherTypeGroup.classList.remove('hidden');
                otherTypeInput.required = true;
            } else {
                otherTypeGroup.classList.add('hidden');
                otherTypeInput.required = false;
                otherTypeInput.value = '';
            }
        });

        document.getElementById('form-incident').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd.entries());

            if (data.type === 'Otro') {
                data.type = data.otherType;
            }
            delete data.otherType;

            data.studentId = studentId;
            data.teacherId = window.db.getCurrentUser().id;

            window.db.addIncident(data);
            modal.remove();
            Swal.fire('Registrado', 'Incidencia guardada con éxito', 'success');
            renderStudentProfile(studentId); // Reload
        });
    }

    function renderEditStudent(studentId) {
        const student = window.db.getStudentById(studentId);
        if (!student) return;

        const modalHtml = `
            <div class="modal-overlay" id="modal-student-edit">
                <div class="modal card max-w-2xl">
                    <h3>Editar Información Personal</h2>
                    
                    <form id="form-student-edit">
                        <input type="hidden" name="level" value="${student.level || 'Secundario'}">
                        <div class="grid grid-2">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Apellidos y Nombres</label>
                                <input type="text" name="fullName" class="input" required value="${student.fullName || (student.lastName ? student.lastName + ' ' + (student.firstName || '') : '')}">
                                <input type="hidden" name="lastName" value="">
                                <input type="hidden" name="firstName" value="">
                            </div>
                        </div>
                        
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>Curso</label>
                                <select name="course" class="input" required>
                                    <option value="1ro" ${student.course === '1ro' ? 'selected' : ''}>1ro</option>
                                    <option value="2do" ${student.course === '2do' ? 'selected' : ''}>2do</option>
                                    <option value="3ro" ${student.course === '3ro' ? 'selected' : ''}>3ro</option>
                                    <option value="4to" ${student.course === '4to' ? 'selected' : ''}>4to</option>
                                    <option value="5to" ${student.course === '5to' ? 'selected' : ''}>5to</option>
                                    <option value="6to" ${student.course === '6to' ? 'selected' : ''}>6to</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Paralelo</label>
                                <select name="parallel" class="input" required>
                                    <option value="A" ${student.parallel === 'A' ? 'selected' : ''}>A</option>
                                    <option value="B" ${student.parallel === 'B' ? 'selected' : ''}>B</option>
                                    <option value="C" ${student.parallel === 'C' ? 'selected' : ''}>C</option>
                                    <option value="D" ${student.parallel === 'D' ? 'selected' : ''}>D</option>
                                    <option value="E" ${student.parallel === 'E' ? 'selected' : ''}>E</option>
                                    <option value="F" ${student.parallel === 'F' ? 'selected' : ''}>F</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Dirección Actual</label>
                            <input type="text" name="address" class="input" value="${!student.address || student.address === '-' ? '-' : student.address}">
                        </div>
                        
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>Nombre de la Madre, Padre o Tutor</label>
                                <input type="text" name="guardianName" class="input" value="${!student.guardianName || student.guardianName === '-' ? '-' : student.guardianName}">
                            </div>
                            <div class="form-group">
                                <label>Teléfono de Contacto</label>
                                <input type="text" name="phone" class="input" value="${!student.phone || student.phone === '-' ? '-' : student.phone}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Observaciones (Opcional)</label>
                            <textarea name="observations" class="input" rows="3">${!student.observations || student.observations === '-' ? '-' : student.observations}</textarea>
                        </div>
                        
                        <div class="flex justify-end mt-2 gap-1">
                            <button type="button" class="btn btn-gray modal-close">Cancelar</button>
                            <button type="submit" class="btn btn-warning">Actualizar Estudiante</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('modal-student-edit');
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

        document.getElementById('form-student-edit').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd.entries());

            if (!data.address) data.address = '-';
            if (!data.guardianName) data.guardianName = '-';
            if (!data.phone) data.phone = '-';
            if (!data.observations) data.observations = '-';

            window.db.updateStudent(studentId, data);
            modal.remove();
            Swal.fire('Actualizado', 'Información del estudiante actualizada', 'success');
            renderStudentProfile(studentId); // Reload the current student profile view
        });
    }

    function renderEditIncident(incidentId, studentId) {
        const student = window.db.getStudentById(studentId);
        const incident = window.db.getIncidentById(incidentId);
        if (!incident) return;

        let dateVal = incident.date;
        if (!dateVal && incident.createdAt) {
            dateVal = new Date(incident.createdAt).toISOString().split('T')[0];
        } else if (!dateVal) {
            dateVal = new Date().toISOString().split('T')[0];
        }

        const standardTypes = ['Falta Leve', 'Falta Grave', 'Falta Muy Grave'];
        const isStandard = standardTypes.includes(incident.type);
        const typeSelectValue = isStandard ? incident.type : 'Otro';
        const otherTypeValue = isStandard ? '' : incident.type;

        const modalHtml = `
            <div class="modal-overlay" id="modal-incident-edit">
                <div class="modal card">
                    <h3>Editar Registro Disciplinario</h2>
                    <p class="text-sm text-muted mb-1">Estudiante: ${getStudentDisplayName(student)}</p>
                    
                    <form id="form-incident-edit">
                        <div class="form-group">
                            <label>Tipo de Registro</label>
                            <select name="type" id="incident-type-select-edit" class="input" required>
                                <option value="Falta Leve" ${typeSelectValue === 'Falta Leve' ? 'selected' : ''}>Falta Leve</option>
                                <option value="Falta Grave" ${typeSelectValue === 'Falta Grave' ? 'selected' : ''}>Falta Grave</option>
                                <option value="Falta Muy Grave" ${typeSelectValue === 'Falta Muy Grave' ? 'selected' : ''}>Falta Muy Grave</option>
                                <option value="Otro" ${typeSelectValue === 'Otro' ? 'selected' : ''}>Otro (Especificar)</option>
                            </select>
                        </div>
                        <div class="form-group ${typeSelectValue === 'Otro' ? '' : 'hidden'}" id="incident-other-type-group-edit">
                            <label>Especificar Tipo de Registro</label>
                            <input type="text" name="otherType" id="incident-other-type-input-edit" class="input" value="${otherTypeValue}" ${typeSelectValue === 'Otro' ? 'required' : ''}>
                        </div>
                        <div class="form-group">
                            <label>Fecha de la Falta</label>
                            <input type="date" name="date" class="input" required value="${dateVal}">
                        </div>
                        <div class="form-group">
                            <label>Descripción / Motivo</label>
                            <textarea name="description" class="input" rows="3" required>${incident.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Sanción Aplicada (Si aplica)</label>
                            <input type="text" name="sanction" class="input" value="${incident.sanction || ''}">
                        </div>
                        
                        <div class="flex justify-end mt-2 gap-1">
                            <button type="button" class="btn btn-gray modal-close">Cancelar</button>
                            <button type="submit" class="btn btn-warning">Actualizar Registro</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('modal-incident-edit');

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

        const typeSelectEdit = document.getElementById('incident-type-select-edit');
        const otherTypeGroupEdit = document.getElementById('incident-other-type-group-edit');
        const otherTypeInputEdit = document.getElementById('incident-other-type-input-edit');

        typeSelectEdit.addEventListener('change', (e) => {
            if (e.target.value === 'Otro') {
                otherTypeGroupEdit.classList.remove('hidden');
                otherTypeInputEdit.required = true;
            } else {
                otherTypeGroupEdit.classList.add('hidden');
                otherTypeInputEdit.required = false;
                otherTypeInputEdit.value = '';
            }
        });

        document.getElementById('form-incident-edit').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd.entries());

            if (data.type === 'Otro') {
                data.type = data.otherType;
            }
            delete data.otherType;

            window.db.updateIncident(incidentId, data);
            modal.remove();
            Swal.fire('Actualizado', 'Registro actualizado con éxito', 'success');
            renderStudentProfile(studentId); // Reload
        });
    }

    function renderAddDocumentForm(studentId, docType) {
        const student = window.db.getStudentById(studentId);

        const studentName = getStudentDisplayName(student);
        let templateContent = "";
        const instName = window.db.getSetting('institutionName', 'PLENA "LA FLORESTA"');
        if (docType === 'Acta de Compromiso') {
            templateContent = `<p>Por medio de la presente, yo: <strong>${student.guardianName}</strong>, en calidad de padre, madre o representante legal del/la estudiante <strong>${studentName}</strong>, del curso <strong>${student.course} "${student.parallel}"</strong>, manifiesto lo siguiente:</p><p>Consciente de que la educación integral de mi representado/a es el resultado del trabajo conjunto entre la familia y la institución educativa, me comprometo a cumplir y hacer cumplir el Reglamento Interno de la Unidad Educatica ${instName}, asumiendo las siguientes responsabilidades:</p><ul><li>Garantizar la asistencia puntual y regular de mi representado/a a la institución educativa.</li><li>Apoyar en la organización de su tiempo de estudio en el hogar, así como proporcionarle los materiales necesarios para su formación académica.</li><li>Velar por el comportamiento adecuado de mi representado/a dentro y fuera de la institución, evitando su participación activa o pasiva en acciones que atenten contra la dignidad, integridad física o psicológica de cualquier miembro de la comunidad educativa.</li><li>Asistir de manera oportuna a todas las convocatorias realizadas por la institución.</li><li>Prevenir que mi representado/a incurra en faltas disciplinarias establecidas en la normativa vigente.</li></ul><p></p><p>Asimismo, declaro que acataré las medidas disciplinarias que correspondan en caso de incumplimiento, conforme al reglamento institucional, siendo la falta cometida y la sanción aplicada la siguiente:</p><p></p><p><strong>Motivo y sanción específica:</strong></p><p>............................................................................................................................................................................</p><p></p><p>En señal de conformidad, firmo la presente acta, comprometiéndome a cumplir y hacer cumplir todos los puntos anteriormente señalados.</p><br>`;
        } else {
            templateContent = `<p>Mediante la presente, se cita en calidad de <strong>URGENTE</strong> al representante (Sr/Sra. <strong>${student.guardianName}</strong>) del estudiante <strong>${studentName}</strong> del curso <strong>${student.course} "${student.parallel}"</strong>, a comparecer en las instalaciones de la ${instName} el día <strong>[FECHA Y HORA DE CITA]</strong>.</p><p><br></p><p><strong>Motivo:</strong> [ESPECIFICAR MOTIVO DE LA CITACIÓN].</p>`;
        }

        const modalHtml = `
            <div class="modal-overlay" id="modal-doc">
                <div class="modal modal-lg card" style="display: flex; flex-direction: column;">
                    <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">Generar ${docType}</h3>
                        <button type="button" class="btn btn-sm btn-outline btn-reset-doc" title="Restaurar contenido original" style="display: flex; align-items: center; gap: 0.25rem;">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Actualizar
                        </button>
                    </div>
                    <form id="form-doc" style="display: flex; flex-direction: column; flex: 1;">
                        <div class="form-group mt-1" style="flex: 1; display: flex; flex-direction: column;">
                            <label>Contenido del Documento</label>
                            <div id="quill-editor-container" style="flex: 1; min-height: 250px; background: #fff; color: #000; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;">${templateContent}</div>
                            <small class="text-muted mt-1">Puede editar el texto autogenerado con formato libre antes de guardar y generar el documento.</small>
                        </div>
                        
                        <div class="flex justify-end mt-2 gap-1">
                            <button type="button" class="btn btn-gray modal-close">Cancelar</button>
                            <button type="submit" class="btn btn-secondary">Generar y Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('modal-doc');

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

        // Initialize Quill Editor
        const quill = new Quill('#quill-editor-container', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // FOCUS BUG FIX: Ensure the browser parent hasn't lost focus after window.print()
        window.focus();

        // FOCUS BUG FIX: Explicitly remove any stuck SweetAlert classes that block interaction
        document.body.classList.remove('swal2-shown', 'swal2-height-auto');
        document.querySelectorAll('.swal2-container').forEach(el => el.remove());
        document.querySelectorAll('[aria-hidden="true"]').forEach(el => el.removeAttribute('aria-hidden'));

        // FOCUS BUG FIX: Force Quill to render the cursor
        setTimeout(() => {
            quill.focus();
        }, 100);

        // Add event listener for the update button
        modal.querySelector('.btn-reset-doc').addEventListener('click', () => {
            quill.clipboard.dangerouslyPasteHTML(templateContent);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Contenido actualizado',
                showConfirmButton: false,
                timer: 1500
            });
        });

        document.getElementById('form-doc').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                studentId: studentId,
                teacherId: window.db.getCurrentUser().id,
                type: docType,
                content: quill.root.innerHTML
            };

            const newDoc = window.db.addDocument(data);
            modal.remove();

            Swal.fire({
                title: 'Generado',
                text: `${docType} creado con éxito`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Imprimir',
                cancelButtonText: 'Cerrar',
                reverseButtons: true,
                returnFocus: false
            }).then((result) => {
                if (result.isConfirmed) {
                    // Allow SweetAlert closing animation to finish before opening print dialog
                    setTimeout(() => {
                        printDocument(newDoc.id);
                    }, 400);
                }
                renderStudentProfile(studentId);
            });
        });
    }

    function printDocument(docId) {
        const doc = window.db.getDocuments().find(d => d.id === docId);
        if (!doc) return;
        const student = window.db.getStudentById(doc.studentId);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Impresión de Documento</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.6;}
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                    .header h2 { margin: 5px 0 0; font-size: 18px; color: #555; }
                    .content { white-space: pre-wrap; margin-bottom: 50px; font-size: 16px; text-align: justify; }
                    .content p { margin: 0 0 10px 0; line-height: 1.6; }
                    .content ul, .content ol { margin: 0 0 10px 0; padding-left: 20px; line-height: 1.6; }
                    .content strong { font-weight: bold; }
                    .date { text-align: right; margin-bottom: 30px; }
                    .signatures { margin-top: 100px; display: flex; justify-content: space-around; text-align: center; }
                    .sign-line { border-top: 1px solid #000; width: 250px; padding-top: 5px; margin: 0 auto; }
                    .sign-box p { margin: 5px 0; font-size: 14px; }
                    
                    @media print {
                        @page {
                            margin: 2cm;
                            size: letter portrait;
                        }
                        body {
                            padding: 0;
                            margin: 0;
                            height: 100%;
                        }
                        .header {
                            margin-bottom: 25px;
                        }
                        .header h1 { font-size: 18px; }
                        .header h2 { font-size: 14px; margin-top: 2px; }
                        .content {
                            font-size: 11pt;
                            margin-bottom: 20px;
                            line-height: 1.3;
                        }
                        .date {
                            margin-bottom: 15px;
                            font-size: 11pt;
                        }
                        h3 {
                            margin-bottom: 15px;
                            font-size: 14pt;
                        }
                        .signatures {
                            margin-top: 40px;
                            page-break-inside: avoid;
                        }
                        html, body {
                            min-height: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${window.db.getSetting('institutionName', 'PLENA "LA FLORESTA"').toUpperCase()}</h1>
                    <h2>COMISIÓN DISCIPLINARIA</h2>
                </div>
                <div class="date">
                    <strong>Fecha de Emisión:</strong> ${new Date(doc.createdAt).toLocaleDateString()}
                </div>
                <h3 style="text-align:center; text-decoration:underline; margin-bottom: 30px; text-transform:uppercase;">${doc.type}</h3>
                <div class="content">${doc.content}</div>
                
                <div class="signatures">
                    <div class="sign-box">
                        <div class="sign-line">Firma del Representante</div>
                        <p>${student.guardianName}</p>
                    </div>
                    <div class="sign-box">
                        <div class="sign-line">Firma de Comisión / Autoridad</div>
                        <p>Sello de la Institución</p>
                    </div>
                </div>
                <script>
                    window.onload = () => { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function renderRegulations() {
        const instName = window.db.getSetting('institutionName', 'PLENA "LA FLORESTA"');
        const defaultContent = `
                <div class="text-center mb-2">
                    <h2>REGLAMENTO INTERNO</h2>
                    <h3 class="text-muted">UNIDAD EDUCATIVA ${instName.toUpperCase()}</h3>
                    <p class="text-sm">PARA ESTUDIANTES Y PADRES DE FAMILIA</p>
                </div>
                
                <div class="regulation-section mb-2">
                    <h3>1. DE LA NATURALEZA</h3>
                    <p>La Unidad Educativa ${instName} turno mañana, es una institución educativa fiscal creado para prestar el servicio a la población estudiantil de la zona.</p>
                </div>
                
                <div class="regulation-section mb-2">
                    <h3>2. DEL OBJETIVO</h3>
                    <p>El objetivo del presente reglamento; es regular el funcionamiento, desarrollo y evaluación de la gestión escolar de la Unidad Educativa; en el marco de los principios y normas de los Tratados Internacionales y normativa vigente basado en la Constitución del Estado Plurinacional de Bolivia.</p>
                </div>

                <div class="regulation-section mb-2">
                    <h3>3. DEL ESTUDIANTE</h3>
                    
                    <h4 class="mt-1">3.1. DEL UNIFORME DE LOS ESTUDIANTES. R.M. 01/2026</h4>
                    <p><strong>a) PARA LOS VARONES.</strong> - Camisa blanca, corbata verde con el logotipo del colegio, pantalón de tela azul, no ajustada (ancho de la bota pie 18 cm), calcetines a media canilla, zapatos negros bien lustrados (prohibido las zapatillas o tenis), en invierno chompa de color verde cuello V o indumentaria de pueblo indígena originario si así lo requiera, corte de cabello escolar o clásico, de primero de primaria a sexto de secundaria.</p>
                    <p><strong>b)</strong> En el nivel inicial los estudiantes deben portar su respectivo mandil que los identifique como estudiantes de la Unidad Educativa.</p>
                    <p><strong>c) PARA LAS SEÑORITAS.</strong> - Guardapolvo blanco bajo la rodilla, corbatas verdes con el logotipo del colegio, pantalón azul de tela de vestir, (prohibido calzas y solo en época de invierno odias muy fríos) no ajustado, chompa cuello V de color verde, el peinado del cabello totalmente recogido con moño (blanco – primaria y moño negro - secundaria), medias blancas largas hasta la rodilla, zapato escolar negro sin tacos.</p>
                    <p><strong>d) PARA AMBOS.</strong> – Podrán utilizar varones y mujeres chompas o chamarras de color azul marino en época de invierno o cuando haga frio, no se permitirán peinados extravagantes, tintes, rayitos. No está permitido el uso de maquillajes, cadenas, dijes, manillas, pulseras y anillos extravagantes. Los mismos serán decomisados con devolución únicamente a fin de trimestre al padre de familia o tutor o tutora legal, el estudiante debe estar aseado. (cabello, rostro, uñas, manos, ropa limpia y pañuelo).</p>
                    <p><strong>e)</strong> LOS ESTUDIANTES que tienen las clases de Educación Física, deben asistir al establecimiento con buzo deportivo completo, su polera, corto y medias blancas hasta la rodilla.</p>

                    <h4 class="mt-1">3.2. DEL HORARIO DE CLASES</h4>
                    <p><strong>a) HORARIO NORMAL.</strong> - Las clases se desarrollarán en el horario establecido por niveles.</p>
                    <p><strong>b) CLASES HASTA SEPTIMAS Y OCTAVOS PERIODOS.</strong> – Los estudiantes que tienen las clases hasta las séptimas y octavos periodos se retiraran a 12:40 y 13:20 respectivamente. En el nivel secundario</p>
                    <p><strong>c) ATRASO Y LA INASISTENCIA.</strong> – Los estudiantes atrasados deberán ir cumplir con la sanción correspondiente de acuerdo a reglamento, excepto los casos justificados.</p>
                    <p><strong>d) Justificación de ausencia;</strong> Justificar las inasistencias a clases mediante una nota escrita firmada por el padre o madre y tutor de familia; caso contrario no tendrá validez alguna y no así vía teléfono, deben hacerlo antes del inicio a clases y no así en horas de clases, el horario de recepción de permisos será hasta horas 8:30.</p>

                    <h4 class="mt-1">3.3. DE LOS DEBERES DE LOS ESTUDIANTES</h4>
                    <p><strong>a)</strong> Los estudiantes tienen el deber de asistir puntualmente a las clases en el horario establecido.</p>
                    <p><strong>b)</strong> Los estudiantes tienen el deber de respetar a sus compañeros y compañeras, profesores y personal administrativo del establecimiento, sin discriminación alguna.</p>
                    <p><strong>c)</strong> Los estudiantes deben traer el material escolar de acuerdo al horario y al requerimiento de la asignatura. No se permitirán salidas de los estudiantes bajo ningún pretexto o motivo.</p>
                    <p><strong>d)</strong> Está prohibido que los estudiantes traigan al establecimiento objetos valiosos, como celulares y otros dispositivos tecnológicos, joyas, dinero y otros. Cualquier extravió es de completa responsabilidad del estudiante, la comisión disciplinaria no se hará responsable.</p>
                    <p><strong>e)</strong> Los estudiantes tienen el deber y la responsabilidad de cuidar el mobiliario y enseres del establecimiento, en caso de causar algún daño, deben resarcir el mismo en un plazo de 3 días, en caso de incumplimiento, el estudiante será sancionado según este reglamento hasta el cumplimiento de su obligación.</p>
                    <p><strong>f)</strong> Asistir a la Unidad Educativa en buenas condiciones de aseo.</p>
                    <p><strong>g)</strong> Cumplir los reglamentos y otras disposiciones relativas al funcionamiento de la Unidad Educativa.</p>

                    <h4 class="mt-1">3.4. DE LA DISCIPLINA</h4>
                    <p>La disciplina y el orden en la Unidad Educativa son la base para el desarrollo de una convivencia armónica entre todos los componentes de la Comunidad Educativa. Debe ser el resultado de un esfuerzo común, de la responsabilidad personal de cada estudiante, docente, funcionario administrativo, padres de familia y/o apoderados.</p>
                </div>

                <div class="regulation-section mb-2">
                    <h3>4. DE LAS SANCIONES</h3>
                    <p><strong>Tipificación de Faltas.</strong> Se consideran faltas a las contravenciones realizadas a las normas de conducta de las personas en el seno de una comunidad y al incumplimiento de los deberes establecidos para cada estamento de la Unidad Educativa. Las faltas se clasificarán como leves, graves y muy graves.</p>
                    <ul class="ml-2">
                        <li><strong>Falta Leve.</strong> - En caso de falta leve, la sanción será la amonestación y registro de la falta en el Kardex personal del estudiante.</li>
                        <li><strong>Falta Grave.</strong> - Se considera falta grave la reincidencia en la falta leve y otras indisciplinas que están señaladas en el reglamento y la sanción a aplicarse será la suspensión del estudiante y la citación de los padres a la Unidad Educativa para su respectivo tratamiento por la comisión de la disciplina del establecimiento.</li>
                        <li><strong>Falta Muy Grave.</strong> - Se considera falta muy grave, las mismas que están establecidas como tales en el reglamento interno de La Unidad Educativa y la sanción es de acuerdo a la resolución vigente.</li>
                    </ul>

                    <h4 class="mt-1">4.1. Falta Leve</h4>
                    <p>Se consideran faltas leves aquellas en las que se incurren en el acontecer diario de la vida de la Unidad Educativa, de manera no frecuente y sin intencionalidad negativa, tales como:</p>
                    <ul class="ml-2">
                        <li>a) No asistir a clases o tener retrasos no justificados oportunamente por el Padre de Familia y/o Apoderado.</li>
                        <li>b) Causar, fomentar o participar en desorden que afecten el proceso de enseñanza - aprendizaje en el aula o en aulas contiguas.</li>
                        <li>c) Permanecer en el aula durante el recreo.</li>
                        <li>d) Ausentarse de la clase sin permiso previo del (a) profesor(a) encargado(a) de la clase.</li>
                        <li>e) Ingresar al aula que no le corresponde sin autorización.</li>
                        <li>f) Realizar trabajos que no corresponden al tema tratado en clase, distrayéndose y distrayendo a sus compañeros.</li>
                        <li>g) No entregar a sus padres las citaciones y demás comunicados. No traer firmada como constancia de recepción las notificaciones enviadas a los padres de familia.</li>
                        <li>h) Vender objetos y/o productos de cualquier tipo en el interior de la Unidad Educativa, sin justificación y autorización.</li>
                        <li>i) No utilizar el uniforme reglamentario del colegio.</li>
                        <li>j) Usar tintes en el cabello y/o cabello largo (varones)</li>
                        <li>k) Usar piercing, aretes-aros, barba y bigotes salvo prescripción médica justificada.</li>
                        <li>l) Ingresar a determinados lugares como: laboratorios, áreas específicas, cursos, etc. sin autorización del docente y la indumentaria correspondiente.</li>
                        <li>m) Consumo de alimentos en el aula fuera del horario establecido.</li>
                        <li>n) quitarse el uniforme oficial una vez ingresado al establecimiento.</li>
                        <li>o) No tener un aseo personal adecuado todos los días, no tener las uñas bien cortadas y limpias.</li>
                    </ul>
                    <p class="font-bold mt-1">Las faltas leves conllevan a la imposición de una de las siguientes sanciones:</p>
                    <ul class="ml-2">
                        <li>a) Reflexión por parte del docente y/o comisión disciplinaria</li>
                        <li>b) Decomiso de objetos por el docente, que ser entregado a la Dirección:
                            <ul>
                                <li>- La 1° vez se devuelve al finalizar la semana, con presencia del padre de familia y firma de una constancia.</li>
                                <li>- La 2° se devuelve al finalizar el mes, con presencia del padre de familia y firma de una constancia.</li>
                                <li>- La 3° vez se entregará al finalizar la gestión educativa, con amonestación escrita.</li>
                            </ul>
                        </li>
                        <li>c) Faltas y atrasos sin la correspondiente justificación: Los estudiantes que lleguen después del tiempo de tolerancia, no entrarán a su turno de clase y realizarán un trabajo académico hasta el comienzo del 2º período de clases. El padre de familia recibirá notificación.</li>
                    </ul>

                    <h4 class="mt-1">4.2. Faltas graves del estudiante</h4>
                    <p>Las faltas graves son aquellos actos que van en contravención de los principios éticos, morales y sociales de la Institución que afectan significativamente el proceso de desarrollo de la persona que los comete, así como a otras personas de la comunidad. Se consideran faltas graves:</p>
                    <ul class="ml-2">
                        <li>a) Reincidencia de faltas leves (tres citaciones o notificaciones).</li>
                        <li>b) Traer a la U.E. dispositivos electrónicos, objetos de valor, excesivas sumas de dinero o juguetes amenazantes.</li>
                        <li>c) Dirigirse al personal directivo, docente, administrativo o de servicio de forma inadecuada.</li>
                        <li>d) Cometer fraudes, en las evaluaciones, prácticos y tareas.</li>
                        <li>e) Adulterar las notas y/o falsificar las firmas en las evaluaciones, boleta de calificaciones, citaciones, permisos y justificaciones.</li>
                        <li>f) Salir de la Unidad Educativa, durante el horario escolar sin autorización.</li>
                        <li>g) Enamorar, mostrar actitudes inadecuadas (besos, caricias) entre parejas.</li>
                        <li>h) Pronunciar gritos, insultos, golpear a los (as) compañeros (as), jugar bruscamente.</li>
                        <li>i) Abrir mochilas, maletines u otros objetos sin respetar la propiedad privada.</li>
                        <li>j) Desprestigiar con actitudes, hechos o palabras el buen nombre de la Unidad Educativa.</li>
                        <li>k) Utilizar vocabulario inadecuado, expresiones vulgares, ordinarias o de doble sentido.</li>
                        <li>l) Deteriorar, rayar, romper o malograr la infraestructura, equipos, mobiliarios, materiales, libros y otros.</li>
                    </ul>
                    <p class="font-bold mt-1">Sanciones a las faltas graves del estudiante:</p>
                    <ul class="ml-2">
                        <li>- Compromiso escrito del estudiante de no reincidir en la falta, firmado por sus padres o apoderados, cumpliendo una actividad comunitaria.</li>
                        <li>- En caso de causar daño a la infraestructura, el estudiante debe hacerse cargo de su reparación o reposición.</li>
                        <li>- Decomiso de los objetos o instrumentos causantes del daño.</li>
                    </ul>

                    <h4 class="mt-1">4.3. Faltas muy graves del estudiante</h4>
                    <p>Son faltas muy graves las que afectan la integridad moral, psicológica y/o física, de los estudiantes, tales como:</p>
                    <ul class="ml-2">
                        <li>a) Reincidencia en faltas graves.</li>
                        <li>b) Robos o hurto comprobados al interior del establecimiento.</li>
                        <li>c) Agresión física a miembros de la Unidad Educativa dentro y fuera de los predios.</li>
                        <li>d) Pertenecer o formar parte de pandillas delictivas.</li>
                        <li>e) Traer y consumir bebidas alcohólicas, cigarrillos, cigarrillos electrónicos (vapeadores) estupefacientes y sustancias controladas.</li>
                        <li>f) Tenencia de armas de cualquier tipo.</li>
                        <li>g) Uso inadecuado (fotos, videos, etc.) de celulares y tablets que perjudique a sus compañeros o al personal.</li>
                        <li>h) Queda terminantemente prohibido la portación y el uso de celulares durante la jornada educativa.</li>
                        <li>i) Realizar y/o participar en actions o utilizar términos que causen daño psicológico (Ley 045, Ley 548).</li>
                        <li>k) Crear, incitar o publicar material en páginas web, blogs, redes sociales ofendiendo a la Institución.</li>
                        <li>l, m) Realizar actos de vandalismo y contra la infraestructura.</li>
                        <li>n) Realizar amenazas contra la integridad física.</li>
                        <li>o) Presentarse en estado inconveniente (bajo efectos del alcohol o sustancias controladas).</li>
                    </ul>
                    <p class="font-bold mt-1">Sanción a las faltas muy graves del estudiante:</p>
                    <p>Deberán ser remitidas ante la autoridad competente. (DNNA, FELCV, FELCC Y OTRAS SEGÚN CORRESPONDA)</p>
                    <ul class="ml-2">
                        <li>- La 1° vez medidas socio comunitarias previa firma acta de compromiso e informe a Dirección.</li>
                        <li>- La 2° vez suspensión temporal del estudiante e informe a la DNNA.</li>
                        <li>- La 3° vez suspensión definitiva del estudiante de la Unidad Educativa.</li>
                    </ul>
                </div>

                <div class="regulation-section mb-2">
                    <h3>5. DE LOS DEBERES Y DERECHOS DE LOS PADRES DE FAMILIA Y / TUTORES</h3>
                    <ul class="ml-2">
                        <li>a) Es deber del padre de familia enviar a su hijo (a) al establecimiento puntualmente y justificar inasistencias.</li>
                        <li>b) Proporcionar a los estudiantes el material requerido.</li>
                        <li>c) Enviar a sus hijos con el uniforme indicado y limpio.</li>
                        <li>d) Averiguar en forma permanente cada trimestre, sobre el rendimiento o aprendizaje.</li>
                        <li>e) El padre de familia citado por la Dirección debe constituirse con carácter obligatorio.</li>
                        <li>f) La asistencia a talleres y entrega de boletines de notas trimestrales es completamente obligatoria.</li>
                        <li>g, h) Cumplir y hacer cumplir el presente reglamento.</li>
                    </ul>
                    <div class="mt-2 text-sm text-muted">
                        <p><strong>Nota:</strong> Los padres de familia o tutores legales no pueden ingresar a la Unidad Educativa en horario de clases, el portero y regente son los encargados de controlar el ingreso, previa citación.</p>
                        <p>Es responsabilidad de la Dirección, personal docente, regente y comisión de disciplina hacer cumplir el presente reglamento.</p>
                        <p><em>Enero del 2026.</em></p>
                    </div>
                </div>
        `;

        const content = window.db.getSetting('regulationsContent', defaultContent);

        mainContent.innerHTML = `
            <div class="card max-w-4xl mx-auto mb-2" style="background: transparent; border: none; box-shadow: none; padding: 0;">
                
                <!-- Visor Documento Formal -->
                <div class="ql-container ql-snow" style="border: none; font-family: inherit;">
                    <div id="regulations-display" class="quill-content-display ql-editor">
                        ${content}
                    </div>
                </div>

                <!-- Editor de Contenido Quill -->
                <div id="regulations-editor-container" class="hidden" style="margin-bottom: 2rem;">
                    <div style="background: #f8f9fa; border-radius: 8px 8px 0 0; padding: 10px; border: 1px solid #ccc; border-bottom: none;">
                       <span style="color: #495057; font-size: 0.9rem; font-weight: bold;">Modo de Edición: Reglamento Institucional</span>
                    </div>
                    <div id="quill-regulations-target" style="height: 60vh; background: white; color: black; border-radius: 0 0 8px 8px;"></div>
                    
                    <div class="flex justify-end gap-1 mt-2">
                        <button class="btn btn-gray" id="btn-cancel-regulations">Cancelar</button>
                        <button class="btn btn-primary" id="btn-save-regulations">Guardar</button>
                    </div>
                </div>

                <!-- Opciones Inferiores -->
                <div class="flex justify-end" id="regulations-footer-options">
                    <button class="btn btn-secondary" id="btn-edit-regulations">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle; margin-right:5px; margin-bottom:2px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5 14.5z"></path>
                        </svg>
                        Editar Reglamento
                    </button>
                </div>
            </div>
        `;

        const displayBox = document.getElementById('regulations-display');
        const editorBox = document.getElementById('regulations-editor-container');
        const footerOptions = document.getElementById('regulations-footer-options');
        const btnEdit = document.getElementById('btn-edit-regulations');
        let quillRegulations = null;

        btnEdit.addEventListener('click', () => {
            displayBox.classList.add('hidden');
            footerOptions.classList.add('hidden');
            editorBox.classList.remove('hidden');

            if (!quillRegulations) {
                quillRegulations = new Quill('#quill-regulations-target', {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            [{ 'indent': '-1' }, { 'indent': '+1' }],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'align': [] }],
                            ['clean']
                        ]
                    }
                });
            }
            quillRegulations.clipboard.dangerouslyPasteHTML(content);
            setTimeout(() => {
                quillRegulations.focus();
                const length = quillRegulations.getLength();
                quillRegulations.setSelection(length, 0);
            }, 100);
        });

        document.getElementById('btn-cancel-regulations').addEventListener('click', () => {
            editorBox.classList.add('hidden');
            displayBox.classList.remove('hidden');
            footerOptions.classList.remove('hidden');
        });

        document.getElementById('btn-save-regulations').addEventListener('click', () => {
            const newContent = quillRegulations.root.innerHTML;
            window.db.saveSetting('regulationsContent', newContent);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Reglamento almacenado exitosamente',
                showConfirmButton: false,
                timer: 2000
            });

            renderRegulations(); // Re-render view completely!
        });
    }

    function renderReports(params = {}) {
        const selectedLevel = params.level || 'Secundario';
        const allStudents = window.db.getStudents();
        const allIncidents = window.db.getIncidents();

        const reportData = {};

        // Filter students by selected level
        const students = allStudents.filter(s => (s.level === selectedLevel) || (!s.level && selectedLevel === 'Secundario'));

        students.forEach(s => {
            const courseKey = `${s.course} "${s.parallel}"`;
            if (!reportData[courseKey]) {
                reportData[courseKey] = {
                    totalStudents: 0,
                    incidents: {
                        'Falta Leve': 0,
                        'Falta Grave': 0,
                        'Falta Muy Grave': 0,
                        'Otro': 0
                    },
                    totalIncidents: 0
                };
            }
            reportData[courseKey].totalStudents++;
        });

        // Filter incidents by students in this level
        const incidents = allIncidents.filter(inc => {
            const student = window.db.getStudentById(inc.studentId);
            if (!student) return false;
            return (student.level === selectedLevel) || (!student.level && selectedLevel === 'Secundario');
        });

        incidents.forEach(inc => {
            const student = window.db.getStudentById(inc.studentId);
            const courseKey = `${student.course} "${student.parallel}"`;
            if (reportData[courseKey]) {
                const type = inc.type;
                if (reportData[courseKey].incidents[type] !== undefined) {
                    reportData[courseKey].incidents[type]++;
                } else {
                    reportData[courseKey].incidents['Otro']++;
                }
                reportData[courseKey].totalIncidents++;
            }
        });

        const sortedCourses = Object.entries(reportData).sort((a, b) => b[1].totalIncidents - a[1].totalIncidents);
        const maxIncidents = Math.max(...sortedCourses.map(c => c[1].totalIncidents), 1);

        let html = `
            <div class="tabs-container mb-2">
                <div class="tabs" style="border-bottom: 2px solid var(--border);">
                    <button class="tab reports-tab ${selectedLevel === 'Primario' ? 'active' : ''}" data-level="Primario">Nivel Primario</button>
                    <button class="tab reports-tab ${selectedLevel === 'Secundario' ? 'active' : ''}" data-level="Secundario">Nivel Secundario</button>
                </div>
            </div>

            <div class="card mb-2">
                <h3 class="mb-1" style="color: var(--primary);">Nivel de Indisciplina por Cursos - Nivel ${selectedLevel}</h3>
                <p class="text-muted mb-2">Análisis de la cantidad y tipo de faltas cometidas por curso, ordenado por número de incidencias.</p>
                
                <div style="overflow-x: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Curso / Paralelo</th>
                                <th>Faltas Leves</th>
                                <th>Faltas Graves</th>
                                <th>Faltas Muy Graves</th>
                                <th style="min-width: 250px;">Nivel de Indisciplina (Total)</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (sortedCourses.length === 0) {
            html += `<tr><td colspan="5" class="text-center text-muted">No hay datos para mostrar en el Nivel ${selectedLevel}</td></tr>`;
        }

        sortedCourses.forEach(([courseKey, data]) => {
            const percentage = Math.floor((data.totalIncidents / maxIncidents) * 100);
            const colorVar = percentage > 75 ? 'var(--danger)' : percentage > 30 ? 'var(--warning)' : 'var(--info)';

            // Si no hay incidencias, la barra será 0
            const displayPercentage = data.totalIncidents === 0 ? 0 : Math.max(percentage, 5); // Al menos 5% para que se vea un poco de color

            const barHtml = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background-color: #e2e8f0; border-radius: 4px; height: 12px; overflow: hidden;">
                        <div style="width: ${displayPercentage}%; background-color: ${colorVar}; height: 100%; transition: width 0.5s ease-in-out;"></div>
                    </div>
                    <span style="font-weight: bold; width: 30px; text-align: right;">${data.totalIncidents}</span>
                </div>
            `;

            html += `
                <tr>
                    <td class="font-bold">${courseKey}</td>
                    <td><span class="badge badge-info">${data.incidents['Falta Leve']}</span></td>
                    <td><span class="badge badge-warning">${data.incidents['Falta Grave']}</span></td>
                    <td><span class="badge badge-danger">${data.incidents['Falta Muy Grave']}</span></td>
                    <td>${barHtml}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        mainContent.innerHTML = html;

        // Reports Tab Change Events
        document.querySelectorAll('.reports-tab').forEach(t => {
            t.addEventListener('click', (e) => {
                renderReports({ level: e.currentTarget.dataset.level });
            });
        });
    }

    function getIncidentBadgeColor(type) {
        if (type === 'Falta Leve') return 'warning';
        if (type === 'Falta Grave') return 'danger';
        if (type === 'Falta Muy Grave') return 'danger';
        return 'info';
    }

    // Expose for inline onclick functions
    window.app = { loadView };

    window.addEventListener('settings-fetched', () => {
        updateInstitutionNameDisplays();

        // Refrescar vista actual si depende fuertemente de configuración
        if (currentViewObj && (currentViewObj.viewName === 'regulations' || currentViewObj.viewName === 'settings')) {
            loadView(currentViewObj.viewName, currentViewObj.params);
        }
    });

    window.addEventListener('db-updated', () => {
        // Refrescar automáticamente datos en las vistas principales si llegan de firebase
        if (currentViewObj && (currentViewObj.viewName === 'students' || currentViewObj.viewName === 'dashboard' || currentViewObj.viewName === 'reports' || currentViewObj.viewName === 'student-profile')) {
            loadView(currentViewObj.viewName, currentViewObj.params);
        }
    });

    // Execute authentication check after all declarations are hoisted and setup is done.
    checkAuth();
});
