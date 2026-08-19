import { FieldExplorer } from "@/components/field/field-explorer";

export const metadata = {
  title: "The Field — Northold Survey",
  description:
    "One continent, six districts, eighty-odd surveyed sites. Explore the sheet, read the assay, peg the ground.",
};

export default function UniversePage() {
  return <FieldExplorer />;
}
