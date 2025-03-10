// API URL
const API_URL = 'https://pinnedthoughts.onrender.com';

// DOM Elements
const loader = document.getElementById('loader');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const mobileNewChatBtn = document.getElementById('mobile-new-chat');
const modelSelect = document.getElementById('model-select');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatList = document.getElementById('chat-list');
const welcomeScreen = document.getElementById('welcome-screen');
const themeDots = document.querySelectorAll('.theme-dot');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const editTitleModal = document.getElementById('edit-title-modal');
const editTitleInput = document.getElementById('edit-title-input');
const cancelEditBtn = document.getElementById('cancel-edit');
const confirmEditBtn = document.getElementById('confirm-edit');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-button');
const saveSettingsBtn = document.getElementById('save-settings');
const fontSizeSelect = document.getElementById('font-size');
const typingSpeedSelect = document.getElementById('typing-speed');
const autoScrollToggle = document.getElementById('auto-scroll');
const soundEffectsToggle = document.getElementById('sound-effects');
const searchInput = document.getElementById('search-chats');
const currentChatTitle = document.getElementById('current-chat-title');
const editTitleBtn = document.getElementById('edit-title-btn');
const exportChatBtn = document.getElementById('export-chat-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const chatHeader = document.getElementById('chat-header');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const modalCloseButtons = document.querySelectorAll('.modal-close');
const toastContainer = document.getElementById('toast-container');

// App State
let currentChatId = null;
let chatHistory = [];
let currentTheme = localStorage.getItem('theme') || 'default';
let isTyping = false;
let chatToDelete = null;
let chatToEdit = null;
let settings = {
    fontSize: localStorage.getItem('fontSize') || 'medium',
    typingSpeed: localStorage.getItem('typingSpeed') || 'medium',
    autoScroll: localStorage.getItem('autoScroll') !== 'false',
    soundEffects: localStorage.getItem('soundEffects') === 'true'
};

// Sound effects
const sendSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
const receiveSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');

// Initialize the app
async function initApp() {
    // Apply settings
    applySettings();
    
    // Load saved theme
    applyTheme(currentTheme);
    highlightActiveTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    try {
        // Load available models
        await loadAvailableModels();
        
        // Load chat history
        await loadChats();
        
        // Check if URL has chat ID parameter
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chat');
        if (chatId) {
            await loadChat(chatId);
        } else {
            // Show welcome screen
            welcomeScreen.style.display = 'flex';
            chatHeader.style.display = 'none';
        }
        
        // Hide loader
        hideLoader();
        try {
        // Only attempt fullscreen after user interaction (like a click)
        // This is because browsers require user interaction before allowing fullscreen
        const tryFullscreen = () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
            document.removeEventListener('click', tryFullscreen);
        };
        
        // Add a one-time click event listener
        document.addEventListener('click', tryFullscreen, { once: true });
    } catch (error) {
        console.error("Could not enter fullscreen mode:", error);
    }

    } catch (error) {
        console.error("Error initializing app:", error);
        showToast("Failed to initialize app. Please refresh the page.", "error");
        hideLoader();
    }
}

// Show/hide loader
function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
        loader.style.opacity = '1';
    }, 500);
}

// Apply settings
function applySettings() {
    // Apply font size
    document.body.setAttribute('data-font-size', settings.fontSize);
    if (fontSizeSelect) fontSizeSelect.value = settings.fontSize;
    
    // Apply typing speed
    document.body.setAttribute('data-typing-speed', settings.typingSpeed);
    if (typingSpeedSelect) typingSpeedSelect.value = settings.typingSpeed;
    
    // Apply auto-scroll
    if (autoScrollToggle) autoScrollToggle.checked = settings.autoScroll;
    
    // Apply sound effects
    if (soundEffectsToggle) soundEffectsToggle.checked = settings.soundEffects;
}
// Fullscreen functionality
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Add this to the setupEventListeners function
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
}

// Toggle fullscreen function
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) { // Firefox
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
            document.documentElement.msRequestFullscreen();
        }
        
        // Change icon to exit fullscreen
        fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
        
        // Change icon back to enter fullscreen
        fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
    }
}

// Listen for fullscreen change events
document.addEventListener('fullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('mozfullscreenchange', updateFullscreenButtonIcon);
document.addEventListener('MSFullscreenChange', updateFullscreenButtonIcon);

// Update the fullscreen button icon based on fullscreen state
function updateFullscreenButtonIcon() {
    if (document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement ||
        document.msFullscreenElement) {
        // We're in fullscreen mode
        fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';
    } else {
        // We're not in fullscreen mode
        fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
    }
}

// Event Listeners
function setupEventListeners() {
    // Mobile sidebar toggle
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    // New chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    
    if (mobileNewChatBtn) {
        mobileNewChatBtn.addEventListener('click', startNewChat);
    }
    
    // Send message
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Input field events
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            // Auto-resize the textarea
            messageInput.style.height = 'auto';
            messageInput.style.height = (messageInput.scrollHeight) + 'px';
            
            // Enable/disable send button
            sendButton.disabled = messageInput.value.trim() === '';
        });
    }
    
    // Theme selector
    themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            applyTheme(theme);
            localStorage.setItem('theme', theme);
            highlightActiveTheme();
        });
    });
    
    // Modal events
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.classList.remove('active');
            chatToDelete = null;
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (chatToDelete) {
                await deleteChat(chatToDelete);
                deleteModal.classList.remove('active');
                chatToDelete = null;
            }
        });
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editTitleModal.classList.remove('active');
            chatToEdit = null;
        });
    }
    
    if (confirmEditBtn) {
        confirmEditBtn.addEventListener('click', async () => {
            if (chatToEdit) {
                const newTitle = editTitleInput.value.trim();
                if (newTitle) {
                    await updateChatTitle(chatToEdit, newTitle);
                    editTitleModal.classList.remove('active');
                    chatToEdit = null;
                }
            }
        });
    }
    
    // Settings modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
        });
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            settingsModal.classList.remove('active');
        });
    }
    
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterChats(searchInput.value.trim().toLowerCase());
        });
    }
    
    // Edit title button
    if (editTitleBtn) {
        editTitleBtn.addEventListener('click', () => {
            if (currentChatId) {
                showEditTitleModal(currentChatId, currentChatTitle.textContent);
            }
        });
    }
    
    // Export chat button
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', () => {
            if (currentChatId) {
                exportChat(currentChatId);
            }
        });
    }
    
    // Clear chat button
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (currentChatId) {
                showDeleteModal(currentChatId);
            }
        });
    }
    
    // Suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.getAttribute('data-text');
            if (text && messageInput) {
                messageInput.value = text;
                messageInput.dispatchEvent(new Event('input'));
                messageInput.focus();
            }
        });
    });
    
    // Close all modals when clicking the X button
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Save settings
function saveSettings() {
    settings.fontSize = fontSizeSelect.value;
    settings.typingSpeed = typingSpeedSelect.value;
    settings.autoScroll = autoScrollToggle.checked;
    settings.soundEffects = soundEffectsToggle.checked;
    
    // Save to localStorage
    localStorage.setItem('fontSize', settings.fontSize);
    localStorage.setItem('typingSpeed', settings.typingSpeed);
    localStorage.setItem('autoScroll', settings.autoScroll);
    localStorage.setItem('soundEffects', settings.soundEffects);
    
    // Apply settings
    applySettings();
    
    // Show confirmation
    showToast("Settings saved successfully", "success");
}

// Filter chats based on search input
function filterChats(query) {
    const chatTabs = document.querySelectorAll('.folder-tab');
    
    if (!query) {
        chatTabs.forEach(tab => {
            tab.style.display = 'flex';
        });
        return;
    }
    
    chatTabs.forEach(tab => {
        const title = tab.querySelector('.tab-title').textContent.toLowerCase();
        if (title.includes(query)) {
            tab.style.display = 'flex';
        } else {
            tab.style.display = 'none';
        }
    });
}

// Load available models
async function loadAvailableModels() {
    try {
        const response = await fetch(`${API_URL}/models`);
        if (response.ok) {
            const data = await response.json();
            console.log("Available models:", data.models);
        }
    } catch (error) {
        console.error("Error loading models:", error);
        throw error;
    }
}

// Load chat history
async function loadChats() {
    try {
        const response = await fetch(`${API_URL}/chats`);
        if (response.ok) {
            const chats = await response.json();
            chatHistory = chats;
            renderChatList(chats);
        } else {
            throw new Error("Failed to load chats");
        }
    } catch (error) {
        console.error("Error loading chats:", error);
        showToast("Failed to load chat history", "error");
        throw error;
    }
}

// Render chat list in sidebar
function renderChatList(chats) {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-chats-message';
        emptyMessage.textContent = 'No conversations yet';
        chatList.appendChild(emptyMessage);
        return;
    }
    
    chats.forEach(chat => {
        const chatTab = document.createElement('div');
        chatTab.className = 'folder-tab';
        if (currentChatId === chat.id) {
            chatTab.classList.add('active');
        }
        
        chatTab.setAttribute('data-id', chat.id);
        
        // Create title container to allow text truncation
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = chat.title;
        chatTab.appendChild(titleSpan);
        
        // Add action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'tab-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'tab-action-btn';
        editBtn.title = "Edit title";
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tab-action-btn';
        deleteBtn.title = "Delete conversation";
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        chatTab.appendChild(actionsDiv);
        
        // Add event listeners
        chatTab.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-action-btn')) {
                loadChat(chat.id);
            }
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEditTitleModal(chat.id, chat.title);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteModal(chat.id);
        });
        
        chatList.appendChild(chatTab);
    });
}

// Show delete confirmation modal
function showDeleteModal(chatId) {
    chatToDelete = chatId;
    deleteModal.classList.add('active');
}

// Show edit title modal
function showEditTitleModal(chatId, currentTitle) {
    chatToEdit = chatId;
    editTitleInput.value = currentTitle;
    editTitleModal.classList.add('active');
    setTimeout(() => editTitleInput.focus(), 100);
}

// Update chat title
async function updateChatTitle(chatId, newTitle) {
    try {
        showLoader();
        const response = await fetch(`${API_URL}/chats/${chatId}/title?title=${encodeURIComponent(newTitle)}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // Update chat in local state
            const chatIndex = chatHistory.findIndex(chat => chat.id === chatId);
            if (chatIndex !== -1) {
                chatHistory[chatIndex].title = newTitle;
                renderChatList(chatHistory);
                
                // Update current chat title if this is the active chat
                if (currentChatId === chatId) {
                    currentChatTitle.textContent = newTitle;
                }
                
                showToast("Title updated successfully", "success");
            }
        } else {
            throw new Error("Failed to update title");
        }
    } catch (error) {
        console.error("Error updating chat title:", error);
        showToast("Failed to update title", "error");
    } finally {
        hideLoader();
    }
}

// Delete chat
async function deleteChat(chatId) {
    try {
        showLoader();
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Remove chat from local state
            chatHistory = chatHistory.filter(chat => chat.id !== chatId);
            renderChatList(chatHistory);
            
            // If the deleted chat was active, go back to welcome screen
            if (currentChatId === chatId) {
                currentChatId = null;
                chatContainer.innerHTML = '';
                welcomeScreen.style.display = 'flex';
                chatHeader.style.display = 'none';
                // Update URL
                window.history.pushState({}, document.title, window.location.pathname);
            }
            
            showToast("Conversation deleted", "success");
        } else {
            throw new Error("Failed to delete chat");
        }
    } catch (error) {
        console.error("Error deleting chat:", error);
        showToast("Failed to delete conversation", "error");
    } finally {
        hideLoader();
    }
}

// Export chat
async function exportChat(chatId) {
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch chat data");
        }
        
        const chatData = await response.json();
        
        // Format the chat data
        let exportText = `# ${chatData.title}\n`;
        exportText += `Exported on: ${new Date().toLocaleString()}\n\n`;
        
        chatData.messages.forEach(msg => {
            if (msg.role === 'user') {
                exportText += `## You:\n${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
                exportText += `## AI:\n${msg.content}\n\n`;
            }
        });
        
        // Create a download link
        const blob = new Blob([exportText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chatData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast("Conversation exported successfully", "success");
    } catch (error) {
        console.error("Error exporting chat:", error);
        showToast("Failed to export conversation", "error");
    }
}

// Load chat
async function loadChat(chatId) {
    try {
        showLoader();
        const response = await fetch(`${API_URL}/chats/${chatId}`);
        if (response.ok) {
            const chatData = await response.json();
            
            // Update current chat ID
            currentChatId = chatId;
            
            // Update URL with chat ID
            window.history.pushState({}, document.title, `?chat=${chatId}`);
            
            // Update active chat in sidebar
            document.querySelectorAll('.folder-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-id') === chatId) {
                    tab.classList.add('active');
                }
            });
            
            // Hide welcome screen
            welcomeScreen.style.display = 'none';
            
            // Show chat header
            chatHeader.style.display = 'flex';
            
            // Update chat title
            currentChatTitle.textContent = chatData.title;
            
            // Clear chat container
            chatContainer.innerHTML = '';
            
            // Render messages
            chatData.messages.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    addMessageToUI(msg.content, msg.role === 'user', false);
                }
            });
            
            // Update model selector if needed
            if (chatData.model) {
                // Extract the model key from the full model name
                for (const option of modelSelect.options) {
                    if (chatData.model.includes(option.value) || 
                        option.value.includes(chatData.model.split('-')[0])) {
                        modelSelect.value = option.value;
                        break;
                    }
                }
            }
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
            
            // Scroll to bottom
            scrollToBottom();
        } else {
            throw new Error("Failed to load chat");
        }
    } catch (error) {
        console.error("Error loading chat:", error);
        showToast("Failed to load conversation", "error");
    } finally {
        hideLoader();
    }
}

// Start a new chat
function startNewChat() {
    // Clear current chat
    currentChatId = null;
    
    // Update URL
    window.history.pushState({}, document.title, window.location.pathname);
    
    // Clear active state in sidebar
    document.querySelectorAll('.folder-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Clear chat container
    chatContainer.innerHTML = '';
    
    // Show welcome screen
    welcomeScreen.style.display = 'flex';
    
    // Hide chat header
    chatHeader.style.display = 'none';
    
    // Focus on input
    messageInput.focus();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;
    
    // Play send sound if enabled
    if (settings.soundEffects) {
        sendSound.play();
    }
    
    // Add user message to UI
    addMessageToUI(message, true);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendButton.disabled = true;
    
    // Hide welcome screen if visible
    if (welcomeScreen.style.display === 'flex') {
        welcomeScreen.style.display = 'none';
        chatHeader.style.display = 'flex';
        currentChatTitle.textContent = "New Conversation";
    }
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Send to API
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                chat_id: currentChatId,
                model: modelSelect.value
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update current chat ID if this was a new chat
            if (!currentChatId) {
                currentChatId = data.chat_id;
                
                // Update URL with chat ID
                window.history.pushState({}, document.title, `?chat=${currentChatId}`);
                
                // Update title
                currentChatTitle.textContent = "New Conversation";
                
                // Refresh chat list
                await loadChats();
                
                // Find the current chat to get its title
                const currentChat = chatHistory.find(chat => chat.id === currentChatId);
                if (currentChat) {
                    currentChatTitle.textContent = currentChat.title;
                }
            }
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Play receive sound if enabled
            if (settings.soundEffects) {
                receiveSound.play();
            }
            
            // Type out the AI response with animation
            typeOutResponse(data.response);
        } else {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Try to get error details
            let errorMessage = "I'm sorry, I couldn't process your request. Please try again.";
            try {
                const errorData = await response.json();
                if (errorData && errorData.detail) {
                    errorMessage = `Error: ${errorData.detail}`;
                    console.error("API Error:", errorData.detail);
                }
            } catch (e) {
                // If we can't parse the error response, use the default message
                console.error("Error parsing API error:", e);
            }
            
            // Show error message
            addMessageToUI(errorMessage, false);
            showToast("Failed to get AI response", "error");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Show error message
        addMessageToUI("I'm sorry, there was an error communicating with the server. Please try again later.", false);
        showToast("Network error. Please check your connection.", "error");
    }
    
    // Focus input for next message
    messageInput.focus();
}

// Add message to UI
function addMessageToUI(message, isUser, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'ai-message';
    
    // Add random rotation for pinned effect
    const rotation = isUser ? Math.random() * 2 - 1 : Math.random() * 2 - 1;
    messageDiv.style.transform = `rotate(${rotation}deg)`;
    
    // Get current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedTime = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    // Create message content span
    const contentSpan = document.createElement('span');
    contentSpan.className = 'message-content';
    contentSpan.textContent = message;
    messageDiv.appendChild(contentSpan);
    
    // Add time element
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formattedTime;
    messageDiv.appendChild(timeDiv);
    
    // Add to chat container
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom if auto-scroll is enabled
    if (settings.autoScroll) {
        scrollToBottom();
    }
}

// Show typing indicator
function showTypingIndicator() {
    isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    
    chatContainer.appendChild(typingDiv);
    if (settings.autoScroll) {
        scrollToBottom();
    }
}

// Remove typing indicator
function removeTypingIndicator() {
    isTyping = false;
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Type out response with animation
async function typeOutResponse(response) {
    // Create message div
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    
    // Add random rotation for pinned effect
    const rotation = Math.random() * 2 - 1;
    messageDiv.style.transform = `rotate(${rotation}deg)`;
    
    // Get current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedTime = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    // Create text container and time element
    const contentSpan = document.createElement('span');
    contentSpan.className = 'message-content';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formattedTime;
    
    messageDiv.appendChild(contentSpan);
    messageDiv.appendChild(timeDiv);
    
    // Add to chat container
    chatContainer.appendChild(messageDiv);
    
    // Calculate typing speed based on settings
    const baseDelay = 15;
    const multiplier = parseFloat(settings.typingSpeed === 'fast' ? 0.5 : settings.typingSpeed === 'slow' ? 2 : 1);
    
    // Type out each character
    for (let i = 0; i < response.length; i++) {
        contentSpan.textContent += response[i];
        
        if (settings.autoScroll) {
            scrollToBottom();
        }
        
        // Randomize typing speed slightly for natural effect
        const delay = (baseDelay + Math.random() * 10) * multiplier;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    isTyping = false;
}

// Scroll chat to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Apply theme
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    currentTheme = theme;
}

// Highlight active theme
function highlightActiveTheme() {
    themeDots.forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-theme') === currentTheme) {
            dot.classList.add('active');
        }
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = '';
    let title = '';
    
    switch (type) {
        case 'success':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            title = 'Success';
            break;
        case 'error':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            title = 'Error';
            break;
                case 'warning':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            title = 'Warning';
            break;
        default:
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            title = 'Info';
    }
    
    // Create toast structure
    const iconDiv = document.createElement('div');
    iconDiv.className = 'toast-icon';
    iconDiv.innerHTML = icon;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'toast-content';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'toast-title';
    titleDiv.textContent = title;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.textContent = message;
    
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(messageDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    });
    
    toast.appendChild(iconDiv);
    toast.appendChild(contentDiv);
    toast.appendChild(closeBtn);
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Handle window resize
window.addEventListener('resize', () => {
    // Adjust textarea height on window resize
    if (messageInput) {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    }
});

// Available models helper
const AVAILABLE_MODELS = {
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192",
    "mixtral-8x7b": "mixtral-8x7b-32768",
    "llama3-3-70b": "llama-3.3-70b-versatile",
    "deepseek-70b": "deepseek-r1-distill-llama-70b"
};

// Initialize the app when DOM is loaded
window.addEventListener('DOMContentLoaded', initApp);
