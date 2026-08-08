from pathlib import Path
import logging

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
)

from app.config import settings


logger = logging.getLogger(__name__)


class DocumentLoader:
    """
    Loads supported documents from the configured documents folder.
    """

    SUPPORTED_EXTENSIONS = {
        ".pdf": PyPDFLoader,
        ".docx": Docx2txtLoader,
        ".txt": TextLoader,
    }

    def __init__(self):
        self.documents_path = Path(settings.documents_path)

    def load_all(self) -> list[Document]:
        documents: list[Document] = []

        if not self.documents_path.exists():
            raise FileNotFoundError(
                f"Documents folder not found: {self.documents_path}"
            )

        for file_path in self.documents_path.iterdir():

            if not file_path.is_file():
                continue

            loader_class = self.SUPPORTED_EXTENSIONS.get(file_path.suffix.lower())

            if loader_class is None:
                logger.warning(
                    "Skipping unsupported file: %s",
                    file_path.name,
                )
                continue

            try:
                loader = loader_class(str(file_path))

                loaded_docs = loader.load()

                documents.extend(loaded_docs)

                logger.info(
                    "Loaded %s (%s pages/chunks)",
                    file_path.name,
                    len(loaded_docs),
                )

            except Exception as e:
                logger.exception(
                    "Failed loading %s: %s",
                    file_path.name,
                    e,
                )

        logger.info("Total loaded documents: %s", len(documents))

        return documents