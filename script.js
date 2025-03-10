// API URL
const API_URL = 'https://pinnedthoughts.onrender.com';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
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

// App State
let currentChatId = null;
let chatHistory = [];
let currentTheme = localStorage.getItem('theme') || 'default';
let isTyping = false;
let chatToDelete = null;
let chatToEdit = null;

// Initialize the app
async function initApp() {
    // Load saved theme
    applyTheme(currentTheme);
    highlightActiveTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load available models
    await loadAvailableModels();
    
    // Load chat history
    await loadChats();
    
    // Check if URL has chat ID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat');
    if (chatId) {
        loadChat(chatId);
    }
}

// Event Listeners
function setupEventListeners() {
    // Mobile sidebar toggle
    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
    
    // New chat button
    newChatBtn.addEventListener('click', startNewChat);
    
    // Send message
    sendButton.addEventListener('click', sendMessage);
    
    // Input field events
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '';
    });
    
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
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.remove('active');
        chatToDelete = null;
    });
    
    confirmDeleteBtn.addEventListener('click', async () => {
        if (chatToDelete) {
            await deleteChat(chatToDelete);
            deleteModal.classList.remove('active');
            chatToDelete = null;
        }
    });
    
    cancelEditBtn.addEventListener('click', () => {
        editTitleModal.classList.remove('active');
        chatToEdit = null;
    });
    
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

// Load available models
async function loadAvailableModels() {
    try {
        const response = await fetch(`${API_URL}/models`);
        if (response.ok) {
            const data = await response.json();
            console.log("Available models:", data.models);
            
            // Optional: Dynamically populate model selector
            // if you want to show all available models from the server
            /*
            if (data.models && Object.keys(data.models).length > 0) {
                modelSelect.innerHTML = '';
                Object.entries(data.models).forEach(([key, value]) => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
                    modelSelect.appendChild(option);
                });
            }
            */
        }
    } catch (error) {
        console.error("Error loading models:", error);
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
        }
    } catch (error) {
        console.error("Error loading chats:", error);
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
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tab-action-btn';
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
        const response = await fetch(`${API_URL}/chats/${chatId}/title?title=${encodeURIComponent(newTitle)}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // Update chat in local state
            const chatIndex = chatHistory.findIndex(chat => chat.id === chatId);
            if (chatIndex !== -1) {
                chatHistory[chatIndex].title = newTitle;
                renderChatList(chatHistory);
            }
        }
    } catch (error) {
        console.error("Error updating chat title:", error);
    }
}

// Delete chat
async function deleteChat(chatId) {
    try {
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
                // Update URL
                window.history.pushState({}, document.title, window.location.pathname);
            }
        }
    } catch (error) {
        console.error("Error deleting chat:", error);
    }
}

// Load chat
async function loadChat(chatId) {
    try {
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
            
            // Clear chat container
            chatContainer.innerHTML = '';
            
            // Render messages
            chatData.messages.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    addMessageToUI(msg.content, msg.role === 'user');
                }
            });
            
            // Update model selector to match the chat's model
            if (chatData.model) {
                // Extract the model key from the full model name
                const modelKey = Object.entries(AVAILABLE_MODELS).find(
                    ([key, value]) => value === chatData.model
                )?.[0];
                
                if (modelKey && modelSelect.querySelector(`option[value="${modelKey}"]`)) {
                    modelSelect.value = modelKey;
                } else {
                    // If we can't find a direct match, try a partial match
                    for (const option of modelSelect.options) {
                        if (chatData.model.includes(option.value) || 
                            option.value.includes(chatData.model.split('-')[0])) {
                            modelSelect.value = option.value;
                            break;
                        }
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
            console.error("Error loading chat:", await response.text());
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'ai-message';
            errorDiv.textContent = "Sorry, there was an error loading this conversation.";
            chatContainer.appendChild(errorDiv);
        }
    } catch (error) {
        console.error("Error loading chat:", error);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message';
        errorDiv.textContent = "Sorry, there was an error loading this conversation.";
        chatContainer.appendChild(errorDiv);
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
    sendButton.disabled = true;
    
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
                
                // Hide welcome screen
                welcomeScreen.style.display = 'none';
                
                // Refresh chat list
                await loadChats();
            }
            
            // Remove typing indicator
            removeTypingIndicator();
            
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
        }
    } catch (error) {
        console.error("Error sending message:", error);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Show error message
        addMessageToUI("I'm sorry, there was an error communicating with the server. Please try again later.", false);
    }
    
    // Scroll to bottom
    scrollToBottom();
}

// Add message to UI
function addMessageToUI(message, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'ai-message';
    
    // Add random rotation for pinned effect
    const rotation = isUser ? Math.random() * 2 : Math.random() * -2;
    messageDiv.style.setProperty('--rotate-deg', `${rotation}deg`);
    
    // Get current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedTime = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    // Set message content
    messageDiv.textContent = message;
    
    // Add time element
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formattedTime;
    messageDiv.appendChild(timeDiv);
    
    // Add to chat container
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
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
    scrollToBottom();
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
    const rotation = Math.random() * -2;
    messageDiv.style.setProperty('--rotate-deg', `${rotation}deg`);
    
    // Get current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedTime = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    // Create text container and time element
    const textSpan = document.createElement('span');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formattedTime;
    
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeDiv);
    
    // Add to chat container
    chatContainer.appendChild(messageDiv);
    
    // Type out each character
    for (let i = 0; i < response.length; i++) {
        textSpan.textContent += response[i];
        scrollToBottom();
        
        // Randomize typing speed slightly for natural effect
        const delay = 15 + Math.random() * 10;
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

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);
