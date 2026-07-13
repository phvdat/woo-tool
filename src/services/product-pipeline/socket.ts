import { getSocket } from "@/config/socket";

const socket = getSocket();
socket.connect();

export enum PipelineStep {
  BUILD_PRODUCTS = "Building products",
  AI = "Generating AI content",
  UPLOAD_WOO = "Uploading to WooCommerce",
  COMPLETED = "Completed",
}

interface ProgressPayload {
  socketId: number;
  percent: number;
  step: PipelineStep | string;
  currentRow?: number;
  totalRows?: number;
}

export function emitPipelineProgress({
  socketId,
  percent,
  step,
  currentRow,
  totalRows,
}: ProgressPayload) {
  socket.emit("pipeline-progress", {
    socketId,
    progress: {
      percent,
      step,
      currentRow,
      totalRows,
    },
  });
}

export function emitPipelineImageFailed(
  socketId: number,
  row: number,
) {
  socket.emit("pipeline-image-failed", {
    socketId,
    row,
  });
}

export function emitPipelineError(
  socketId: number,
  error: unknown,
) {
  let message = "Unknown error";

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  socket.emit("pipeline-error", {
    socketId,
    message,
  });
}

export function emitPipelineFinished(socketId: number) {
  socket.emit("pipeline-finished", {
    socketId,
  });
}