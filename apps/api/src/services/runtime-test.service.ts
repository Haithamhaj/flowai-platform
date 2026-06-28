import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { WorkflowRuntime, type RuntimeInput, type RuntimeSessionState } from "@flowai/runtime-core";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";

interface SessionRecord {
  runtime: WorkflowRuntime;
  state: RuntimeSessionState;
}

@Injectable()
export class RuntimeTestService {
  private readonly sessions = new Map<string, SessionRecord>();

  start(workflow: WorkflowDefinition, sessionId?: string) {
    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      throw new BadRequestException({ message: "Invalid workflow.", validation });
    }

    const runtime = new WorkflowRuntime({ workflow });
    const output = runtime.start(sessionId);
    this.sessions.set(output.sessionId, { runtime, state: output.state });
    return output;
  }

  message(sessionId: string, input: RuntimeInput) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException({ message: `Unknown runtime test session '${sessionId}'.` });
    }

    const output = session.runtime.receive(session.state, input);
    session.state = output.state;
    return output;
  }

  trace(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException({ message: `Unknown runtime test session '${sessionId}'.` });
    }

    return {
      sessionId,
      trace: session.state.trace
    };
  }
}

