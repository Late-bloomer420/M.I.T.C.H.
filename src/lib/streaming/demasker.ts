import { IdentityVault } from '../pii/mapper';

export class StreamDemasker {
    private buffer: string = '';
    private readonly MAX_BUFFER_SIZE = 32;

    /**
     * Processes a chunk of text from the external AI stream.
     * Returns the "safe to display" text (identifiers replaced with real names).
     */
    async processChunk(chunk: string): Promise<string> {
        this.buffer += chunk;
        let output = '';

        while (this.buffer.length > 0) {
            // 1. Look for token start '['
            const startIndex = this.buffer.indexOf('[');

            if (startIndex === -1) {
                // No token start found, flush everything safely
                output += this.buffer;
                this.buffer = '';
                break;
            }

            // Flush text before the token start
            if (startIndex > 0) {
                output += this.buffer.substring(0, startIndex);
                this.buffer = this.buffer.substring(startIndex);
            }

            // 2. Look for token end ']'
            const endIndex = this.buffer.indexOf(']');

            if (endIndex !== -1) {
                // Full token found: [TOKEN_ID]
                const token = this.buffer.substring(0, endIndex + 1); // e.g., "[PER_1]"
                const remainder = this.buffer.substring(endIndex + 1);

                // De-anonymize
                // Note: For streaming speed, ideally we use an in-memory cache here, 
                // but calling the DB for MVP is fine or a cached lookup.
                // We strip the brackets for lookup if needed, depending on how it's stored.
                // Our storage uses the full token `[PER_a1b2]`.

                const realName = await IdentityVault.deanonymize(token);
                output += (realName || token); // Replace or keep if unknown

                this.buffer = remainder;
                continue; // Loop to check for more tokens in the buffer
            } else {
                // Partial token found (e.g., "[PER_"). 
                // Wait for more chunks unless buffer is too full.
                if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
                    // Buffer full, likely not a token (false positive or too long). 
                    // Flush the first character and retry scan.
                    output += this.buffer[0];
                    this.buffer = this.buffer.substring(1);
                }
                break; // Stop processing, wait for next chunk
            }
        }

        return output;
    }

    /**
     * Call this when the stream ends to flush any remaining buffer.
     */
    flush(): string {
        const final = this.buffer;
        this.buffer = '';
        return final;
    }
}
