/**
 * useKernel — mock implementation for the PoC frontend.
 * Simulates a Jupyter kernel without a real WebSocket connection.
 * Replace with a real WebSocket implementation when a backend is available.
 */
import { useState, useCallback, useRef } from "react";

export type KernelStatus = "idle" | "connecting" | "busy" | "error" | "disconnected";

export interface JupyterMsg {
  header: { msg_id: string; msg_type: string };
  parent_header: { msg_id?: string };
  metadata: Record<string, unknown>;
  content: Record<string, unknown>;
}

export function useKernel(_tenant: string) {
  const [status, setStatus]   = useState<KernelStatus>("disconnected");
  const [kernelId, setKernelId] = useState<string | null>(null);
  const execCountRef = useRef(0);

  const connect = useCallback((kId: string): Promise<boolean> => {
    setStatus("idle");
    setKernelId(kId);
    return Promise.resolve(true);
  }, []);

  /**
   * Simulate cell execution: emits a mock stream output after a short delay,
   * then resolves — mirroring the real Jupyter execute_request → stream → execute_reply flow.
   */
  const execute = useCallback(
    (_code: string, onOutput: (msg: JupyterMsg) => void): Promise<void> => {
      setStatus("busy");
      execCountRef.current += 1;
      const count = execCountRef.current;

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          onOutput({
            header: { msg_id: crypto.randomUUID(), msg_type: "stream" },
            parent_header: {},
            metadata: {},
            content: {
              name: "stdout",
              text: `[Mock kernel — execution ${count}] Connect a real Python kernel to see live output.\n`,
            },
          });
          setStatus("idle");
          resolve();
        }, 450);
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    setKernelId(null);
  }, []);

  return { status, kernelId, connect, execute, disconnect };
}
