import { describe, expect, it } from "vitest";
import { runExtraction } from "@/lib/ai";
import { SimulatedExtractionProvider } from "@/lib/ai/providers/simulated";
import { DEMO_SAMPLES, getDemoSample } from "@/lib/demo/samples";

const run = async (id: string) => {
  const sample = getDemoSample(id)!;
  return runExtraction(new SimulatedExtractionProvider(sample.simulatedOutput), sample.pages);
};

describe("demo samples", () => {
  it("every sample passes the real extraction schema", async () => {
    for (const sample of DEMO_SAMPLES) {
      await expect(run(sample.id), sample.id).resolves.toMatchObject({ isSimulated: true, provider: "simulated" });
    }
  });

  it("prescription sample: flags the ambiguous date and the uncertain abbreviation, nothing else", async () => {
    const { verified } = await run("care-clinic-rx");
    expect(verified.ambiguousDates).toEqual(["document_date"]);
    const flags = Object.fromEntries(verified.medications.map((m) => [m.item.name, m.flags]));
    expect(flags).toEqual({ "Tab Glimepiride": [], "Tab Metformin": [], "Tab Vit D3": ["model_uncertain"] });
  });

  it("lab sample: the planted TSH mis-read (4.2 vs 2.4 in the source) is caught by evidence checking", async () => {
    const { verified } = await run("lab-panel");
    const tsh = verified.lab_results.find((l) => l.item.test_name === "TSH")!;
    expect(tsh.flags).toContain("value_not_found");
    expect(verified.lab_results.filter((l) => l.flags.length > 0)).toHaveLength(1);
  });
});
