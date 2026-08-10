from app.rag.vectorstore import ChromaVectorStore


class Retriever:
    """
    Retrieves relevant document chunks from the vector store.
    """

    def __init__(self, vectorstore: ChromaVectorStore):
        self.vectorstore = vectorstore

    def retrieve(self, query: str) -> dict:
        """
        Retrieve relevant context for a query.
        """

        documents = self.vectorstore.similarity_search(query)

        context = "\n\n".join(
            doc.page_content
            for doc in documents
        )

        sources = []

        for doc in documents:

            sources.append(
                {
                    "source": doc.metadata.get("source"),
                    "page": doc.metadata.get("page"),
                    "chunk_id": doc.metadata.get("chunk_id"),
                }
            )

        return {
            "context": context,
            "sources": sources,
        }