### Implementation Plan

**Phase 1: Foundational Setup**

1.  **Create AI Tools Definition File:**
    -   **Action:** Create a new file: `src/lib/ai-tools.ts`.
    -   **Purpose:** This file will define the structure of the tools (`get_detailed_schema`, `ask_clarifying_question`, etc.) that we will expose to the AI. This provides a single source of truth for our tool definitions.

2.  **Refactor the `QueryEngine`:**
    -   **Action:** Modify the existing file: `src/lib/database/query-engine.ts`.
    -   **Changes:**
        -   Remove the old `getDatabaseSchema` method.
        -   Add logic to load `worldviewmap.json` and `DB as JSON.txt` into memory when the application starts.
        -   Create the new `getDetailedSchemaFromRepository(tables)` method that will search the in-memory `DB as JSON.txt` content.

**Phase 2: Building the Orchestrator**

3.  **Create the Orchestrator Skeleton:**
    -   **Action:** Begin refactoring `src/app/api/query/route.ts`.
    -   **Changes:**
        -   The `naturalLanguageQuery` function will be cleared and replaced with the basic structure of our agentic loop.
        -   I will implement the **first prompt**, which sends the user's question along with the content of `worldviewmap.json` and the newly defined tools.

4.  **Implement Tool Handling:**
    -   **Action:** Continue modifying `src/app/api/query/route.ts`.
    -   **Changes:**
        -   Build the logic to handle the AI's response.
        -   Specifically, I will implement the handler for the `get_detailed_schema` tool call. This involves calling the new method in the `QueryEngine` and then constructing and sending the **second prompt** back to the AI with the detailed information.

**Phase 3: Completing the Loop**

5.  **Finalize the Agentic Loop:**
    -   **Action:** Complete the logic in `src/app/api/query/route.ts`.
    -   **Changes:**
        -   Add the final steps of the loop: handling the AI's response when it contains the generated SQL, executing the query, and sending the results back for the final analysis step.
        -   Implement the handlers for the remaining tools (`ask_clarifying_question`, `refine_query`).
        -   Ensure the loop terminates correctly and sends a final, user-facing answer.
