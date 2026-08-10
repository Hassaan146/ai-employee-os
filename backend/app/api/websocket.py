# app/api/websocket.py
"""
WebSocket endpoint for real-time alerts.
Frontend clients connect here (per company) to receive live updates,
such as incoming WhatsApp messages.

Once Member 1 builds the central /api/v1/ws/notifications endpoint,
this can be merged into that — same ConnectionManager is reused.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.ws_manager import manager

router = APIRouter(prefix="/api/v1/ws", tags=["WebSockets"])


@router.websocket("/whatsapp/{company_id}")
async def whatsapp_ws_endpoint(websocket: WebSocket, company_id: str):
    """
    Frontend connects here to receive real-time WhatsApp message alerts
    for their company.
    """
    await manager.connect(websocket, company_id)
    try:
        while True:
            # Keep connection alive; we don't expect messages from client,
            # but we listen in case of ping/pong or future commands.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, company_id)
        