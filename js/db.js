import { db as firestoreDb } from './firebase.js';
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

const DB_PREFIX = "diciplinaria_";

class Database {
    constructor() {
        this.cache = {
            teachers: [],
            students: [],
            incidents: [],
            documents: []
        };
        this.ready = false;
        this.onReadyCallbacks = [];
        this.tenantId = null;
        this.init();
    }

    init() {
        // Hardcodeamos los usuarios multi-institución
        this.cache.teachers = [
            { id: 'inst_aula111', username: 'aula111', password: 'aula111', name: 'Institución Aula111', institutionId: 'aula111' },
            { id: 'inst_aprende', username: 'aprende', password: 'aprende123', name: 'Institución Aprende', institutionId: 'aprende' },
            { id: 'inst_estudia', username: 'estudia', password: 'estudia123', name: 'Institución Estudia', institutionId: 'estudia' },
            { id: 'inst_practica', username: 'practica', password: 'practica123', name: 'Institución Practica', institutionId: 'practica' },
            { id: 'inst_avanza', username: 'avanza', password: 'avanza123', name: 'Institución Avanza', institutionId: 'avanza' },
            { id: 'inst_docente', username: 'docente', password: 'docente123', name: 'Institución Docente', institutionId: 'docente' },
            { id: 'inst_sistema', username: 'sistema', password: 'sistema123', name: 'Institución Sistema', institutionId: 'sistema' },
            { id: 'inst_control', username: 'control', password: 'control123', name: 'Institución Control', institutionId: 'control' },
            { id: 'inst_registro', username: 'registro', password: 'registro123', name: 'Institución Registro', institutionId: 'registro' },
            { id: 'inst_reporte', username: 'reporte', password: 'reporte123', name: 'Institución Reporte', institutionId: 'reporte' },
            { id: 'inst_estudiante', username: 'estudiante', password: 'estudiante123', name: 'Institución Estudiante', institutionId: 'estudiante' },
            { id: 'inst_informes', username: 'informes', password: 'informes123', name: 'Institución Informes', institutionId: 'informes' },
            { id: 'inst_aula125', username: 'aula125', password: 'aula125', name: 'Institución Aula125', institutionId: 'aula125' },
            { id: 'inst_aula077', username: 'aula077', password: 'aula077', name: 'Institución Aula077', institutionId: 'aula077' },
            { id: 'inst_auladis123', username: 'auladis123', password: 'auladis123', name: 'Institución Auladis123', institutionId: 'auladis123' },
            { id: 'inst_auladis245', username: 'auladis245', password: 'auladis245', name: 'Institución Auladis245', institutionId: 'auladis245' }
        ];

        const user = this.getCurrentUser();
        if (user) {
            this.tenantId = user.institutionId || 'aula111';
            this.loadTenantData();
        }

        this.ready = true;
        this.onReadyCallbacks.forEach(cb => cb());
    }

    loadTenantData() {
        if (!this.tenantId) return;

        this.cache.students = JSON.parse(localStorage.getItem(`${DB_PREFIX}${this.tenantId}_students`)) || [];
        this.cache.incidents = JSON.parse(localStorage.getItem(`${DB_PREFIX}${this.tenantId}_incidents`)) || [];
        this.cache.documents = JSON.parse(localStorage.getItem(`${DB_PREFIX}${this.tenantId}_documents`)) || [];

        // Sincronizar con Firebase en segundo plano para este tenant
        if (firestoreDb) {
            try {
                this._setupListeners('students');
                this._setupListeners('incidents');
                this._setupListeners('documents');
                this._setupSettingsListener();
            } catch (error) {
                console.error("Error setting up Firebase listeners:", error);
            }
        }
    }

    _setupListeners(table) {
        onSnapshot(collection(firestoreDb, `institutions/${this.tenantId}/${table}`), (snapshot) => {
            const data = [];
            snapshot.forEach(docSnap => data.push(docSnap.data()));
            if (data.length > 0) {
                this.cache[table] = data;
                localStorage.setItem(`${DB_PREFIX}${this.tenantId}_${table}`, JSON.stringify(data));

                // Disparar evento para que la UI se actualice si está escuchando
                window.dispatchEvent(new CustomEvent('db-updated', { detail: { table } }));
            }
        }, (error) => {
            console.warn(`Error escuchando cambios de ${table}:`, error);
        });
    }

    _setupSettingsListener() {
        onSnapshot(doc(firestoreDb, `institutions/${this.tenantId}/settings`, "config"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                localStorage.setItem(`${DB_PREFIX}${this.tenantId}_settings`, JSON.stringify(data));
                window.dispatchEvent(new CustomEvent('settings-fetched', { detail: data }));
            }
        }, (error) => {
            console.warn(`Error escuchando cambios de configuraciones:`, error);
        });
    }

    onReady(cb) {
        if (this.ready) cb();
        else this.onReadyCallbacks.push(cb);
    }

    // --- GENERIC ---
    _getTable(table) {
        if (table === 'teachers') return this.cache.teachers;
        return this.cache[table] || [];
    }

    _saveTable(table, data) {
        if (table === 'teachers') return; // Teachers are hardcoded mapping
        this.cache[table] = data;
        localStorage.setItem(`${DB_PREFIX}${this.tenantId}_${table}`, JSON.stringify(data));
    }

    async _syncToFirebase(table, dataItem) {
        if (!firestoreDb || !this.tenantId) return;
        try {
            await setDoc(doc(firestoreDb, `institutions/${this.tenantId}/${table}`, String(dataItem.id)), dataItem);
        } catch (e) {
            console.error(`Error syncing to Firebase ${table}:`, e);
        }
    }

    _generateId(table) {
        const data = this._getTable(table);
        return data.length > 0 ? Math.max(...data.map(i => parseInt(i.id) || 0)) + 1 : 1;
    }

    // --- AUTH ---
    login(username, password) {
        const teachers = this._getTable('teachers');
        const user = teachers.find(t => t.username === username && t.password === password);
        if (user) {
            user.institutionId = user.institutionId || 'aula111';
            sessionStorage.setItem('currentUser', JSON.stringify(user));

            this.tenantId = user.institutionId;
            this.loadTenantData();

            return user;
        }
        return null;
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        this.tenantId = null;
        this.cache.students = [];
        this.cache.incidents = [];
        this.cache.documents = [];
    }

    getCurrentUser() {
        const user = sessionStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    // --- STUDENTS ---
    getStudents() {
        return this._getTable('students');
    }

    getStudentById(id) {
        return this._getTable('students').find(s => s.id === parseInt(id));
    }

    addStudent(student) {
        const students = this.getStudents();
        const newStudent = { ...student, id: this._generateId('students'), createdAt: new Date().toISOString() };
        students.push(newStudent);
        this._saveTable('students', students);
        this._syncToFirebase('students', newStudent);
        return newStudent;
    }

    updateStudent(id, updatedData) {
        const students = this.getStudents();
        const index = students.findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            students[index] = { ...students[index], ...updatedData };
            this._saveTable('students', students);
            this._syncToFirebase('students', students[index]);
            return students[index];
        }
        return null;
    }

    // --- INCIDENTS ---
    getIncidents() {
        return this._getTable('incidents');
    }

    getIncidentsByStudent(studentId) {
        return this.getIncidents().filter(i => i.studentId === parseInt(studentId));
    }

    addIncident(incident) {
        const incidents = this.getIncidents();
        const newIncident = { ...incident, id: this._generateId('incidents'), createdAt: new Date().toISOString() };
        incidents.push(newIncident);
        this._saveTable('incidents', incidents);
        this._syncToFirebase('incidents', newIncident);
        return newIncident;
    }

    updateIncident(id, updatedData) {
        const incidents = this.getIncidents();
        const index = incidents.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
            incidents[index] = { ...incidents[index], ...updatedData };
            this._saveTable('incidents', incidents);
            this._syncToFirebase('incidents', incidents[index]);
            return incidents[index];
        }
        return null;
    }

    getIncidentById(id) {
        return this.getIncidents().find(i => i.id === parseInt(id));
    }

    // --- DOCUMENTS ---
    getDocuments() {
        return this._getTable('documents');
    }

    getDocumentsByStudent(studentId) {
        return this.getDocuments().filter(d => d.studentId === parseInt(studentId));
    }

    addDocument(document) {
        const documents = this.getDocuments();
        const newDocument = { ...document, id: this._generateId('documents'), createdAt: new Date().toISOString() };
        documents.push(newDocument);
        this._saveTable('documents', documents);
        this._syncToFirebase('documents', newDocument);
        return newDocument;
    }
    // --- SETTINGS ---
    getSetting(key, defaultValue = '') {
        const settings = JSON.parse(localStorage.getItem(`${DB_PREFIX}${this.tenantId}_settings`)) || {};
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    async saveSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem(`${DB_PREFIX}${this.tenantId}_settings`)) || {};
        settings[key] = value;
        localStorage.setItem(`${DB_PREFIX}${this.tenantId}_settings`, JSON.stringify(settings));

        if (firestoreDb && this.tenantId) {
            try {
                await setDoc(doc(firestoreDb, `institutions/${this.tenantId}/settings`, "config"), settings);
            } catch (e) {
                console.error("Error saving settings to Firebase:", e);
            }
        }

        window.dispatchEvent(new CustomEvent('settings-updated', { detail: { key, value } }));
    }
}

export const db = new Database();
