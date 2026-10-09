import type { Extraction } from "../extraction-schema";
import type { ExtractionProvider } from "./types";

/**
 * Demo-mode provider: returns a pre-written result for a bundled synthetic
 * sample. Makes no network calls. Always reported as simulated in the UI and
 * in stored metadata.
 */
export class SimulatedExtractionProvider implements ExtractionProvider {
  readonly name = "simulated" as const;
  readonly model = "simulated";
  readonly isSimulated = true;

  constructor(private readonly output: Extraction) {}

  async extract(): Promise<unknown> {
    return structuredClone(this.output);
  }
}
