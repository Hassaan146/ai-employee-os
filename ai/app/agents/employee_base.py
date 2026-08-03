import os
import json
from dotenv import load_dotenv

load_dotenv()


class BaseAgent:
    def __init__(self, name: str, system_prompt: str, tool_names: list[str],
                 model: str = "llama-3.3-70b-versatile"):
        """
        Args:
            name: short id for this agent, e.g. "sales".
            system_prompt: persona/instructions for this agent.
            tool_names: list of tool names (from tools.TOOLS) this agent can call.
            model: which model to use.
        """
        self.name = name
        self.system_prompt = system_prompt
        self.tool_names = tool_names
        self.model = model

    def handle(self, message: str, context: str = "") -> dict:
        """
        Handle one user message end-to-end: call the LLM, execute any
        tool calls it requests (across multiple rounds if needed),
        then return the final response.

        Args:
            message: the user's message/request.
            context: optional extra context (e.g. RAG results from Member 2).

        Returns:
            {"response": str, "tool_calls": list[dict]}
        """
        from tools import TOOLS, TOOL_SCHEMAS
        from openai import OpenAI

        client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )

        tools_schema = [TOOL_SCHEMAS[t] for t in self.tool_names if t in TOOL_SCHEMAS]

        user_content = message if not context else f"Context:\n{context}\n\nUser message:\n{message}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_content},
        ]

        tool_calls_made = []
        max_iterations = 5  # safety limit, avoids infinite tool-calling loops

        for _ in range(max_iterations):
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools_schema if tools_schema else None,
            )

            reply = response.choices[0].message

            if not reply.tool_calls:
                return {"response": reply.content, "tool_calls": tool_calls_made}

            messages.append(reply)
            for call in reply.tool_calls:
                fn_name = call.function.name
                fn_args = json.loads(call.function.arguments)
                result = TOOLS[fn_name](**fn_args)
                tool_calls_made.append({"tool": fn_name, "args": fn_args, "result": result})

                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result),
                })

        return {
            "response": "I've completed several steps but may need to continue — please ask a follow-up if needed.",
            "tool_calls": tool_calls_made,
        }