# app/core/ws_manager.py
"""
WebSocket Connection Manager.
Handles active WebSocket connections per company (tenant) so that
real-time alerts (like incoming WhatsApp messages and AI execution progress)
can be pushed to connected frontend clients.
"""

from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        # company_id -> list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, company_id: str):
        await websocket.accept()
        if company_id not in self.active_connections:
            self.active_connections[company_id] = []
        self.active_connections[company_id].append(websocket)

    def disconnect(self, websocket: WebSocket, company_id: str):
        if company_id in self.active_connections:
            if websocket in self.active_connections[company_id]:
                self.active_connections[company_id].remove(websocket)
            if not self.active_connections[company_id]:
                del self.active_connections[company_id]

    async def send_to_company(self, company_id: str, message: dict):
        """Send a JSON message to all connections belonging to a company."""
        if company_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[company_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(connection)
            # cleanup dead connections
            for dead in dead_connections:
                self.active_connections[company_id].remove(dead)

    async def broadcast_to_company(self, company_id: str, message: dict):
        """Alias for send_to_company for multi-tenant broadcasts."""
        await self.send_to_company(company_id, message)


# Shared instance exports across the app
manager = ConnectionManager()
ws_manager = manager