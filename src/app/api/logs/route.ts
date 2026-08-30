import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

const MAX_BUFFER_SIZE = 65536; // 64 KB safeguard limit

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      };

      const sendEvent = (data: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            safeClose();
          }
        }
      };

      // Initial ping / connection message
      sendEvent(`[SYSTEM] Connected to server log stream (tail -f ${CONFIG.containerName})`);

      const proc = spawn('docker', ['logs', '-f', '--tail', '100', CONFIG.containerName]);

      let buffer = '';

      const handleData = (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');

        // Prevent memory leak if a massive chunk has no line breaks
        if (buffer.length > MAX_BUFFER_SIZE) {
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) sendEvent(line);
          }
          if (buffer.length > MAX_BUFFER_SIZE) {
            sendEvent(buffer.slice(0, MAX_BUFFER_SIZE));
            buffer = '';
          }
          return;
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            sendEvent(line);
          }
        }
      };

      proc.stdout.on('data', handleData);
      proc.stderr.on('data', handleData);

      proc.on('error', (err) => {
        sendEvent(`[SYSTEM ERROR] Failed to stream docker logs: ${err.message}`);
        safeClose();
      });

      proc.on('close', () => {
        if (buffer.trim()) {
          sendEvent(buffer);
        }
        safeClose();
      });

      // Handle client disconnect / navigation away
      request.signal.addEventListener('abort', () => {
        try {
          proc.kill('SIGTERM');
        } catch {
          // Process might already be terminated
        }
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
