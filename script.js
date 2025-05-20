document.addEventListener('DOMContentLoaded', () => {
    const notesList = document.getElementById('notesList');
    const addNoteFab = document.getElementById('addNoteFab');
    const noteDialog = document.getElementById('noteDialog');
    const noteForm = document.getElementById('noteForm');
    const noteIdInput = document.getElementById('noteIdInput');
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;

    let notes = [];
    let currentEditingId = null;

    // --- Theming ---
    function applyTheme(theme) { // theme is 'light' or 'dark'
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(theme + '-theme'); // e.g., 'dark-theme'
        localStorage.setItem('mnotes-theme', theme);

        const icon = themeToggleBtn.querySelector('md-icon');
        if (theme === 'dark') {
            icon.textContent = 'light_mode';
            themeToggleBtn.ariaLabel = "Activate light theme";
        } else {
            icon.textContent = 'dark_mode';
            themeToggleBtn.ariaLabel = "Activate dark theme";
        }
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('mnotes-theme') || (body.classList.contains('dark-theme') ? 'dark' : 'light');
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    }

    function loadInitialTheme() {
        const savedTheme = localStorage.getItem('mnotes-theme');
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            // Prefer system theme if no preference saved
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                applyTheme('dark');
            } else {
                applyTheme('light'); // Default to light
            }
        }
    }
    themeToggleBtn.addEventListener('click', toggleTheme);

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
        notesList.innerHTML = ''; // Clear existing notes
        if (notes.length === 0) {
            const p = document.createElement('p');
            p.textContent = "No notes yet. Click the + button to add one!";
            notesList.appendChild(p);
            return;
        }

        notes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)); // Sort by most recently modified

        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            
            const elevation = document.createElement('md-elevation'); // Add MWC elevation
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
        noteForm.reset(); // Clear form fields
        // Reset MWC text field states (e.g. error messages)
        noteTitleInput.errorText = "";
        noteTitleInput.error = false;
        noteContentInput.errorText = "";
        noteContentInput.error = false;

        if (note) {
            currentEditingId = note.id;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content; // Full content for editing
            noteDialog.querySelector('[slot="headline"]').textContent = 'Edit Note';
        } else {
            currentEditingId = null;
            noteDialog.querySelector('[slot="headline"]').textContent = 'Add New Note';
        }
        // Material Web Components use open property instead of show() method
        noteDialog.open = true;
    }

    function handleDialogClose(event) {
        // event.detail.action contains the `value` of the button that closed it
        if (event.detail.action === 'save') {
            const title = noteTitleInput.value.trim();
            const content = noteContentInput.value.trim();

            let isValid = true;
            if (!title) {
                noteTitleInput.error = true;
                noteTitleInput.errorText = "Title cannot be empty.";
                isValid = false;
            } else {
                 noteTitleInput.error = false;
                 noteTitleInput.errorText = "";
            }
            if (!content) {
                noteContentInput.error = true;
                noteContentInput.errorText = "Content cannot be empty.";
                isValid = false;
            } else {
                noteContentInput.error = false;
                noteContentInput.errorText = "";
            }

            if (!isValid) {
                // To prevent dialog from closing on invalid native form submission,
                // we'd need to handle the 'submit' event on the form, preventDefault,
                // then manually close if valid.
                // Since `method="dialog"` auto-closes, we re-show if invalid.
                // This is a common pattern if not using full form.requestSubmit().
                noteDialog.open = true; // Re-open dialog if validation fails after it auto-closed.
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
                    id: Date.now().toString(),
                    title,
                    content,
                    createdAt: now,
                    lastModified: now
                });
            }
            saveNotes();
            renderNotes();
        }
        // Reset for next time dialog opens
        currentEditingId = null;
        noteForm.reset(); // Ensure form is clean
        noteTitleInput.error = false; noteTitleInput.errorText = "";
        noteContentInput.error = false; noteContentInput.errorText = "";
    }

    function deleteNote(id) {
        // Consider using an md-dialog for confirmation for better UX
        // For simplicity, using confirm() for now
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
            renderNotes();
        }
    }

    // --- Event Listeners ---
    addNoteFab.addEventListener('click', () => openNoteDialog());
    noteDialog.addEventListener('closed', handleDialogClose);

    // --- Initial Load ---
    loadInitialTheme();
    loadNotes();
});
