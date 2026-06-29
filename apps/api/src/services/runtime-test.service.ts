import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { WorkflowRuntime, type RuntimeOutput, type RuntimeSessionState } from "@flowai/runtime-core";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";

interface SessionRecord {
  runtime: WorkflowRuntime;
  state: RuntimeSessionState;
}

export interface RuntimeMessageRequest {
  message: string;
}

@Injectable()
export class RuntimeTestService {
  private readonly maxSessions = 100;
  private readonly sessions = new Map<string, SessionRecord>();

  start(workflow: WorkflowDefinition, sessionId?: string) {
    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_WORKFLOW", "Workflow is invalid.", { issues: validation.issues });
    }

    const runtime = new WorkflowRuntime({ workflow });
    const output = runtime.start(sessionId);
    this.pruneOldestSessionIfNeeded();
    this.sessions.set(output.sessionId, { runtime, state: output.state });
    return this.toRuntimeTestResponse(output);
  }

  message(sessionId: string, request: RuntimeMessageRequest) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_SESSION", "Runtime test session was not found.", { sessionId });
    }

    if (!request || typeof request.message !== "string") {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Message body must include a string 'message' field.");
    }

    if (request.message.trim() === "") {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Message must not be empty.");
    }

    if (session.state.ended) {
      throwApiError(HttpStatus.CONFLICT, "SESSION_ENDED", "Runtime test session has ended.", { sessionId });
    }

    const output = session.runtime.receive(session.state, { text: request.message });
    session.state = output.state;
    return this.toRuntimeTestResponse(output);
  }

  trace(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_SESSION", "Runtime test session was not found.", { sessionId });
    }

    return {
      sessionId,
      workflowId: session.state.workflowId,
      trace: session.state.trace
    };
  }

  reset(sessionId: string) {
    if (!this.sessions.has(sessionId)) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_SESSION", "Runtime test session was not found.", { sessionId });
    }

    this.sessions.delete(sessionId);
    return {
      status: "reset",
      sessionId
    };
  }

  private toRuntimeTestResponse(output: RuntimeOutput) {
    return {
      sessionId: output.sessionId,
      output: {
        messages: output.messages
      },
      stateSummary: {
        workflowId: output.state.workflowId,
        currentNodeId: output.state.currentNodeId,
        ended: output.state.ended,
        awaitingInput: output.state.awaitingInput,
        variables: output.state.variables,
        collectedFields: output.state.collectedFields
      },
      traceDelta: output.traceEvents
    };
  }

  private pruneOldestSessionIfNeeded() {
    if (this.sessions.size < this.maxSessions) return;
    const oldestSessionId = this.sessions.keys().next().value as string | undefined;
    if (oldestSessionId) this.sessions.delete(oldestSessionId);
  }
}

function throwApiError(status: HttpStatus, code: string, message: string, details?: Record<string, unknown>): never {
  throw new HttpException(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    status
  );
}
