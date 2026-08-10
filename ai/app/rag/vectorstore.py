from langchain_chroma import Chroma

from app.config import settings
from app.rag.embeddings import EmbeddingService


class ChromaVectorStore:
    """
    Handles all interactions with ChromaDB.
    """

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

        self.db = Chroma(
            collection_name=settings.collection_name,
            embedding_function=self.embedding_service.get_embedding(),
            persist_directory=settings.vector_db_path,
        )

    def add_documents(self, documents):
        """
        Store documents in the vector database.
        """
        self.db.add_documents(documents)

    def similarity_search(
        self,
        query: str,
        k: int = None,
    ):
        """
        Perform semantic search.
        """
        return self.db.similarity_search(
            query=query,
            k=k or settings.top_k,
        )

    def delete_collection(self):
        """
        Delete all stored vectors.
        """
        self.db.delete_collection()

    def get_vectorstore(self):
        return self.db