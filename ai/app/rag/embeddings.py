from langchain_huggingface import HuggingFaceEmbeddings

from app.config import settings


class EmbeddingService:
    """
    Service responsible for generating embeddings.
    """

    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={
                "device": "cpu"
            },
            encode_kwargs={
                "normalize_embeddings": True
            }
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple documents.
        """
        return self.embeddings.embed_documents(texts)

    def embed_query(self, query: str) -> list[float]:
        """
        Generate embedding for a query.
        """
        return self.embeddings.embed_query(query)

    def get_embedding(self):
        """
        Return the embedding model instance.
        """
        return self.embeddings