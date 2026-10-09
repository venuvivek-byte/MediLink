import Header from "@/components/layout/Header";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { getPatientRepository } from "@/lib/data";
import { getPublicConfig } from "@/lib/config/env";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const documents = await (await getPatientRepository()).listDocuments();
  const { mode, maxUploadBytes } = getPublicConfig();

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Documents" subtitle="Prescriptions, lab reports and other records you have added" />
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <DocumentsView documents={documents} mode={mode} maxUploadBytes={maxUploadBytes} />
      </div>
    </div>
  );
}
