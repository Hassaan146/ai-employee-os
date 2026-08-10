import re

from langchain_core.documents import Document


class TextCleaner:
    """
    Cleans raw document text before chunking.
    """

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Normalize whitespace while preserving paragraph structure.
        """

        if not text:
            return ""

        # Normalize line endings
        text = text.replace("\r\n", "\n")
        text = text.replace("\r", "\n")

        # Replace tabs with spaces
        text = text.replace("\t", " ")

        # Collapse multiple spaces
        text = re.sub(r"[ ]{2,}", " ", text)

        # Collapse excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    def clean_documents(self, documents: list[Document]) -> list[Document]:
        """
        Clean all loaded documents while preserving metadata.
        """

        cleaned_documents = []

        for document in documents:
            cleaned_documents.append(
                Document(
                    page_content=self.clean_text(document.page_content),
                    metadata=document.metadata,
                )
            )

        return cleaned_documents