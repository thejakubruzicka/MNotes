document.addEventListener('DOMContentLoaded', () => {
    const notesList = document.getElementById('notesList');
    const addNoteFab = document.getElementById('addNoteFab');
    const noteDialog = document.getElementById('noteDialog');
    const noteForm = document.getElementById('noteForm');
    const noteIdInput = document.getElementById('noteIdInput');
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');

    let notes = [];
    let currentEditingId = null;

    // --- Data Persistence ---
    function loadNotes() {
        const storedNotes = localStorage.getItem('material-notes');
        if (storedNotes) {
            notes = JSON.parse(storedNotes);
        }
        renderNotes();
    }

    function saveNotes() {
        localStorage.setItem('material-notes', JSON.stringify(notes));
    }

    // --- Rendering Notes ---
    function renderNotes() {
        notesList.innerHTML = ''; // Clear existing notes
        if (notes.length === 0) {
            notesList.innerHTML = `<p style="text-align:center; color: var(--md-sys-color-outline);">No notes yet. Click the + button to add one!</p>`;
            return;
        }

        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            // Add md-elevation for a card-like appearance
            const elevation = document.createElement('md-elevation');
            noteCard.appendChild(elevation);


            const title = document.createElement('h3');
            title.textContent = note.title;

            const content = document.createElement('p');
            content.textContent = note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''); // Preview

            const actions = document.createElement('div');
            actions.className = 'note-card-actions';

            const editButton = document.createElement('md-icon-button');
            editButton.innerHTML = `<md-icon>edit</md-icon>`;
            editButton.ariaLabel = 'Edit Note';
            editButton.addEventListener('click', () => openNoteDialog(note));

            const deleteButton = document.createElement('md-icon-button');
            deleteButton.innerHTML = `<md-icon>delete</md-icon>`;
            deleteButton.ariaLabel = 'Delete Note';
            deleteButton.addEventListener('click', () => deleteNote(note.id));

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
        noteForm.reset(); // Clear form
        if (note) {
            currentEditingId = note.id;
            noteIdInput.value = note.id;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            noteDialog.querySelector('[slot="headline"]').textContent = 'Edit Note';
        } else {
            currentEditingId = null;
            noteIdInput.value = '';
            noteDialog.querySelector('[slot="headline"]').textContent = 'Add New Note';
        }
        noteDialog.show();
    }

    function handleFormSubmit() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();

        if (!title || !content) {
            // Basic validation, could be more robust
            alert('Title and content cannot be empty.');
            return;
        }

        if (currentEditingId) {
            // Editing existing note
            const noteIndex = notes.findIndex(n => n.id === currentEditingId);
            if (noteIndex > -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
            }
        } else {
            // Creating new note
            const newNote = {
                id: Date.now().toString(), // Simple unique ID
                title,
                content
            };
            notes.push(newNote);
        }

        saveNotes();
        renderNotes();
        // noteDialog.close(); // Handled by form method="dialog" and button value
    }

    function deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
            renderNotes();
        }
    }

    // --- Event Listeners ---
    addNoteFab.addEventListener('click', () => openNoteDialog());

    // The dialog component handles its own close on button clicks if `form.method="dialog"`
    // and buttons have `value="cancel"` or `form="formId"`.
    // We listen for the 'closed' event to react to the "save" action.
    noteDialog.addEventListener('closed', (event) => {
        if (event.detail.action === 'save') {
            handleFormSubmit();
        }
        // Reset for next time
        currentEditingId = null;
        noteForm.reset();
    });

    // --- Initial Load ---
    loadNotes();
});
