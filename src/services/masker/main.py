try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    app = FastAPI()
except ImportError:
    # Mock for testing environment without fastapi
    class FastAPI:
        def post(self, path):
            def decorator(func): return func
            return decorator
    class BaseModel: pass
    app = FastAPI()
    print("WARNING: FastAPI not found. Running in Logic-Only mode.")

import logging
from typing import List, Optional
# Mock imports for MVP environment where we can't install heavy ML libs
# In production:
# import chromadb
# from sentence_transformers import SentenceTransformer

app = FastAPI()

# --- MOCK INFRASTRUCTURE (MVP) ---
# Since we cannot run actual Chroma/SentenceTransformers in this constrained agent environment,
# we will mock the logic to demonstrate the ARCHITECTURE.

class MockChromaClient:
    def __init__(self):
        self.collections = {}
    
    def get_or_create_collection(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.data = [] # List of {id, embedding, document, metadata}
        
    def add(self, documents, metadatas, ids, embeddings):
        for doc, meta, id_, emb in zip(documents, metadatas, ids, embeddings):
            self.data.append({"id": id_, "embedding": emb, "document": doc, "metadata": meta})
            
    def query(self, query_embeddings, n_results=1):
        # Mock semantic search: just return the last added item if exists
        if not self.data:
            return {"documents": [[]], "metadatas": [[]], "ids": [[]]}
        
        # Simplified "search" - return all for now or last matches
        results = [x["document"] for x in self.data[-n_results:]]
        metas = [x["metadata"] for x in self.data[-n_results:]]
        ids = [x["id"] for x in self.data[-n_results:]]
        return {"documents": [results], "metadatas": [metas], "ids": [ids]}

# Initialize Mock Components
chroma_client = MockChromaClient()
collection = chroma_client.get_or_create_collection("knowledge_hub")

# Mock Embedding Function (Locally running in prod)
def local_embed(text: str) -> List[float]:
    # In prod: return model.encode(text).tolist()
    return [0.1, 0.2, 0.3] * 128 # Fake 384-dim vector

# --- END MOCK ---

class MemoryItem(BaseModel):
    text: str
    context: str = "GLOBAL"
    importance: str = "medium" # hot/cold storage hook

class RetrieveRequest(BaseModel):
    query: str
    context: str = "GLOBAL"

@app.post("/memory/add")
def add_memory(item: MemoryItem):
    """
    Double-Blind Pipeline:
    1. Mask Input (Clean PII)
    2. Embed locally (Masked text -> Vector)
    3. Store in ChromaDB (Hot Store)
    """
    # 1. Masking (Reusing logic from Day 2 mock)
    # Ideally we call an internal function, not the API endpoint to avoid network overhead
    masked_text = mock_mask_logic(item.text, item.context)
    
    # 2. Local Embedding
    vector = local_embed(masked_text)
    
    # 3. Store
    import uuid
    doc_id = str(uuid.uuid4())
    collection.add(
        documents=[masked_text],
        metadatas=[{"context": item.context, "original_mask_map_id": "TODO"}], # Link to identity map if needed
        ids=[doc_id],
        embeddings=[vector]
    )
    
    return {"status": "stored", "id": doc_id, "masked_content": masked_text}

@app.post("/memory/retrieve")
def retrieve_memory(req: RetrieveRequest):
    """
    Push-Only RAG:
    1. Mask Query
    2. Embed Query
    3. Search
    """
    masked_query = mock_mask_logic(req.query, req.context)
    query_vector = local_embed(masked_query)
    
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=3
    )
    
    return {"results": results["documents"][0]}


import unicodedata

def sanitize_input(text: str) -> str:
    """
    Anti-Malice Layer (Task 13):
    1. Normalizes Unicode (NFKC) to prevent homograph attacks.
    2. Strips invisible control characters (Cf, Cc) except newlines/tabs.
    3. Tokenizes Emojis and Symbols (So) to prevent 'Prompt Smuggling'.
    """
    # 1. Normalization
    normalized = unicodedata.normalize('NFKC', text)
    
    sanitized = []
    for char in normalized:
        category = unicodedata.category(char)
        
        # 2. Invisible/Control Stripping
        # Keep: Ll, Lu, Nd, Po, Ps, Pe, Zs (Spaces), Cc (only \n \r \t)
        if category in ('Cf', 'Cn', 'Co'): 
            continue # Drop formatting, private use, unassigned
        if category == 'Cc' and char not in ('\n', '\r', '\t'):
            continue # Drop non-whitespace controls

        # 3. Emoji/Symbol Tokenization
        # Replace Symbols (So) and Currency (Sc) - strictly for this high-security context
        # We allow standard ASCII symbols but catch high-range Unicode
        if category in ('So', 'Sc', 'Sk'):
            # Exception for basic ASCII punctuation/math if classified as Symbol
            if ord(char) < 128:
                sanitized.append(char)
            else:
                # E.g. 💸 -> [MONEY_WITH_WINGS]
                try:
                    name = unicodedata.name(char)
                    token_name = name.replace(' ', '_')
                    sanitized.append(f"[{token_name}]")
                except ValueError:
                    sanitized.append("[UNKNOWN_SYMBOL]")
        else:
            sanitized.append(char)
            
    return "".join(sanitized)

# Reusing simplified logic from Day 2 for consistency
def mock_mask_logic(text: str, context: str) -> str:
    # STEP 0: SANITIZE (Anti-Malice)
    clean_text = sanitize_input(text)

    masked = clean_text
    if "John Doe" in clean_text: masked = masked.replace("John Doe", "[PER_1]")
    if "Alice" in clean_text: masked = masked.replace("Alice", "[PER_2]")
    
    # Context-Specific Masking
    if "Contact" in clean_text and context == "FINANCE": 
        masked = masked.replace("Contact", "[CTX_FIN:CONTACT]")
        
    return masked

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
