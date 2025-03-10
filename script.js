// API URL
const API_URL = 'https://pinnedthoughts.onrender.com';

// DOM Elements
const appContainer = document.getElementById('app-container');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const mobileNewChatBtn = document.getElementById('mobile-new-chat');
const modelSelect = document.getElementById('model-select');
const chatList = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');
const welcomeScreen = document.getElementById('welcome-screen');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const editTitleModal = document.getElementById('edit-title-modal');
const editTitleInput = document.getElementById('edit-title-input');
const cancelEditBtn = document.getElementById('cancel-edit');
const confirmEditBtn = document.getElementById('confirm-edit');
const loader = document.getElementById('loader');
const toastContainer = document.getElementById('toast-container');
const themeDots = document.querySelectorAll('.theme-dot');
const suggestionButtons = document.querySelectorAll('.suggestion');

// App State
let currentChatId = null;
let chatHistory = [];
let currentTheme = localStorage.getItem('theme') || 'default';
let isTyping = false;
let chatToDelete = null;
let chatToEdit = null;

// Available models
const AVAILABLE_MODELS = {
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192",
    "mixtral-8x7b": "mixtral-8x7b-32768",
    "llama3-3-70b": "llama-3.3-70b-versatile",
    "deepseek-70b": "deepseek-r1-distill-llama-70b"
};

// Initialize the app
async function initApp() {
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Setup event listeners
    setupEventListeners();
    
    try {
        // Show loader
        showLoader();
        
        // Load chats
        await loadChats();
        
        // Check URL for chat ID
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chat');
        if (chatId) {
            await loadChat(chatId);
        } else {
            // Show welcome screen
            welcomeScreen.style.display = 'flex';
            messagesContainer.innerHTML = '';
        }
        
        // Hide loader
        hideLoader();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Failed to initialize the app. Please refresh the page.', 'error');
        hideLoader();
    }
}

// Setup event listeners
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
    
    // New chat buttons
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
    
    // Message input
    if (messageInput) {
        // Send on Enter (not Shift+Enter)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto-resize textarea and enable/disable send button
        messageInput.addEventListener('input', () => {
            // Auto-resize
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
            
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
            
            // Update active state
            themeDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });
    
    // Delete modal
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
    
    // Edit title modal
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
    
    // Suggestion buttons
    suggestionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            if (text) {
                messageInput.value = text;
                messageInput.dispatchEvent(new Event('input'));
                messageInput.focus();
            }
        });
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Load chats
async function loadChats() {
    try {
        const response = await fetch(`${API_URL}/chats`);
        if (!response.ok) {
            throw new Error('Failed to load chats');
        }
        
        const chats = await response.json();
        chatHistory = chats;
        renderChatList(chats);
    } catch (error) {
        console.error('Error loading chats:', error);
        showToast('Failed to load chat history', 'error');
        throw error;
    }
}

// Render chat list
function renderChatList(chats) {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-chats';
        emptyMessage.textContent = 'No conversations yet';
        chatList.appendChild(emptyMessage);
        return;
    }
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (currentChatId === chat.id) {
            chatItem.classList.add('active');
        }
        
        chatItem.setAttribute('data-id', chat.id);
        chatItem.textContent = chat.title;
        
        // Add action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'chat-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.title = 'Edit title';
        editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.title = 'Delete conversation';
        deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        chatItem.appendChild(actionsDiv);
        
        // Add event listeners
        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
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
        
        chatList.appendChild(chatItem);
    });
}

// Show delete modal
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
        
        if (!response.ok) {
            throw new Error('Failed to update title');
        }
        
        // Update chat in local state
        const chatIndex = chatHistory.findIndex(chat => chat.id === chatId);
        if (chatIndex !== -1) {
            chatHistory[chatIndex].title = newTitle;
            renderChatList(chatHistory);
            showToast('Title updated successfully', 'success');
        }
    } catch (error) {
        console.error('Error updating chat title:', error);
        showToast('Failed to update title', 'error');
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
        
        if (!response.ok) {
            throw new Error('Failed to delete chat');
        }
        
        // Remove chat from local state
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        renderChatList(chatHistory);
        
        // If deleted chat was active, go back to welcome screen
        if (currentChatId === chatId) {
            currentChatId = null;
            messagesContainer.innerHTML = '';
            welcomeScreen.style.display = 'flex';
            // Update URL
            window.history.pushState({}, document.title, window.location.pathname);
        }
        
        showToast('Conversation deleted', 'success');
    } catch (error) {
        console.error('Error deleting chat:', error);
        showToast('Failed to delete conversation', 'error');
    } finally {
        hideLoader();
    }
}

// Load chat
async function loadChat(chatId) {
    try {
        showLoader();
        const response = await fetch(`${API_URL}/chats/${chatId}`);
        if (!response.ok) {
            throw new Error('Failed to load chat');
        }
        
        const chatData = await response.json();
        
        // Update current chat ID
        currentChatId = chatId;
        
        // Update URL
        window.history.pushState({}, document.title, `?chat=${chatId}`);
        
        // Update active chat in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-id') === chatId) {
                item.classList.add('active');
            }
        });
        
        // Hide welcome screen
        welcomeScreen.style.display = 'none';
        
        // Clear messages container
        messagesContainer.innerHTML = '';
        
        // Render messages
        chatData.messages.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                addMessageToUI(msg.content, msg.role === 'user', false);
            }
        });
        
        // Update model selector
        if (chatData.model) {
            for (const option of modelSelect.options) {
                if (chatData.model.includes(option.value)) {
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
    } catch (error) {
        console.error('Error loading chat:', error);
        showToast('Failed to load conversation', 'error');
    } finally {
        hideLoader();
    }
}

// Start new chat
function startNewChat() {
    // Clear current chat
    currentChatId = null;
    
    // Update URL
    window.history.pushState({}, document.title, window.location.pathname);
    
    // Clear active state in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Clear messages
    messagesContainer.innerHTML = '';
    
    // Show welcome screen
    welcomeScreen.style.display = 'flex';
    
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
    
    // Add user message to UI
    addMessageToUI(message, true);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendButton.disabled = true;
    
    // Hide welcome screen if visible
    if (welcomeScreen.style.display === 'flex') {
        welcomeScreen.style.display = 'none';
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
        
        if (!response.ok) {
            throw new Error('Failed to get response from server');
        }
        
        const data = await response.json();
        
        // Update current chat ID if this was a new chat
        if (!currentChatId) {
            currentChatId = data.chat_id;
            
            // Update URL
            window.history.pushState({}, document.title, `?chat=${currentChatId}`);
            
            // Refresh chat list
            await loadChats();
        }
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to UI
        typeOutResponse(data.response);
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Show error message
        addMessageToUI('Sorry, there was an error processing your request. Please try again.', false);
        showToast('Failed to get response from AI', 'error');
    }
    
    // Focus on input for next message
    messageInput.focus();
}

// Add message to UI
function addMessageToUI(message, isUser, animate = true) {
    const messageEl = document.createElement('div');
    messageEl.className = isUser ? 'message user-message' : 'message ai-message';
    
    // Add random rotation for pinned effect
    const rotation = (Math.random() * 2 - 1).toFixed(2);
    messageEl.style.transform = `rotate(${rotation}deg)`;
    
    // Message content
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = message;
    messageEl.appendChild(contentEl);
    
    // Message time
    const now = new Date();
    const timeEl = document.createElement('div');
    timeEl.className = 'message-time';
    timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    messageEl.appendChild(timeEl);
    
    // Add to container
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    isTyping = true;
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        indicator.appendChild(dot);
    }
    
    messagesContainer.appendChild(indicator);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
    isTyping = false;
}

// Type out response with animation
async function typeOutResponse(response) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message ai-message';
    
    // Add random rotation for pinned effect
    const rotation = (Math.random() * 2 - 1).toFixed(2);
    messageEl.style.transform = `rotate(${rotation}deg)`;
    
    // Message content
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    messageEl.appendChild(contentEl);
    
    // Message time
    const now = new Date();
    const timeEl = document.createElement('div');
    timeEl.className = 'message-time';
    timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    messageEl.appendChild(timeEl);
    
    // Add to container
    messagesContainer.appendChild(messageEl);
    
    // Type out text
    for (let i = 0; i < response.length; i++) {
        contentEl.textContent += response[i];
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

// Scroll to bottom
function scrollToBottom() {
    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Show/hide loader
function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

// Apply theme
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    
    // Update active state of theme dots
    themeDots.forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-theme') === theme) {
            dot.classList.add('active');
        }
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);
