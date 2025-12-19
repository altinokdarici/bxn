import { handle, stream, StatusCode } from '@buildxn/http';

export default handle({
  handler: () => {
    // Simulate generating file content in chunks
    const encoder = new TextEncoder();
    let chunkIndex = 0;
    const chunks = [
      'Line 1: This is the beginning of the file.\n',
      'Line 2: Some more content here.\n',
      'Line 3: Generated dynamically.\n',
      'Line 4: No actual file on disk.\n',
      'Line 5: End of file.\n',
    ];

    const readable = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunkIndex < chunks.length) {
          controller.enqueue(encoder.encode(chunks[chunkIndex]));
          chunkIndex++;
        } else {
          controller.close();
        }
      },
    });

    return stream(readable, StatusCode.Ok, {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="generated-file.txt"',
    });
  },
});
