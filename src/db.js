const fs = require('fs');
const path = require('path');

// Local file storage paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const FINDINGS_FILE = path.join(DATA_DIR, 'findings.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database helper functions
const readData = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content || '[]');
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return [];
    }
};

const writeData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error writing ${filePath}:`, e);
    }
};

// --- Users Table Controller ---
const users = {
    createUser(user) {
        const list = readData(USERS_FILE);
        const newUser = {
            id: String(Date.now() + Math.floor(Math.random() * 1000)),
            name: user.name,
            email: user.email.toLowerCase(),
            password: user.password,
            created_at: new Date().toISOString()
        };
        list.push(newUser);
        writeData(USERS_FILE, list);
        return newUser;
    },

    findUserByEmail(email) {
        const list = readData(USERS_FILE);
        return list.find(u => u.email === email.toLowerCase()) || null;
    },

    findUserById(id) {
        const list = readData(USERS_FILE);
        return list.find(u => u.id === id) || null;
    }
};

// --- Projects Table Controller ---
const projects = {
    createProject({ user_id, project_name, github_url = null }) {
        const list = readData(PROJECTS_FILE);
        const newProj = {
            id: String(Date.now() + Math.floor(Math.random() * 1000)),
            user_id,
            project_name,
            github_url,
            created_at: new Date().toISOString()
        };
        list.push(newProj);
        writeData(PROJECTS_FILE, list);
        return newProj;
    },

    findProjectsByUser(userId) {
        const list = readData(PROJECTS_FILE);
        return list.filter(p => p.user_id === userId);
    },

    findProjectById(id) {
        const list = readData(PROJECTS_FILE);
        return list.find(p => p.id === id) || null;
    },

    findOrCreateDefaultProject(userId) {
        const userProjects = this.findProjectsByUser(userId);
        if (userProjects.length > 0) {
            return userProjects[0];
        }
        return this.createProject({
            user_id: userId,
            project_name: "Default Workspace",
            github_url: ""
        });
    }
};

// --- Reviews Table Controller ---
const reviews = {
    createReview({ project_id, review_type, overall_score, summary, file_name, code_body }) {
        const list = readData(REVIEWS_FILE);
        const newReview = {
            id: String(Date.now() + Math.floor(Math.random() * 1000)),
            project_id,
            review_type,
            overall_score,
            summary,
            file_name,
            code_body, // store raw code body to render in code editor
            created_at: new Date().toISOString()
        };
        list.push(newReview);
        writeData(REVIEWS_FILE, list);
        return newReview;
    },

    findReviewsByProject(projectId) {
        const list = readData(REVIEWS_FILE);
        return list.filter(r => r.project_id === projectId);
    },

    findReviewById(id) {
        const list = readData(REVIEWS_FILE);
        return list.find(r => r.id === id) || null;
    },

    deleteReview(id) {
        // Delete review
        let list = readData(REVIEWS_FILE);
        list = list.filter(r => r.id !== id);
        writeData(REVIEWS_FILE, list);

        // Delete associated findings
        let findingsList = readData(FINDINGS_FILE);
        findingsList = findingsList.filter(f => f.review_id !== id);
        writeData(FINDINGS_FILE, findingsList);

        return true;
    }
};

// --- Review Findings Table Controller ---
const findings = {
    createFinding({ review_id, severity, issue, explanation, suggested_fix, file_name, line_number }) {
        const list = readData(FINDINGS_FILE);
        const newFinding = {
            id: String(Date.now() + Math.floor(Math.random() * 1000)),
            review_id,
            severity, // critical, warning, info
            issue,
            explanation,
            suggested_fix,
            file_name,
            line_number
        };
        list.push(newFinding);
        writeData(FINDINGS_FILE, list);
        return newFinding;
    },

    findFindingsByReview(reviewId) {
        const list = readData(FINDINGS_FILE);
        return list.filter(f => f.review_id === reviewId);
    }
};

module.exports = {
    users,
    projects,
    reviews,
    findings
};
