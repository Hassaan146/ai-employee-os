from app.rag.embeddings import EmbeddingService
from app.rag.vectorstore import ChromaVectorStore
from app.rag.retriever import Retriever


class RAGPipeline:
    """
    Public interface for the RAG module.
    """

    def __init__(self, retriever: Retriever):
        self.retriever = retriever

    def retrieve(self, query: str) -> dict:
        """
        Retrieve relevant context for a user query.
        """
        return self.retriever.retrieve(query)


# Singleton pipeline instance
_pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    """
    Lazily initialize the RAG pipeline.
    The pipeline is created only once and reused.
    """
    global _pipeline

    if _pipeline is None:
        embedding_service = EmbeddingService()

        vectorstore = ChromaVectorStore(
            embedding_service=embedding_service
        )

        retriever = Retriever(
            vectorstore=vectorstore
        )

        _pipeline = RAGPipeline(
            retriever=retriever
        )

    return _pipeline


def retrieve(query: str) -> dict:
    """
    Public API used by the AI Router.

    Example:
        result = retrieve("What is the annual leave policy?")
    """
    return get_pipeline().retrieve(query)