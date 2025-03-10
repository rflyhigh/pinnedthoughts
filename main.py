from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import os
import time
import httpx
import json
import asyncio
import uuid
from datetime import datetime
import threading

app = FastAPI(title="Pinned Thoughts API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# GROQ API configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
AVAILABLE_MODELS = {
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192",
    "mixtral-8x7b": "mixtral-8x7b-32768",
    "gemma-7b": "gemma-7b-it"
}
DEFAULT_MODEL = "llama3-8b-8192"

# Database setup
DB_PATH = "pinned_thoughts.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create chats table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT,
        model TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    )
    ''')
    
    # Create messages table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        role TEXT,
        content TEXT,
        timestamp TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    model: Optional[str] = None

class CreateChatResponse(BaseModel):
    chat_id: str
    title: str

class MessageResponse(BaseModel):
    chat_id: str
    message: str
    response: str

class Chat(BaseModel):
    id: str
    title: str
    model: str
    created_at: str
    updated_at: str
    message_count: int

class ChatDetail(BaseModel):
    id: str
    title: str
    model: str
    created_at: str
    updated_at: str
    messages: List[Message]

# Initialize database
init_db()

# Health check ping
def start_health_ping():
    async def ping_health():
        async with httpx.AsyncClient() as client:
            while True:
                try:
                    await client.get("https://pinnedthoughts.onrender.com/health")
                    print("Health ping sent")
                except Exception as e:
                    print(f"Health ping failed: {e}")
                await asyncio.sleep(600)  # 10 minutes

    # Start the ping in a separate thread
    threading.Thread(target=lambda: asyncio.run(ping_health()), daemon=True).start()

# Start the health ping on startup
@app.on_event("startup")
async def startup_event():
    start_health_ping()

# Helper functions
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

async def generate_title(message: str, model: str) -> str:
    """Generate a title for a chat based on the first message"""
    prompt = f"Based on this message, create a very short title (3-5 words max): '{message}'"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that generates short, descriptive titles."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 10
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            return "New Conversation"
        
        result = response.json()
        title = result["choices"][0]["message"]["content"].strip().strip('"')
        
        # Limit title length
        if len(title) > 30:
            title = title[:27] + "..."
            
        return title

async def get_ai_response(messages: List[Dict[str, str]], model: str) -> str:
    """Get a response from the GROQ API"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to get response from AI model")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]

# Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/models")
async def get_available_models():
    """Get available models"""
    return {"models": AVAILABLE_MODELS}

@app.post("/chat", response_model=MessageResponse)
async def chat(request: ChatRequest):
    """Send a message and get a response"""
    conn = get_db_connection()
    
    model_id = AVAILABLE_MODELS.get(request.model, DEFAULT_MODEL) if request.model else DEFAULT_MODEL
    
    try:
        # Handle new or existing chat
        if not request.chat_id:
            # Create a new chat
            chat_id = str(uuid.uuid4())
            title = await generate_title(request.message, model_id)
            now = datetime.now().isoformat()
            
            conn.execute(
                "INSERT INTO chats (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (chat_id, title, model_id, now, now)
            )
        else:
            # Check if chat exists
            chat = conn.execute("SELECT * FROM chats WHERE id = ?", (request.chat_id,)).fetchone()
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            
            chat_id = request.chat_id
            # Update the chat's updated_at timestamp
            conn.execute(
                "UPDATE chats SET updated_at = ? WHERE id = ?",
                (datetime.now().isoformat(), chat_id)
            )
        
        # Get message history for context
        message_rows = conn.execute(
            "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp",
            (chat_id,)
        ).fetchall()
        
        messages = [{"role": row["role"], "content": row["content"]} for row in message_rows]
        
        # Add system message for context if this is the first message
        if not messages:
            messages.append({
                "role": "system", 
                "content": "You are a thoughtful assistant engaging in deep, meaningful conversations. Provide insightful, nuanced responses that encourage reflection."
            })
        
        # Add the new user message
        messages.append({"role": "user", "content": request.message})
        
        # Save user message to database
        now = datetime.now().isoformat()
        conn.execute(
            "INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), chat_id, "user", request.message, now)
        )
        
        # Get AI response
        ai_response = await get_ai_response(messages, model_id)
        
        # Save AI response to database
        conn.execute(
            "INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), chat_id, "assistant", ai_response, datetime.now().isoformat())
        )
        
        conn.commit()
        
        return {
            "chat_id": chat_id,
            "message": request.message,
            "response": ai_response
        }
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()

@app.get("/chats", response_model=List[Chat])
async def get_chats():
    """Get all chats"""
    conn = get_db_connection()
    
    try:
        # Get chats with message count
        chats = conn.execute("""
            SELECT c.*, COUNT(m.id) as message_count
            FROM chats c
            LEFT JOIN messages m ON c.id = m.chat_id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """).fetchall()
        
        return [{
            "id": chat["id"],
            "title": chat["title"],
            "model": chat["model"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"],
            "message_count": chat["message_count"]
        } for chat in chats]
    
    finally:
        conn.close()

@app.get("/chats/{chat_id}", response_model=ChatDetail)
async def get_chat(chat_id: str):
    """Get a specific chat with all messages"""
    conn = get_db_connection()
    
    try:
        # Get chat
        chat = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get messages
        messages = conn.execute(
            "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp",
            (chat_id,)
        ).fetchall()
        
        return {
            "id": chat["id"],
            "title": chat["title"],
            "model": chat["model"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"],
            "messages": [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        }
    
    finally:
        conn.close()

@app.put("/chats/{chat_id}/title")
async def update_chat_title(chat_id: str, title: str):
    """Update a chat's title"""
    conn = get_db_connection()
    
    try:
        # Check if chat exists
        chat = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Update title
        conn.execute(
            "UPDATE chats SET title = ? WHERE id = ?",
            (title, chat_id)
        )
        
        conn.commit()
        return {"success": True, "title": title}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat and all its messages"""
    conn = get_db_connection()
    
    try:
        # Check if chat exists
        chat = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Delete messages first (due to foreign key constraint)
        conn.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id,))
        
        # Delete chat
        conn.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        
        conn.commit()
        return {"success": True}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
