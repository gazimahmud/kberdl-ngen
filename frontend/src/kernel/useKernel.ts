/**
 * useKernel — connects to the BFF WebSocket kernel proxy using native WebSocket.
 *
 * Uses the Jupyter messaging protocol directly, avoiding @jupyterlab/services
 * which constructs WS URLs as /api/kernels/{id}/channels — incompatible with
 * our BFF's tenant-scoped path /api/kernels/{tenant}/{id}/channels.
 */
import { useState, useCallback, useRef } from "react";

export type KernelStatus = "idle" | "connecting" | "busy" | "error" | "disconnected";

export interface JupyterMsg {
  header: { msg_id: string; msg_type: string };
  parent_header: { msg_id?: string };
  metadata: Record<string, unknown>;
  content: Record<string, unknown>;
}

type ExecutePending = {
  onOutput: (msg: JupyterMsg) => void;
  resolve: () => void;
};

export function useKernel(tenant: string) {
  const [status, setStatus] = useState<KernelStatus>("disconnected");
  const [kernelId, setKernelId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Pending execute requests: msg_id → callbacks
  const pendingRef = useRef<Map<string, ExecutePending>>(new Map());

  const connect = useCallback((kId: string): Promise<boolean> => {
    setStatus("connecting");
    setKernelId(kId);

    return new Promise((resolve) => {
      const token = localStorage.getItem("token") ?? "";
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${window.location.host}/api/kernels/${tenant}/${kId}/channels?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("idle");
        resolve(true);
      };

      ws.onerror = () => {
        setStatus("error");
        resolve(false);
      };

      ws.onclose = () => {
        setStatus("disconnected");
      };

      ws.onmessage = (event) => {
        try {
          const msg: JupyterMsg = JSON.parse(event.data as string);
          const msgType = msg.header.msg_type;
          const parentId = msg.parent_header?.msg_id;

          // Update kernel status from IOPub status messages
          if (msgType === "status") {
            const state = (msg.content as { execution_state: string }).execution_state;
            if (state === "idle") setStatus("idle");
            else if (state === "busy") setStatus("busy");
          }

          // Route output + reply messages to the pending execution handler
          if (parentId) {
            const pending = pendingRef.current.get(parentId);
            if (pending) {
              const outputTypes = ["stream", "display_data", "execute_result", "error"];
              if (outputTypes.includes(msgType)) {
                pending.onOutput(msg);
              } else if (msgType === "execute_reply") {
                pending.resolve();
                pendingRef.current.delete(parentId);
              }
            }
          }
        } catch {
          // ignore malformed messages
        }
      };
    });
  }, [tenant]);

  /**
   * Execute code on the connected kernel.
   * onOutput is called for every stream/display_data/execute_result/error IOPub message.
   * Returns a promise that resolves when execute_reply arrives.
   */
  const execute = useCallback(
    (code: string, onOutput: (msg: JupyterMsg) => void): Promise<void> => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error("Kernel not connected"));
      }

      const msgId = crypto.randomUUID();

      return new Promise<void>((resolve) => {
        pendingRef.current.set(msgId, { onOutput, resolve });

        const msg = {
          header: {
            msg_id: msgId,
            msg_type: "execute_request",
            username: "user",
            session: crypto.randomUUID(),
            date: new Date().toISOString(),
            version: "5.3",
          },
          parent_header: {},
          metadata: {},
          content: {
            code,
            silent: false,
            store_history: true,
            user_expressions: {},
            allow_stdin: false,
            stop_on_error: true,
          },
          channel: "shell",
        };

        ws.send(JSON.stringify(msg));
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    pendingRef.current.clear();
    setStatus("disconnected");
    setKernelId(null);
  }, []);

  return { status, kernelId, connect, execute, disconnect };
}
