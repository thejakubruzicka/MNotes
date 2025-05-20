// Define variables in a scope accessible by functions
let notesList, addNoteFab, noteDialog, noteForm, noteIdInput, noteTitleInput, noteContentInput;
let themeToggleBtn, body;
let notes = [];
let currentEditingId = null;

async function initializeApp() {
    // List of MWC components your app uses directly
    const mwcComponents = [
        'md-icon', 'md-fab', 'md-dialog', 'md-filled-button', 'md-text-button',
        'md-icon-button', 'md-filled-text-field', 'md-outlined-text-field', 'md-elevation'
    ];

    try {
        // Wait for all essential MWC components to be defined
        await Promise.all(mwcComponents.map(comp => customElements.whenDefined(comp)));
        console.log("All MWC components are ready.");
    } catch (error) {
        console.error("Error waiting for MWC components:", error);
        document.body.classList.add('loaded'); // Show body anyway
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <p>Error loading application components. The page might not work correctly.</p>
            <p>Please try refreshing. If the problem persists, check your browser console for details.</p>
        `;
        errorDiv.style.color = "red";
        errorDiv.style.textAlign = "center";
        errorDiv.style.padding = "20px";
        document.body.prepend(errorDiv);
        return; // Stop further initialization if critical components failed
    }

    // --- Assign DOM elements AFTER MWC components are ready and upgraded ---
    notesList = document.getElementById('notesList');
    addNoteFab = document.getElementById('addNoteFab');
    noteDialog = document.getElementById('noteDialog');
    noteForm = document.getElementById('noteForm');
    noteIdInput = document.getElementById('noteIdInput');
    noteTitleInput = document.getElementById('noteTitleInput');
    noteContentInput = document.getElementById('noteContentInput');
    themeToggleBtn = document.getElementById('themeToggleBtn');
    body = document.body;

    // --- Theming ---
    // Ensure applyTheme is called after themeToggleBtn and body are defined.
    loadInitialTheme(); // This will call applyTheme

    // --- Event Listeners (Attach now that elements are MWC-upgraded) ---
    themeToggleBtn.addEventListener('click', toggleTheme);
    addNoteFab.addEventListener('click', () => openNoteDialog());
    noteDialog.addEventListener('closed', handleDialogClose);


    // --- Initial Data Load ---
    loadNotes(); // This calls renderNotes, which creates more MWC elements

    // --- Make body visible now that everything is set up ---
    document.body.classList.add('loaded');
    console.log("MNotes App Initialized and Visible.");
}

// --- Theming Functions ---
function loadInitialTheme() {
    const savedTheme = localStorage.getItem('mnotes-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
}

function applyTheme(theme) { // theme is 'light' or 'dark'
    if (!body || !themeToggleBtn) {
        console.warn("Body or themeToggleBtn not ready for applyTheme.");
        return;
    }
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(theme + '-theme');
    localStorage.setItem('mnotes-theme', theme);

    const iconElement = themeToggleBtn.querySelector('md-icon');
    if (iconElement) {
        iconElement.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        themeToggleBtn.ariaLabel = theme === 'dark' ? "Activate light theme" : "Activate dark theme";
    }
}

function toggleTheme() {
    const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// --- Data Persistence ---
function loadNotes() {
    const storedNotes = localStorage.getItem('material-notes');
    notes = storedNotes ? JSON.parse(storedNotes) : [];
    renderNotes();
}

function saveNotes() {
    localStorage.setItem('material-notes', JSON.stringify(notes));
}

// --- Rendering Notes ---
function renderNotes() {
    if (!notesList) {
        console.error("notesList element not found during renderNotes. App not fully initialized?");
        return;
    }
    notesList.innerHTML = ''; // Clear existing notes
    if (notes.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No notes yet. Click the + button to add one!";
        notesList.appendChild(p);
        return;
    }

    notes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        
        const elevation = document.createElement('md-elevation');
        noteCard.appendChild(elevation);

        const title = document.createElement('h3');
        title.textContent = note.title;

        const content = document.createElement('p');
        content.textContent = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '');

        const actions = document.createElement('div');
        actions.className = 'note-card-actions';

        const editButton = document.createElement('md-icon-button');
        editButton.innerHTML = `<md-icon>edit</md-icon>`;
        editButton.ariaLabel = `Edit note: ${note.title}`;
        editButton.addEventListener('click', (e) => { e.stopPropagation(); openNoteDialog(note); });

        const deleteButton = document.createElement('md-icon-button');
        deleteButton.innerHTML = `<md-icon>delete</md-icon>`;
        deleteButton.ariaLabel = `Delete note: ${note.title}`;
        deleteButton.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(note.id); });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        noteCard.appendChild(title);
        noteCard.appendChild(content);
        noteCard.appendChild(actions);
        notesList.appendChild(noteCard);
    });
}

// --- Note Operations ---
function openNoteDialog(note = null) {
    if (!noteForm || !noteTitleInput || !noteContentInput || !noteDialog) {
        console.error("Dialog elements not found for openNoteDialog.");
        return;
    }
    noteForm.reset();
    noteTitleInput.error = false; noteTitleInput.errorText = "";
    noteContentInput.error = false; noteContentInput.errorText = "";

    const headline = noteDialog.querySelector('[slot="headline"]');

    if (note) {
        currentEditingId = note.id;
        noteIdInput.value = note.id; // Keep track of ID if needed by form
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        if(headline) headline.textContent = 'Edit Note';
    } else {
        currentEditingId = null;
        noteIdInput.value = '';
        if(headline) headline.textContent = 'Add New Note';
    }
    noteDialog.show();
}

function handleDialogClose(event) {
    if (event.detail.action === 'save') { // 'action' is the value of the button that closed the dialog
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();

        let isValid = true;
        if (!title) {
            noteTitleInput.error = true; noteTitleInput.errorText = "Title cannot be empty.";
            isValid = false;
        } else {
            noteTitleInput.error = false; noteTitleInput.errorText = "";
        }
        if (!content) {
            noteContentInput.error = true; noteContentInput.errorText = "Content cannot be empty.";
            isValid = false;
        } else {
            noteContentInput.error = false; noteContentInput.errorText = "";
        }

        if (!isValid) {
            // If form is invalid and dialog closed (e.g. via form method="dialog"), reopen it.
            // Need a slight delay for the dialog to fully process its closing action.
            setTimeout(() => { if (noteDialog) noteDialog.show(); }, 0);
            return;
        }

        const now = new Date().toISOString();
        if (currentEditingId) {
            const noteIndex = notes.findIndex(n => n.id === currentEditingId);
            if (noteIndex > -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
                notes[noteIndex].lastModified = now;
            }
        } else {
            notes.push({
                id: Date.now().toString(), title, content,
                createdAt: now, lastModified: now
            });
        }
        saveNotes();
        renderNotes();
    }
    // Reset for next time dialog opens, regardless of save or cancel
    currentEditingId = null;
    if (noteForm) noteForm.reset();
    if (noteTitleInput) { noteTitleInput.error = false; noteTitleInput.errorText = ""; }
    if (noteContentInput) { noteContentInput.error = false; noteContentInput.errorText = ""; }
}

function deleteNote(id) {
    // Consider a md-dialog for confirmation for Material consistency
    if (confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        renderNotes();
    }
}

// --- Start the application initialization ---
// This ensures that the script attempts to initialize after the page DOM is loaded
// and MWC has had a chance to load and start defining components.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
